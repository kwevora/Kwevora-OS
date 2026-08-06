import type {
  DepartmentReport,
  DepartmentPriority,
} from "./Department";

import type {
  DecisionResponse,
} from "./DecisionCore";

import type {
  ActiveWork,
} from "./MemoryBrain";

export type ExecutiveAgendaItem = {
  id: string;
  title: string;
  question: string;
  answer: string;
  priority: number;
};

export type ExecutivePriority = {
  id: string;
  title: string;
  reason: string;
  urgency: number;
  ownerRequired: boolean;
};

export type ExecutiveReview = {
  reviewedAt: string;

  summary: string;

  agenda: ExecutiveAgendaItem[];

  priorities: ExecutivePriority[];

  ownerTasks: ExecutivePriority[];

  kaiTasks: ExecutivePriority[];

  departments: DepartmentReport[];

  biggestRisk: string;

  biggestOpportunity: string;

  confidence: number;
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

function cleanValues(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function departmentPriorityToExecutive(
  department: DepartmentReport,
  priority: DepartmentPriority,
): ExecutivePriority {
  return {
    id:
      `${department.department}-${priority.id}`,

    title:
      `${department.department}: ${priority.title}`,

    reason:
      priority.reason,

    urgency:
      clampScore(
        Math.round(
          priority.urgency * 0.55 +
          priority.impact * 0.3 +
          priority.confidence * 0.15,
        ),
      ),

    ownerRequired:
      priority.owner === "Owner" ||
      priority.owner === "Shared",
  };
}

function buildPriorities(
  decision: DecisionResponse,
  departments: DepartmentReport[],
): ExecutivePriority[] {
  const decisionPriorities =
    decision.decision.opportunities.map(
      (opportunity) => ({
        id:
          `decision-${opportunity.id}`,

        title:
          opportunity.title,

        reason:
          opportunity.reason,

        urgency:
          clampScore(
            Math.round(
              opportunity.priorityScore * 0.55 +
              opportunity.urgency * 0.25 +
              opportunity.impact * 0.2,
            ),
          ),

        ownerRequired:
          opportunity.executionOwner === "Owner" ||
          opportunity.executionOwner === "Shared",
      }),
    );

  const departmentPriorities =
    departments.flatMap(
      (department) =>
        department.priorities.map(
          (priority) =>
            departmentPriorityToExecutive(
              department,
              priority,
            ),
        ),
    );

  const unique =
    new Map<
      string,
      ExecutivePriority
    >();

  for (
    const priority of [
      ...decisionPriorities,
      ...departmentPriorities,
    ]
  ) {
    const key =
      priority.title
        .trim()
        .toLowerCase();

    const existing =
      unique.get(
        key,
      );

    if (
      !existing ||
      priority.urgency >
        existing.urgency
    ) {
      unique.set(
        key,
        priority,
      );
    }
  }

  return Array.from(
    unique.values(),
  )
    .sort(
      (
        first,
        second,
      ) =>
        second.urgency -
        first.urgency,
    )
    .slice(
      0,
      10,
    );
}

function selectRisk(
  decision: DecisionResponse,
  departments: DepartmentReport[],
): string {
  const departmentAtRisk =
    [...departments]
      .sort(
        (
          first,
          second,
        ) => {
          const statusScore = {
            blocked: 4,
            needs_attention: 3,
            watching: 2,
            healthy: 1,
          } as const;

          const statusDifference =
            statusScore[second.status] -
            statusScore[first.status];

          if (
            statusDifference !== 0
          ) {
            return statusDifference;
          }

          return (
            first.healthScore -
            second.healthScore
          );
        },
      )[0];

  if (
    departmentAtRisk &&
    departmentAtRisk.biggestRisk !==
      "No major risk detected."
  ) {
    return `${departmentAtRisk.department}: ${departmentAtRisk.biggestRisk}`;
  }

  return (
    decision.businessAssessment
      ?.biggestRisk ??
    "No major risk detected."
  );
}

function buildSummary({
  decision,
  departments,
  priorities,
  activeWork,
}: {
  decision: DecisionResponse;
  departments: DepartmentReport[];
  priorities: ExecutivePriority[];
  activeWork: ActiveWork | null;
}): string {
  const blocked =
    departments.filter(
      (department) =>
        department.status ===
        "blocked",
    );

  const needsAttention =
    departments.filter(
      (department) =>
        department.status ===
        "needs_attention",
    );

  const autonomous =
    departments.filter(
      (department) =>
        department.canOperateAutomatically,
    );

  const topPriority =
    priorities[0]?.title ??
    decision.decision
      .topOpportunity.title;

  const parts = [
    decision.decision.reason,
    departments.length > 0
      ? `KAI reviewed ${departments.length} department${departments.length === 1 ? "" : "s"}.`
      : "No department reports were available.",
    blocked.length > 0
      ? `${blocked.length} department${blocked.length === 1 ? " is" : "s are"} blocked.`
      : needsAttention.length > 0
        ? `${needsAttention.length} department${needsAttention.length === 1 ? " needs" : "s need"} attention.`
        : "No department is currently blocked.",
    autonomous.length > 0
      ? `${autonomous.length} department${autonomous.length === 1 ? " can" : "s can"} continue working automatically.`
      : "No department currently has autonomous work available.",
    activeWork
      ? `Active work remains ${activeWork.status}: ${activeWork.mission}`
      : "No active work record is currently set.",
    `Today’s strongest move is ${topPriority}.`,
  ];

  return cleanValues(
    parts,
  ).join(
    " ",
  );
}

function calculateConfidence(
  decision: DecisionResponse,
  departments: DepartmentReport[],
): number {
  const values = [
    decision.decision.confidence,
    decision.memoryConfidence,
    ...departments.map(
      (department) =>
        department.confidence,
    ),
  ].filter(
    (value) =>
      Number.isFinite(value),
  );

  if (
    values.length === 0
  ) {
    return 0;
  }

  const average =
    values.reduce(
      (
        total,
        value,
      ) =>
        total + value,
      0,
    ) /
    values.length;

  const missingInformationCount =
    decision.missingMemory.length +
    departments.reduce(
      (
        total,
        department,
      ) =>
        total +
        department
          .missingInformation.length,
      0,
    );

  return clampScore(
    average -
    Math.min(
      20,
      missingInformationCount * 2,
    ),
  );
}

export class ExecutiveBrain {
  review({
    decision,
    activeWork,
    departments = [],
  }: {
    decision: DecisionResponse;
    activeWork: ActiveWork | null;
    departments?: DepartmentReport[];
  }): ExecutiveReview {
    const priorities =
      buildPriorities(
        decision,
        departments,
      );

    const ownerTasks =
      priorities.filter(
        (priority) =>
          priority.ownerRequired,
      );

    const kaiTasks =
      priorities.filter(
        (priority) =>
          !priority.ownerRequired,
      );

    const departmentsRequiringAttention =
      departments.filter(
        (department) =>
          department.status ===
            "blocked" ||
          department.status ===
            "needs_attention" ||
          department
            .requiresOwnerAttention,
      );

    const autonomousDepartments =
      departments.filter(
        (department) =>
          department
            .canOperateAutomatically,
      );

    const biggestOpportunity =
      priorities[0]?.title ??
      decision.decision
        .topOpportunity.title;

    const biggestRisk =
      selectRisk(
        decision,
        departments,
      );

    const agenda: ExecutiveAgendaItem[] = [
      {
        id:
          "changes",

        title:
          "What changed?",

        question:
          "What changed since the last review?",

        answer:
          decision.decision.whatChanged.length > 0
            ? decision.decision.whatChanged.join(
                " ",
              )
            : "No meaningful change was reported.",

        priority:
          100,
      },
      {
        id:
          "departments",

        title:
          "Department Status",

        question:
          "Which departments need attention?",

        answer:
          departments.length === 0
            ? "No department reports are available yet."
            : departmentsRequiringAttention.length > 0
              ? `${departmentsRequiringAttention.length} of ${departments.length} department(s) require attention: ${departmentsRequiringAttention.map((department) => department.department).join(", ")}.`
              : `All ${departments.length} reporting department(s) are operating without an urgent owner issue.`,

        priority:
          99,
      },
      {
        id:
          "priority",

        title:
          "Highest Priority",

        question:
          "What deserves attention first?",

        answer:
          biggestOpportunity,

        priority:
          98,
      },
      {
        id:
          "owner",

        title:
          "Owner Decisions",

        question:
          "What absolutely requires the owner's judgment?",

        answer:
          ownerTasks.length > 0
            ? `${ownerTasks.length} item(s) require owner judgment. Start with: ${ownerTasks[0].title}.`
            : "Nothing currently requires the owner.",

        priority:
          95,
      },
      {
        id:
          "kai",

        title:
          "Autonomous Work",

        question:
          "What can KAI continue without interrupting the owner?",

        answer:
          kaiTasks.length > 0
            ? `${kaiTasks.length} task(s) can continue. Start with: ${kaiTasks[0].title}.`
            : autonomousDepartments.length > 0
              ? `${autonomousDepartments.length} department(s) can continue operating automatically.`
              : "No autonomous work is currently available.",

        priority:
          92,
      },
      {
        id:
          "risk",

        title:
          "Biggest Risk",

        question:
          "What could most damage today's progress?",

        answer:
          biggestRisk,

        priority:
          90,
      },
      {
        id:
          "learning",

        title:
          "What KAI Must Learn",

        question:
          "What missing knowledge would most improve the next decision?",

        answer:
          decision.missingMemory.length > 0
            ? decision.missingMemory.join(
                " ",
              )
            : departments.flatMap(
                (department) =>
                  department.missingInformation,
              ).length > 0
              ? cleanValues(
                  departments.flatMap(
                    (department) =>
                      department.missingInformation,
                  ),
                ).join(
                  " ",
                )
              : "KAI has enough context to continue and should learn from today's results.",

        priority:
          88,
      },
    ];

    return {
      reviewedAt:
        new Date().toISOString(),

      summary:
        buildSummary({
          decision,
          departments,
          priorities,
          activeWork,
        }),

      agenda,

      priorities,

      ownerTasks,

      kaiTasks,

      departments,

      biggestRisk,

      biggestOpportunity,

      confidence:
        calculateConfidence(
          decision,
          departments,
        ),
    };
  }
}

export const executiveBrain =
  new ExecutiveBrain();