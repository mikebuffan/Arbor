#!/usr/bin/env python3
"""Build a provenance-preserving SQLite/FTS5 index from ChatGPT conversations-*.json exports.

This is analysis tooling. It does not modify Arbor runtime behavior, prompts, or architecture.
It preserves conversation IDs, message IDs, timestamps, roles, model metadata, parent/child
branch edges, source filenames, and searchable text for longitudinal archaeology.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE conversations(
  conversation_id TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  title TEXT,
  create_time REAL,
  update_time REAL,
  current_node TEXT,
  default_model_slug TEXT,
  is_archived INTEGER,
  is_starred INTEGER,
  raw_index INTEGER
);
CREATE TABLE messages(
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  source_file TEXT NOT NULL,
  node_id TEXT NOT NULL,
  parent_node_id TEXT,
  role TEXT,
  author_name TEXT,
  create_time REAL,
  content_type TEXT,
  model_slug TEXT,
  text TEXT,
  metadata_json TEXT
);
CREATE TABLE message_edges(
  conversation_id TEXT NOT NULL,
  parent_node_id TEXT,
  child_node_id TEXT NOT NULL,
  PRIMARY KEY(conversation_id,parent_node_id,child_node_id)
);
CREATE INDEX idx_messages_conv_time ON messages(conversation_id, create_time);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_parent ON messages(parent_node_id);
CREATE INDEX idx_conversations_time ON conversations(create_time);
CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id UNINDEXED,
  conversation_id UNINDEXED,
  role UNINDEXED,
  text,
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TABLE build_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def text_from_content(content: object) -> str:
    if not isinstance(content, dict):
        return ""
    out: list[str] = []
    parts = content.get("parts")
    if isinstance(parts, list):
        for part in parts:
            if isinstance(part, str):
                out.append(part)
            elif isinstance(part, dict):
                for key in ("text", "content", "caption", "title"):
                    value = part.get(key)
                    if isinstance(value, str):
                        out.append(value)
    for key in ("text", "content"):
        value = content.get(key)
        if isinstance(value, str) and value not in out:
            out.append(value)
    return "\n".join(x for x in out if x).strip()


def build(input_dir: Path, output_db: Path) -> dict[str, object]:
    sources = sorted(glob.glob(str(input_dir / "conversations-*.json")))
    if not sources:
        raise SystemExit(f"No conversations-*.json files found in {input_dir}")
    if output_db.exists():
        output_db.unlink()

    db = sqlite3.connect(output_db)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.execute("PRAGMA temp_store=MEMORY")
    db.executescript(SCHEMA)

    stats: dict[str, object] = {
        "source_files": [],
        "conversations": 0,
        "messages": 0,
        "text_messages": 0,
        "roles": {},
        "content_types": {},
    }

    for path in sources:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        source_name = os.path.basename(path)
        source_conversations = 0
        source_messages = 0

        for raw_index, conversation in enumerate(payload):
            if not isinstance(conversation, dict):
                continue
            conversation_id = str(
                conversation.get("conversation_id")
                or conversation.get("id")
                or f"{source_name}:{raw_index}"
            )
            db.execute(
                "INSERT OR REPLACE INTO conversations VALUES(?,?,?,?,?,?,?,?,?,?)",
                (
                    conversation_id,
                    source_name,
                    conversation.get("title"),
                    conversation.get("create_time"),
                    conversation.get("update_time"),
                    conversation.get("current_node"),
                    conversation.get("default_model_slug"),
                    int(bool(conversation.get("is_archived"))),
                    int(bool(conversation.get("is_starred"))),
                    raw_index,
                ),
            )
            source_conversations += 1

            mapping = conversation.get("mapping") or {}
            if not isinstance(mapping, dict):
                continue
            for node_id, node in mapping.items():
                if not isinstance(node, dict):
                    continue
                parent = node.get("parent")
                db.execute(
                    "INSERT OR IGNORE INTO message_edges VALUES(?,?,?)",
                    (conversation_id, parent, node_id),
                )
                message = node.get("message")
                if not isinstance(message, dict):
                    continue

                author = message.get("author") or {}
                content = message.get("content") or {}
                metadata = message.get("metadata") or {}
                message_id = str(message.get("id") or node_id)
                role = author.get("role") if isinstance(author, dict) else None
                author_name = author.get("name") if isinstance(author, dict) else None
                content_type = content.get("content_type") if isinstance(content, dict) else None
                model_slug = metadata.get("model_slug") if isinstance(metadata, dict) else None
                text = text_from_content(content)

                db.execute(
                    "INSERT OR REPLACE INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        message_id,
                        conversation_id,
                        source_name,
                        node_id,
                        parent,
                        role,
                        author_name,
                        message.get("create_time"),
                        content_type,
                        model_slug,
                        text,
                        json.dumps(metadata, separators=(",", ":"), ensure_ascii=False),
                    ),
                )
                if text:
                    db.execute(
                        "INSERT INTO messages_fts(message_id,conversation_id,role,text) VALUES(?,?,?,?)",
                        (message_id, conversation_id, role, text),
                    )
                    stats["text_messages"] = int(stats["text_messages"]) + 1
                source_messages += 1
                roles = stats["roles"]
                content_types = stats["content_types"]
                assert isinstance(roles, dict) and isinstance(content_types, dict)
                roles[str(role)] = roles.get(str(role), 0) + 1
                content_types[str(content_type)] = content_types.get(str(content_type), 0) + 1

        db.commit()
        source_rows = stats["source_files"]
        assert isinstance(source_rows, list)
        source_rows.append(
            {
                "file": source_name,
                "bytes": os.path.getsize(path),
                "conversations": source_conversations,
                "messages": source_messages,
            }
        )
        stats["conversations"] = int(stats["conversations"]) + source_conversations
        stats["messages"] = int(stats["messages"]) + source_messages

    db.execute("INSERT INTO build_meta VALUES(?,?)", ("schema_version", "1"))
    db.execute("INSERT INTO build_meta VALUES(?,?)", ("built_at", str(time.time())))
    db.execute("INSERT INTO build_meta VALUES(?,?)", ("non_mutation_subject", "true"))
    db.commit()
    stats["database_bytes"] = output_db.stat().st_size
    db.close()
    return stats


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("--output", type=Path, default=Path("arbor_history_archaeology.sqlite"))
    parser.add_argument("--report", type=Path, default=Path("arbor_history_index_report.json"))
    args = parser.parse_args()
    stats = build(args.input_dir, args.output)
    args.report.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
