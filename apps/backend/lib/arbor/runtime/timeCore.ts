export type ArborTimeCore = {
  source: "trusted-host-clock";
  authoritative: true;
  isoNow: string;
  unixMs: number;
  utcDate: string;
  timeZone: string;
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
} = {}): ArborTimeCore {
  const now = input.now ?? new Date();
  const timeZone = safeTimeZone(input.timeZone);
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
  const localDate = `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
  const localTime = `${byType.get("hour")}:${byType.get("minute")}:${byType.get("second")}`;

  return {
    source: "trusted-host-clock",
    authoritative: true,
    isoNow: now.toISOString(),
    unixMs: now.getTime(),
    utcDate: now.toISOString().slice(0, 10),
    timeZone,
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
    `local_date=${core.localDate}`,
    `local_time=${core.localTime}`,
    "Use this host-supplied instant for current-date/time and duration reasoning. Do not infer 'now' from model training data, retrieved history, or message wording.",
  ].join("\n");
}
