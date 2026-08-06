export type TrendDirection =
  | "improving"
  | "stable"
  | "declining"
  | "unknown";

export type HealthRecord = {
  healthScore: number;
  recordedAt: string;
};

export type TrendAnalysis = {
  direction: TrendDirection;
  currentScore: number;
  previousScore: number | null;
  change: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  confidence: number;
  summary: string;
};

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

function validRecords(
  records: HealthRecord[],
): HealthRecord[] {
  return records
    .filter(
      (record) =>
        Number.isFinite(
          record.healthScore,
        ) &&
        !Number.isNaN(
          new Date(
            record.recordedAt,
          ).getTime(),
        ),
    )
    .map(
      (record) => ({
        healthScore:
          clampScore(
            record.healthScore,
          ),

        recordedAt:
          record.recordedAt,
      }),
    )
    .sort(
      (
        first,
        second,
      ) =>
        new Date(
          second.recordedAt,
        ).getTime() -
        new Date(
          first.recordedAt,
        ).getTime(),
    );
}

function directionFromChange(
  change: number,
  recordCount: number,
): TrendDirection {
  if (
    recordCount < 2
  ) {
    return "unknown";
  }

  if (
    change >= 3
  ) {
    return "improving";
  }

  if (
    change <= -3
  ) {
    return "declining";
  }

  return "stable";
}

function buildSummary(
  direction: TrendDirection,
  currentScore: number,
  change: number,
): string {
  if (
    direction === "improving"
  ) {
    return `Health improved by ${change} point${
      change === 1
        ? ""
        : "s"
    } to ${currentScore}.`;
  }

  if (
    direction === "declining"
  ) {
    return `Health declined by ${Math.abs(
      change,
    )} point${
      Math.abs(change) === 1
        ? ""
        : "s"
    } to ${currentScore}.`;
  }

  if (
    direction === "stable"
  ) {
    return `Health is stable at ${currentScore}.`;
  }

  return `Current health is ${currentScore}, but more history is needed to identify a trend.`;
}

export class TrendAnalyzer {
  analyze(
    records: HealthRecord[],
  ): TrendAnalysis {
    const cleanedRecords =
      validRecords(
        records,
      );

    if (
      cleanedRecords.length === 0
    ) {
      return {
        direction:
          "unknown",

        currentScore:
          0,

        previousScore:
          null,

        change:
          0,

        averageScore:
          0,

        highestScore:
          0,

        lowestScore:
          0,

        confidence:
          0,

        summary:
          "No valid health history is available.",
      };
    }

    const currentScore =
      cleanedRecords[0]
        .healthScore;

    const previousScore =
      cleanedRecords[1]
        ?.healthScore ??
      null;

    const change =
      previousScore === null
        ? 0
        : currentScore -
          previousScore;

    const direction =
      directionFromChange(
        change,
        cleanedRecords.length,
      );

    const scores =
      cleanedRecords.map(
        (record) =>
          record.healthScore,
      );

    const averageScore =
      clampScore(
        scores.reduce(
          (
            total,
            score,
          ) =>
            total + score,
          0,
        ) /
          scores.length,
      );

    const highestScore =
      Math.max(
        ...scores,
      );

    const lowestScore =
      Math.min(
        ...scores,
      );

    const confidence =
      clampScore(
        Math.min(
          95,
          40 +
            cleanedRecords.length *
              10,
        ),
      );

    return {
      direction,

      currentScore,

      previousScore,

      change,

      averageScore,

      highestScore,

      lowestScore,

      confidence,

      summary:
        buildSummary(
          direction,
          currentScore,
          change,
        ),
    };
  }

  compare(
    currentScore: number,
    previousScore:
      | number
      | null,
  ): TrendAnalysis {
    const now =
      new Date();

    const records:
      HealthRecord[] = [
        {
          healthScore:
            currentScore,

          recordedAt:
            now.toISOString(),
        },
      ];

    if (
      previousScore !== null
    ) {
      records.push({
        healthScore:
          previousScore,

        recordedAt:
          new Date(
            now.getTime() -
              60_000,
          ).toISOString(),
      });
    }

    return this.analyze(
      records,
    );
  }
}

export const trendAnalyzer =
  new TrendAnalyzer();