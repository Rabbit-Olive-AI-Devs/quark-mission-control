const CHICAGO_TIME_ZONE = "America/Chicago";

export interface ParseError {
  source: string;
  line: number;
  message: string;
  raw?: string;
}

export interface JsonlParseResult<T> {
  records: T[];
  errors: ParseError[];
}

export function toChicagoDayKey(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`);
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function parseJsonl<T>(
  content: string,
  source: string,
  mapRecord: (value: unknown, line: number) => T
): JsonlParseResult<T> {
  const records: T[] = [];
  const errors: ParseError[] = [];

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      records.push(mapRecord(parsed, lineNumber));
    } catch (error) {
      errors.push({
        source,
        line: lineNumber,
        message: error instanceof Error ? error.message : "Unknown JSONL parse error",
        raw: trimmed,
      });
    }
  });

  return { records, errors };
}

export function numberOrDefault(value: unknown, defaultValue = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = numberOrDefault(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function mustString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  throw new Error(`Missing required string field: ${field}`);
}

export function isLateArrival(eventTimestamp: string, recordTimestamp?: string): boolean {
  if (!recordTimestamp) {
    return false;
  }

  return toChicagoDayKey(recordTimestamp) > toChicagoDayKey(eventTimestamp);
}

export function extractFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("Missing frontmatter block");
  }

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const idx = line.indexOf(":");
      if (idx === -1) {
        return acc;
      }
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}
