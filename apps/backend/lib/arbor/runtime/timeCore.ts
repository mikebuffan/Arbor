export type ArborTimeCore = {
  source: "trusted-host-clock";
  authoritative: true;
  isoNow: string;
  unixMs: number;
  utcDate: string;
  timeZone: string;
  utcOffsetMinutes: number | null;
  localDate: string;
  localTime: string;
};

function safeTimeZone(value?: string | null): string {
  const candidate = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return "UTC";
  }
}

export function buildTimeCore(input: {
  now?: Date;
  timeZone?: string | null;
  utcOffsetMinutes?: number | null;
} = {}): ArborTimeCore {
  const now = input.now ?? new Date();
  const offset =
    Number.isInteger(input.utcOffsetMinutes) &&
    Math.abs(input.utcOffsetMinutes ?? 0) <= 14 * 60
      ? input.utcOffsetMinutes ?? null
      : null;
  const timeZone = input.timeZone?.trim()
    ? safeTimeZone(input.timeZone)
    : offset === null
      ? "UTC"
      : `UTC${offset >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;

  let localDate: string;
  let localTime: string;

  if (input.timeZone?.trim()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const byType = new Map(parts.map((part) => [part.type, part.value]));
    localDate = `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
    localTime = `${byType.get("hour")}:${byType.get("minute")}:${byType.get("second")}`;
  } else {
    const shifted = new Date(now.getTime() + (offset ?? 0) * 60_000);
    localDate = shifted.toISOString().slice(0, 10);
    localTime = shifted.toISOString().slice(11, 19);
  }

  return {
    source: "trusted-host-clock",
    authoritative: true,
    isoNow: now.toISOString(),
    unixMs: now.getTime(),
    utcDate: now.toISOString().slice(0, 10),
    timeZone,
    utcOffsetMinutes: offset,
    localDate,
    localTime,
  };
}

export function renderTimeCorePromptBlock(core: ArborTimeCore): string {
  return [
    "ARBOR TIME CORE — AUTHORITATIVE HOST TIME",
    `source=${core.source}`,
    `iso_now=${core.isoNow}`,
    `unix_ms=${core.unixMs}`,
    `utc_date=${core.utcDate}`,
    `time_zone=${core.timeZone}`,
    `utc_offset_minutes=${core.utcOffsetMinutes ?? 0}`,
    `local_date=${core.localDate}`,
    `local_time=${core.localTime}`,
    "Use this host-supplied instant for current-date/time and duration reasoning. Do not infer 'now' from model training data, retrieved history, or message wording.",
  ].join("\n");
}
