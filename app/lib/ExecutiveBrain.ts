import type { DepartmentReport } from "./Department";
import type { DecisionResponse } from "./DecisionCore";
import type { ActiveWork } from "./MemoryBrain";

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
      decision.decision.opportunities
        .slice(0, 5)
        .map((opportunity) => ({
          id: opportunity.id,
          title: opportunity.title,
          reason: opportunity.reason,
          urgency: opportunity.urgency,
          ownerRequired:
            opportunity.executionOwner === "Owner" ||
            opportunity.executionOwner === "Shared",
        }))
        .sort((a, b) => b.urgency - a.urgency);

    const agenda: ExecutiveAgendaItem[] = [
      {
        id: "changes",
        title: "What changed?",
        question: "What changed since the last review?",
        answer: decision.decision.whatChanged.join(" "),
        priority: 100,
      },
      {
        id: "departments",
        title: "Department Status",
        question: "Which departments need attention?",
        answer:
          departments.length === 0
            ? "No department reports available yet."
            : `${departments.length} department report(s) reviewed.`,
        priority: 99,
      },
      {
        id: "priority",
        title: "Highest Priority",
        question: "What deserves attention first?",
        answer: decision.decision.topOpportunity.title,
        priority: 98,
      },
      {
        id: "owner",
        title: "Owner Decisions",
        question:
          "What absolutely requires the owner's judgment?",
        answer:
          priorities.filter((item) => item.ownerRequired).length > 0
            ? `${priorities.filter((item) => item.ownerRequired).length} item(s) require owner approval.`
            : "Nothing requires the owner right now.",
        priority: 95,
      },
      {
        id: "kai",
        title: "Autonomous Work",
        question: "What can I complete myself?",
        answer:
          priorities.filter((item) => !item.ownerRequired).length > 0
            ? `${priorities.filter((item) => !item.ownerRequired).length} task(s) can continue automatically.`
            : "No autonomous work available.",
        priority: 92,
      },
    ];

    return {
      reviewedAt: new Date().toISOString(),

      summary: decision.decision.reason,

      agenda,

      priorities,

      ownerTasks: priorities.filter(
        (item) => item.ownerRequired,
      ),

      kaiTasks: priorities.filter(
        (item) => !item.ownerRequired,
      ),

      departments,

      biggestRisk:
        decision.businessAssessment?.biggestRisk ??
        "No major risk detected.",

      biggestOpportunity:
        decision.decision.topOpportunity.title,

      confidence:
        decision.decision.confidence,
    };
  }
}

export const executiveBrain =
  new ExecutiveBrain();