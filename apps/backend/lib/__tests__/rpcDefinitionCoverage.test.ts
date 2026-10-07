import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type RpcCall = {
  name: string;
  caller: string;
  argumentKeys: string[] | null;
};

type SqlDefinition = {
  name: string;
  path: string;
  parameterNames: string[];
};

const ROOT = path.resolve(process.cwd(), "../..");

const DORMANT_SOURCE_ONLY_CALLERS = new Set([
  "apps/backend/lib/research/supabaseInvestigationIntegrityStore.ts",
  "apps/backend/lib/research/supabaseInvestigationObservationStore.ts",
  "apps/backend/lib/research/researchReinsArkHost.ts",
]);

function walk(dir: string, accept: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "build", ".dart_tool", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, accept));
    else if (accept(full)) out.push(full);
  }
  return out;
}

function sourceFiles(): string[] {
  return walk(path.join(ROOT, "apps/backend"), (file) => {
    if (!/.(?:ts|tsx)$/.test(file)) return false;
    if (/.(?:test|spec).(?:ts|tsx)$/.test(file)) return false;
    if (file.includes(`${path.sep}__tests__${path.sep}`)) return false;
    return true;
  });
}

function sqlFiles(): string[] {
  return [
    ...walk(path.join(ROOT, "supabase"), (file) => file.endsWith(".sql")),
    ...walk(path.join(ROOT, "docs"), (file) => file.endsWith(".sql")),
    ...walk(path.join(ROOT, "ops"), (file) => file.endsWith(".sql")),
  ];
}

function stringLiterals(node: ts.Node): string[] {
  const out: string[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
      if (/^[a-zA-Z0-9_]+$/.test(child.text)) out.push(child.text);
    }
    child.forEachChild(visit);
  };
  visit(node);
  return [...new Set(out)];
}

function objectLiteralKeys(node: ts.Expression | undefined): string[] | null {
  if (!node || !ts.isObjectLiteralExpression(node)) return null;
  const keys: string[] = [];
  for (const prop of node.properties) {
    if (ts.isSpreadAssignment(prop)) return null;
    if (
      ts.isPropertyAssignment(prop) ||
      ts.isShorthandPropertyAssignment(prop) ||
      ts.isMethodDeclaration(prop)
    ) {
      const name = prop.name;
      if (!name) return null;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.push(name.text);
      else return null;
      continue;
    }
    return null;
  }
  return [...new Set(keys)].sort();
}

function collectRpcCalls(): RpcCall[] {
  const calls: RpcCall[] = [];
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "rpc" &&
        node.arguments.length >= 1
      ) {
        const names = stringLiterals(node.arguments[0]);
        const argumentKeys = objectLiteralKeys(node.arguments[1]);
        for (const name of names) {
          calls.push({
            name,
            caller: path.relative(ROOT, file).split(path.sep).join("/"),
            argumentKeys,
          });
        }
      }
      node.forEachChild(visit);
    };
    visit(source);
  }
  return calls;
}

function collectSqlDefinitions(): SqlDefinition[] {
  const defs: SqlDefinition[] = [];
  const re =
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:returns|language)/gi;

  for (const file of sqlFiles()) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(re)) {
      const params = match[2] ?? "";
      const parameterNames = [
        ...params.matchAll(/\b(p_[a-zA-Z0-9_]+)\b\s+[a-zA-Z]/g),
      ].map((item) => item[1]).sort();
      defs.push({
        name: match[1],
        path: path.relative(ROOT, file).split(path.sep).join("/"),
        parameterNames: [...new Set(parameterNames)],
      });
    }
  }
  return defs;
}

function isReferencedByAnotherRuntimeSource(caller: string): boolean {
  const stem = path.basename(caller).replace(/\.(?:ts|tsx)$/, "");
  for (const file of sourceFiles()) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (rel === caller) continue;
    const text = fs.readFileSync(file, "utf8");
    if (
      text.includes(`from "./${stem}"`) ||
      text.includes(`from "../${stem}"`) ||
      text.includes(`/${stem}"`) ||
      text.includes(`/${stem}'`)
    ) {
      return true;
    }
  }
  return false;
}

describe("runtime RPC definition coverage", () => {
  it("has a source-controlled SQL definition compatible with every active literal runtime RPC call", () => {
    const calls = collectRpcCalls();
    const defs = collectSqlDefinitions();

    expect(calls.length).toBeGreaterThan(0);
    expect(defs.length).toBeGreaterThan(0);

    const failures: string[] = [];

    for (const call of calls) {
      const matching = defs.filter((def) => def.name === call.name);
      if (!matching.length) {
        if (DORMANT_SOURCE_ONLY_CALLERS.has(call.caller)) {
          if (isReferencedByAnotherRuntimeSource(call.caller)) {
            failures.push(
              `dormant RPC caller became runtime-referenced without SQL: ${call.name} <- ${call.caller}`,
            );
          }
          continue;
        }
        failures.push(
          `missing SQL definition: ${call.name} <- ${call.caller}`,
        );
        continue;
      }

      if (call.argumentKeys) {
        const compatible = matching.some((def) =>
          call.argumentKeys!.every((key) => def.parameterNames.includes(key)),
        );
        if (!compatible) {
          failures.push(
            [
              `RPC parameter mismatch: ${call.name} <- ${call.caller}`,
              `caller keys=[${call.argumentKeys.join(",")}]`,
              "definitions=" +
                matching
                  .map(
                    (def) =>
                      `${def.path}:[${def.parameterNames.join(",")}]`,
                  )
                  .join(" | "),
            ].join(" "),
          );
        }
      }
    }

    expect(
      [...new Set(failures)].sort(),
      "Every active literal Supabase RPC must have a compatible source-controlled SQL definition.",
    ).toEqual([]);
  });

  it("keeps source-only research RPC adapters dormant until their SQL contracts exist", () => {
    for (const caller of DORMANT_SOURCE_ONLY_CALLERS) {
      expect(
        isReferencedByAnotherRuntimeSource(caller),
        caller + " must remain unreferenced until its SQL contract is source-controlled",
      ).toBe(false);
    }
  });
});
