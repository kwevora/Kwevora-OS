import {
  db,
} from "./database";

import type {
  ExecutionPlan,
} from "../ExecutionEngine";

type ExecutionPlanRow = {
  id: string;
  plan: string;
  objective: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
};

function rowToPlan(
  row: ExecutionPlanRow,
): ExecutionPlan {
  return JSON.parse(
    row.plan,
  ) as ExecutionPlan;
}

export class ExecutionPlanRepository {
  save(
    plan: ExecutionPlan,
  ): ExecutionPlan {
    const updatedAt =
      new Date().toISOString();

    db.prepare(
      `
        INSERT INTO execution_plans
        (
          id,
          plan,
          objective,
          status,
          progress,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)

        ON CONFLICT(id)
        DO UPDATE SET
          plan = excluded.plan,
          objective = excluded.objective,
          status = excluded.status,
          progress = excluded.progress,
          updatedAt = excluded.updatedAt
      `,
    ).run(
      plan.id,
      JSON.stringify(
        plan,
      ),
      plan.objective,
      plan.status,
      plan.progress,
      plan.createdAt,
      updatedAt,
    );

    return plan;
  }

  get(
    id: string,
  ): ExecutionPlan | null {
    const row =
      db.prepare(
        `
          SELECT *
          FROM execution_plans
          WHERE id = ?
          LIMIT 1
        `,
      ).get(
        id,
      ) as
        | ExecutionPlanRow
        | undefined;

    return row
      ? rowToPlan(
          row,
        )
      : null;
  }

  latest():
    | ExecutionPlan
    | null {
    const row =
      db.prepare(
        `
          SELECT *
          FROM execution_plans
          ORDER BY createdAt DESC
          LIMIT 1
        `,
      ).get() as
        | ExecutionPlanRow
        | undefined;

    return row
      ? rowToPlan(
          row,
        )
      : null;
  }

  history(
    limit = 30,
  ): ExecutionPlan[] {
    const safeLimit =
      Math.max(
        1,
        Math.min(
          200,
          Math.floor(
            limit,
          ),
        ),
      );

    const rows =
      db.prepare(
        `
          SELECT *
          FROM execution_plans
          ORDER BY createdAt DESC
          LIMIT ?
        `,
      ).all(
        safeLimit,
      ) as ExecutionPlanRow[];

    return rows.map(
      rowToPlan,
    );
  }

  active():
    ExecutionPlan[] {
    const rows =
      db.prepare(
        `
          SELECT *
          FROM execution_plans
          WHERE status NOT IN
          (
            'completed',
            'failed'
          )
          ORDER BY createdAt DESC
        `,
      ).all() as ExecutionPlanRow[];

    return rows.map(
      rowToPlan,
    );
  }
}

export const executionPlanRepository =
  new ExecutionPlanRepository();