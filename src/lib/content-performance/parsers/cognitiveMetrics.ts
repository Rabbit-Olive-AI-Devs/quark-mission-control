import { mustString, numberOrDefault, toChicagoDayKey } from "@/lib/content-performance/parsers/shared";

export interface ParsedCognitiveMetricRecord {
  signalDate: string;
  dayKey: string;
  cognitiveScore: number;
  degradationDetected: boolean;
  trigger?: string;
}

export function parseCognitiveMetricsJson(content: string, source: string) {
  try {
    const parsed = JSON.parse(content) as unknown;
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    const records: ParsedCognitiveMetricRecord[] = entries.map((item) => {
      const row = item as Record<string, unknown>;
      const signalDate = mustString(row.signalDate, "signalDate");

      return {
        signalDate,
        dayKey: toChicagoDayKey(signalDate),
        cognitiveScore: numberOrDefault(row.cognitiveScore, 0),
        degradationDetected: Boolean(row.degradationDetected),
        trigger: typeof row.trigger === "string" ? row.trigger : undefined,
      };
    });

    return { records, errors: [] as { source: string; line: number; message: string; raw?: string }[] };
  } catch (error) {
    return {
      records: [] as ParsedCognitiveMetricRecord[],
      errors: [
        {
          source,
          line: 1,
          message: error instanceof Error ? error.message : "Cognitive metrics parse error",
        },
      ],
    };
  }
}
