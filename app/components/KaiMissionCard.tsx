"use client";

import {
  useEffect,
  useState,
} from "react";

type ContentPackage = {
  idea: string;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  destination: string;
  recommendedPlatform: string;
  publishingRecommendation: string;
  alternateHooks: string[];
};

type MissionResponse = {
  success: boolean;

  mission?: {
    title: string;
    objective: string;
    reason: string;
    successMetric: string;
    priority: string;
    requiresApproval: boolean;
    executionOwner: string;
    tasks: string[];
    contentPackage?: ContentPackage;
  };

  decision?: {
    confidence: number;

    morningQuestion: {
      question: string;
    };
  };
};

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">
      {children}
    </p>
  );
}

function ContentField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <SectionLabel>
        {label}
      </SectionLabel>

      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-200">
        {children}
      </div>
    </div>
  );
}

export default function KaiMissionCard() {
  const [
    data,
    setData,
  ] =
    useState<MissionResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    async function loadMission() {
      try {
        const response =
          await fetch(
            "/api/kai/mission",
            {
              cache: "no-store",
            },
          );

        const json =
          await response.json();

        setData(json);
      } catch (error) {
        console.error(
          "Failed to load KAI mission:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadMission();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-purple-500/25 bg-purple-500/10 p-6">
        <p className="font-bold text-purple-300">
          KAI is preparing
          today&apos;s mission...
        </p>
      </div>
    );
  }

  if (
    !data?.success ||
    !data.mission
  ) {
    return (
      <div className="rounded-3xl border border-red-500/25 bg-red-500/10 p-6">
        <h2 className="text-xl font-black">
          Mission unavailable
        </h2>

        <p className="mt-2 text-gray-300">
          KAI couldn&apos;t prepare
          today&apos;s mission.
        </p>
      </div>
    );
  }

  const mission =
    data.mission;

  const contentPackage =
    mission.contentPackage;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-purple-500/25 bg-purple-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-purple-300">
              Today&apos;s Mission
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              {mission.title}
            </h2>
          </div>

          <div className="rounded-full border border-purple-400/25 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200">
            {mission.priority}
          </div>
        </div>

        <p className="mt-4 leading-7 text-gray-300">
          {mission.objective}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <SectionLabel>
              Why
            </SectionLabel>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              {mission.reason}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <SectionLabel>
              Success
            </SectionLabel>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              {mission.successMetric}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <SectionLabel>
              Confidence
            </SectionLabel>

            <p className="mt-2 text-lg font-black text-white">
              {data.decision
                ?.confidence ?? 0}
              %
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <SectionLabel>
              Execution
            </SectionLabel>

            <p className="mt-2 text-sm font-bold text-white">
              {mission.executionOwner}
            </p>
          </div>
        </div>

        {mission.tasks?.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <SectionLabel>
              KAI&apos;s Work Plan
            </SectionLabel>

            <div className="mt-3 space-y-3">
              {mission.tasks.map(
                (task, index) => (
                  <div
                    key={`${task}-${index}`}
                    className="flex gap-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-black text-purple-200">
                      {index + 1}
                    </div>

                    <p className="text-sm leading-6 text-gray-300">
                      {task}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-400/10 p-4">
          <SectionLabel>
            KAI&apos;s Question
          </SectionLabel>

          <p className="mt-2 text-sm leading-6 text-gray-200">
            {data.decision
              ?.morningQuestion
              .question ??
              "Does this mission match what you want KAI to focus on today?"}
          </p>
        </div>
      </section>

      {contentPackage && (
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">
                Prepared by KAI
              </p>

              <h3 className="mt-3 text-2xl font-black text-white">
                Complete Content Package
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-300">
                KAI has already prepared
                the content for today&apos;s
                income-focused mission.
              </p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
              Ready for Review
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <ContentField label="Content Idea">
              {contentPackage.idea}
            </ContentField>

            <div className="grid gap-4 md:grid-cols-2">
              <ContentField label="Video Title">
                {contentPackage.title}
              </ContentField>

              <ContentField label="Recommended Platform">
                {
                  contentPackage.recommendedPlatform
                }
              </ContentField>
            </div>

            <ContentField label="Hook">
              {contentPackage.hook}
            </ContentField>

            <ContentField label="Script">
              {contentPackage.script}
            </ContentField>

            <ContentField label="Caption">
              {contentPackage.caption}
            </ContentField>

            <ContentField label="Hashtags">
              {contentPackage.hashtags.join(
                " ",
              )}
            </ContentField>

            <ContentField label="Thumbnail Idea">
              {
                contentPackage.thumbnailIdea
              }
            </ContentField>

            <ContentField label="Call to Action">
              {
                contentPackage.callToAction
              }
            </ContentField>

            <ContentField label="Destination">
              {
                contentPackage.destination
              }
            </ContentField>

            <ContentField label="Publishing Recommendation">
              {
                contentPackage.publishingRecommendation
              }
            </ContentField>

            {contentPackage
              .alternateHooks
              ?.length > 0 && (
              <ContentField label="Alternate Hooks">
                <div className="space-y-2">
                  {contentPackage.alternateHooks.map(
                    (
                      hook,
                      index,
                    ) => (
                      <p
                        key={`${hook}-${index}`}
                      >
                        {index + 1}.{" "}
                        {hook}
                      </p>
                    ),
                  )}
                </div>
              </ContentField>
            )}
          </div>
        </section>
      )}
    </div>
  );
}