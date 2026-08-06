import { NextResponse } from "next/server";

import {
  overnightEngine,
} from "@/app/lib/OvernightEngine";

import type {
  DecisionRequest,
} from "@/app/lib/DecisionCore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latestReport =
      overnightEngine.latest();

    if (!latestReport) {
      return NextResponse.json(
        {
          success: false,
          report: null,
          message:
            "KAI has not completed an overnight shift yet.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      report:
        latestReport.report,
      reportId:
        latestReport.id,
      createdAt:
        latestReport.createdAt,
      message:
        "KAI loaded the latest overnight report.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not load the latest overnight report.";

    return NextResponse.json(
      {
        success: false,
        report: null,
        message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const rawBody =
      await request.text();

    let decisionRequest:
      DecisionRequest = {};

    if (rawBody.trim()) {
      const parsed: unknown =
        JSON.parse(rawBody);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The overnight request must be a JSON object.",
          },
          {
            status: 400,
          },
        );
      }

      decisionRequest =
        parsed as DecisionRequest;
    }

    const result =
      overnightEngine.run(
        decisionRequest,
      );

    return NextResponse.json({
      success: true,
      report:
        result.report,
      reportId:
        result.storedReport.id,
      createdAt:
        result.storedReport.createdAt,
      message:
        "KAI completed and saved the overnight shift.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not complete the overnight shift.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      },
    );
  }
}