"use client";

import { useEffect, useState } from "react";
import VerifiedBusinessLaunchPanel from "./VerifiedBusinessLaunchPanel";
import StorefrontOfferPanel from "./StorefrontOfferPanel";
import CommerceOperationsPanel from "./CommerceOperationsPanel";
import ProfitCashFlowPanel from "./ProfitCashFlowPanel";
import CustomerAcquisitionPanel from "./CustomerAcquisitionPanel";
import CustomerRetentionPanel from "./CustomerRetentionPanel";
import BusinessHealthExecutivePanel from "./BusinessHealthExecutivePanel";
import StanStoreLiveSalesPanel from "./StanStoreLiveSalesPanel";

type Slot = {
  id: string; position: number; product: string; platform: string; format: string;
  bucket: string; scheduledFor: string; expectedOutcome: string; revenueTarget: number;
};

type RecoveryAction = { id: string; action: string };

type Command = {
  plan: { id: string; postsPlanned: number; weeklyRevenueTarget: number; ownerApprovedAt?: string | null };
  progress: {
    counts: Record<string, number>; earnedRevenue: number; remainingRevenueTarget: number;
    expectedRevenueByNow: number; onPace: boolean; summary: string;
  };
  pace: "ahead" | "on_pace" | "behind";
  recovery: { briefing: string; actions: RecoveryAction[] };
  pendingApprovals: { weeklyPlan: boolean; recoveryActions: RecoveryAction[]; highRiskSlots: Slot[]; total: number };
  autonomy: {
    status: "awaiting_approval" | "authorized" | "paused" | "revision_requested";
    videoAuthorized: boolean; schedulingAuthorized: boolean; publishingAuthorized: boolean; revisionCount: number;
  };
  todayAssignment: Slot | null;
  recommendation: string;
  handoff: string;
  videoProduction: {
    total: number;
    counts: Record<string, number>;
    active: { status: string; topic: string } | null;
  };
  publishingHandoff: {
    total: number;
    counts: Record<string, number>;
    active: { status: string; platform: string; payload: { title: string } } | null;
    nextScheduled: { scheduledFor: string | null; platform: string; payload: { title: string } } | null;
  };
  performanceLearning: {
    totalSnapshots: number;
    measuredContent: number;
    decisions: { repeat: number; improve: number; stop: number; keepLearning: number };
    latest: {
      platform: string; decision: string; confidence: number; lesson: string; recommendation: string;
      missingMetrics: string[];
    } | null;
    videoPerformance: {
      measuredVersions: number;
      revisedVersions: number;
      originalVersions: number;
      provenPatterns: Array<{ dimension: string; value: string; evidenceCount: number; explanation: string }>;
      retiredPatterns: Array<{ dimension: string; value: string; evidenceCount: number; explanation: string }>;
      revisionImpact: { revisedAverageScore: number | null; originalAverageScore: number | null; conclusion: string };
      nextRecommendation: string;
      evidenceRule: string;
    };
  };
  videoExperiments: {
    total: number;
    active: null | {
      id: string; status: string; variable: string; hypothesis: string;
      control: { value: string; slotIds: string[]; averageScore: number | null };
      challenger: { value: string; slotIds: string[]; averageScore: number | null };
      matchedConditions: Record<string, string>; minimumEvidencePerArm: number;
      successRule: string; stopRule: string; resultExplanation: string; winner: "control" | "challenger" | null;
    };
  };
  creativeWinners: {
    total: number;
    active: Array<{ id: string; status: string; variable: string; value: string; evidenceCount: number; promotedScore: number; controlScore: number; lift: number; recentScore: number | null; recentEvidenceCount: number; appliedCount: number; explanation: string; context: Record<string, string> }>;
    watching: Array<{ id: string; status: string; variable: string; value: string; recentEvidenceCount: number; appliedCount: number; explanation: string }>;
    retired: Array<{ id: string; status: string; variable: string; value: string; explanation: string }>;
    heldForEvidence: Array<{ id: string }>;
    evidenceRule: string;
  };
  creativeRefresh: {
    active: null | {
      id: string; status: string; variable: string; hypothesis: string;
      control: { value: string; slotIds: string[]; averageScore: number | null };
      challenger: { value: string; slotIds: string[]; averageScore: number | null };
      fatigueEvidence: { promotedScore: number; recentScore: number; verifiedReuseResults: number; decline: number };
      successRule: string; resultExplanation: string;
    };
    fatigueRule: string;
  };
  creativePortfolio: {
    rankedWinners: Array<{ winnerId: string; rank: number; score: number; status: string; variable: string; value: string; reason: string }>;
    assignments: Array<{ slotId: string; position: number; role: "scale" | "rotate" | "test" | "learn" | "hold"; winnerId: string | null; winnerScore: number | null; reason: string }>;
    allocation: { scale: number; rotate: number; test: number; learn: number; hold: number };
    explanation: string; evidenceRule: string;
  };
  crossPlatformExpansion: {
    active: null | {
      id: string; status: string; hypothesis: string; sourcePlatform: string; destinationPlatform: string;
      control: { value: string; slotIds: string[]; averageScore: number | null };
      challenger: { value: string; slotIds: string[]; averageScore: number | null };
      minimumEvidencePerArm: number; successRule: string; resultExplanation: string;
    };
    evidenceRule: string;
  };
  campaignSequence: {
    assignments: Array<{ slotId: string; position: number; stage: "attract" | "educate" | "prove" | "convert" | "follow_up"; objective: string; protectedExperimentId: string | null; creativeWinnerId: string | null; reason: string }>;
    stageCounts: { attract: number; educate: number; prove: number; convert: number; follow_up: number };
    explanation: string; approvalSummary: string; dropoff: string; evidenceRule: string;
    results: Record<"attract" | "educate" | "prove" | "convert" | "follow_up", { publications: number; views: number; clicks: number; leads: number; sales: number; revenue: number }>;
  };
  campaignRecovery: { active: null | { id:string; status:string; brokenStage:string; variable:string; diagnosis:string; proposedFix:string; protectedVariables:string[]; ownerApprovalRequired:boolean; minimumEvidence:number; successRule:string; stopRule:string; current:number }; evidenceRule:string };
  revenueScaling:{decision:{status:string;action:"scale"|"hold"|"reduce";currentWeeklyPosts:number;recommendedWeeklyPosts:number;verifiedPublications:number;revenuePublications:number;recentRevenuePerPost:number;previousRevenuePerPost:number|null;verifiedSales:number;verifiedRevenue:number;reason:string;protectedCapacity:{winnerPercent:number;challengerPercent:number;learningPercent:number};stopRule:string};evidenceRule:string};
  operatingLoop:{status:string;priority:string;priorityRank:number;title:string;decision:string;evidence:string[];suppressedActions:string[];whyThisWeekChanged:string;approvalPackage:{summary:string;weeklyPlan:boolean;highRiskRecovery:boolean;posts:number;revenueTarget:number};auditTrail:Array<{at:string;event:string;detail:string}>};
  weeklyLearning:{status:string;summary:string;whyNextWeekChanges:string;outcomes:{planned:number;published:number;measured:number;rejected:number;verifiedRevenue:number;revenueTarget:number;targetAttainment:number};lessons:Array<{status:"proven"|"retired"|"learning";category:string;statement:string;evidenceCount:number;nextAction:string}>;experimentClosures:Array<{id:string;kind:string;status:string;winner:string|null;explanation:string}>;carryForward:{repeat:string[];avoid:string[];stillLearning:string[]};missingEvidence:string[]};
};

export default function KAIMorningGrowthCommand() {
  const [command, setCommand] = useState<Command | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/kai/morning-growth-command", { cache: "no-store" });
      const data = await response.json() as { success: boolean; command: Command | null; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message ?? "KAI could not load the growth command.");
      setError("");
      setCommand(data.command);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "KAI could not load the growth command.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The initial API read synchronizes this client-only command surface with KAI's server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function approve(action: string, extra: Record<string, string> = {}) {
    try {
      setSaving(true); setError("");
      const response = await fetch("/api/kai/morning-growth-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json() as { success: boolean; command?: Command; message?: string };
      if (!response.ok || !data.success || !data.command) throw new Error(data.message ?? "KAI could not save that approval.");
      setCommand(data.command);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "KAI could not save that approval.");
    } finally { setSaving(false); }
  }

  if (loading) return <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-gray-400">KAI is assembling your growth command...</section>;
  if (error && !command) return <section className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</section>;
  if (!command) return null;

  const paceLabel = command.pace === "ahead" ? "Ahead" : command.pace === "on_pace" ? "On pace" : "Behind";
  const paceColor = command.pace === "behind" ? "text-amber-300 bg-amber-500/10 border-amber-500/25" : "text-green-300 bg-green-500/10 border-green-500/25";
  const counts = command.progress.counts;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#1b0b31] via-[#0d0818] to-black">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-purple-300">Morning Growth Command</p>
            <h2 className="mt-2 text-3xl font-black">This week, at a glance</h2>
          </div>
          <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${paceColor}`}>{paceLabel}</span>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Revenue earned" value={`$${command.progress.earnedRevenue.toFixed(2)}`} />
          <Metric label="Weekly target" value={`$${command.plan.weeklyRevenueTarget.toFixed(2)}`} />
          <Metric label="Still needed" value={`$${command.progress.remainingRevenueTarget.toFixed(2)}`} />
          <Metric label="Approvals needed" value={String(command.pendingApprovals.total)} />
        </div>

        <BusinessHealthExecutivePanel />

        <VerifiedBusinessLaunchPanel />
        <StorefrontOfferPanel />
        <StanStoreLiveSalesPanel />
        <CommerceOperationsPanel />
        <ProfitCashFlowPanel />
        <CustomerAcquisitionPanel />
        <CustomerRetentionPanel />

        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Status label="Measured" value={counts.measured ?? 0} />
          <Status label="Published" value={counts.published ?? 0} />
          <Status label="Scheduled" value={counts.scheduled ?? 0} />
          <Status label="Awaiting review" value={counts.awaiting_review ?? 0} />
          <Status label="Blocked" value={counts.publishing_blocked ?? 0} />
          <Status label="Remaining" value={counts.planned ?? 0} />
        </div>

        <div className="mt-6 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">Autonomous Growth Operating Loop · Priority {command.operatingLoop.priorityRank}</p><h3 className="mt-2 text-xl font-black">{command.operatingLoop.title}</h3><p className="mt-2 text-sm text-fuchsia-100">{command.operatingLoop.decision}</p></div><span className="w-fit rounded-full border border-fuchsia-300/25 px-4 py-2 text-sm font-bold text-fuchsia-200">{command.operatingLoop.status.replaceAll("_"," ")}</span></div>
          <p className="mt-4 text-sm text-gray-300"><span className="font-black text-white">Why this week changed:</span> {command.operatingLoop.whyThisWeekChanged}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">Verified evidence</p>{command.operatingLoop.evidence.map(item=><p key={item} className="mt-2 text-sm text-gray-200">• {item}</p>)}</div><div><p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">Deferred to prevent conflicts</p>{command.operatingLoop.suppressedActions.slice(0,3).map(item=><p key={item} className="mt-2 text-sm text-gray-400">• {item}</p>)}</div></div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">Unified approval package</p><p className="mt-2 text-sm font-bold">{command.operatingLoop.approvalPackage.summary}</p>{command.operatingLoop.approvalPackage.highRiskRecovery&&<p className="mt-2 text-xs text-amber-300">Includes explicit authorization for the verified high-risk funnel recovery.</p>}</div>
          <div className="mt-4 flex flex-wrap gap-2">{command.operatingLoop.auditTrail.slice(-4).map((item,index)=><span key={`${item.at}-${index}`} title={item.detail} className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">{item.event.replaceAll("_"," ")}</span>)}</div>
        </div>

        <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Autonomous Weekly Learning Loop</p><h3 className="mt-2 text-xl font-black">What happened, why, and what changes next</h3><p className="mt-2 text-sm text-violet-100">{command.weeklyLearning.summary}</p></div><span className="w-fit rounded-full border border-violet-300/25 px-4 py-2 text-sm font-bold text-violet-200">{command.weeklyLearning.status}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Measured" value={String(command.weeklyLearning.outcomes.measured)}/><Metric label="Verified revenue" value={`$${command.weeklyLearning.outcomes.verifiedRevenue.toFixed(2)}`}/><Metric label="Target reached" value={`${command.weeklyLearning.outcomes.targetAttainment.toFixed(0)}%`}/><Metric label="Closed tests" value={String(command.weeklyLearning.experimentClosures.length)}/></div>
          <p className="mt-4 text-sm text-gray-200"><span className="font-black text-white">Next week:</span> {command.weeklyLearning.whyNextWeekChanges}</p>
          {command.weeklyLearning.lessons.length>0&&<div className="mt-4 grid gap-3 lg:grid-cols-2">{command.weeklyLearning.lessons.slice(0,4).map((lesson,index)=><div key={`${lesson.status}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.15em] text-violet-300">{lesson.status}</span><span className="text-xs text-gray-500">{lesson.evidenceCount} verified</span></div><p className="mt-2 text-sm text-gray-200">{lesson.statement}</p><p className="mt-2 text-xs text-gray-400">Next: {lesson.nextAction}</p></div>)}</div>}
          {command.weeklyLearning.missingEvidence.length>0&&<p className="mt-4 text-xs text-gray-400">Still needed: {command.weeklyLearning.missingEvidence.join(" ")}</p>}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">Video production</p>
              <p className="mt-2 text-lg font-black">
                {command.videoProduction.counts.ready_for_review ?? 0} ready for review · {command.videoProduction.counts.queued ?? 0} queued · {command.videoProduction.counts.waiting_approval ?? 0} waiting for approval
              </p>
            </div>
            <span className="rounded-full border border-blue-300/20 px-4 py-2 text-sm font-bold text-blue-200">
              {command.videoProduction.active ? command.videoProduction.active.status.replaceAll("_", " ") : "Renderer available"}
            </span>
          </div>
          {(command.videoProduction.counts.retry_waiting ?? 0) > 0 && <p className="mt-3 text-sm text-amber-300">One temporary failure is waiting for KAI&apos;s safe retry.</p>}
          {(command.videoProduction.counts.stopped ?? 0) > 0 && <p className="mt-3 text-sm text-red-300">A repeated video failure stopped and needs attention.</p>}
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Publishing handoff</p>
              <p className="mt-2 text-lg font-black">
                {command.publishingHandoff.counts.published ?? 0} published · {command.publishingHandoff.counts.scheduled ?? 0} scheduled · {command.publishingHandoff.counts.ready ?? 0} ready
              </p>
            </div>
            <span className="rounded-full border border-cyan-300/20 px-4 py-2 text-sm font-bold text-cyan-200">
              {command.publishingHandoff.active
                ? `Publishing to ${command.publishingHandoff.active.platform}`
                : command.publishingHandoff.nextScheduled?.scheduledFor
                  ? `Next ${new Date(command.publishingHandoff.nextScheduled.scheduledFor).toLocaleString()}`
                  : "Publisher available"}
            </span>
          </div>
          {(command.publishingHandoff.counts.blocked ?? 0) > 0 && <p className="mt-3 text-sm text-amber-300">{command.publishingHandoff.counts.blocked} handoff(s) safely blocked with a reason instead of being simulated.</p>}
          {(command.publishingHandoff.counts.retry_waiting ?? 0) > 0 && <p className="mt-2 text-sm text-amber-300">One platform failure is waiting for its single safe retry.</p>}
          {(command.publishingHandoff.counts.stopped ?? 0) > 0 && <p className="mt-2 text-sm text-red-300">{command.publishingHandoff.counts.stopped} repeated failure(s) stopped for your attention.</p>}
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Verified performance learning</p>
              <p className="mt-2 text-lg font-black">
                {command.performanceLearning.decisions.repeat} repeat · {command.performanceLearning.decisions.improve} improve · {command.performanceLearning.decisions.stop} stop · {command.performanceLearning.decisions.keepLearning} still learning
              </p>
              {command.performanceLearning.latest && <p className="mt-3 text-sm text-emerald-100">{command.performanceLearning.latest.recommendation}</p>}
            </div>
            <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-sm font-bold text-emerald-200">
              {command.performanceLearning.latest
                ? `${command.performanceLearning.latest.confidence}% verified confidence`
                : "Waiting for real results"}
            </span>
          </div>
          {command.performanceLearning.latest && command.performanceLearning.latest.missingMetrics.length > 0 && <p className="mt-3 text-xs text-gray-400">Unavailable data is not estimated: {command.performanceLearning.latest.missingMetrics.join(", ")}.</p>}
        </div>

        <div className="mt-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">Verified video-direction learning</p>
              <p className="mt-2 text-lg font-black">
                {command.performanceLearning.videoPerformance.measuredVersions} exact video version(s) measured · {command.performanceLearning.videoPerformance.provenPatterns.length} proven editing pattern(s)
              </p>
              <p className="mt-3 text-sm text-fuchsia-100">{command.performanceLearning.videoPerformance.nextRecommendation}</p>
              <p className="mt-2 text-xs text-gray-400">{command.performanceLearning.videoPerformance.revisionImpact.conclusion}</p>
            </div>
            <span className="rounded-full border border-fuchsia-300/20 px-4 py-2 text-sm font-bold text-fuchsia-200">
              {command.performanceLearning.videoPerformance.retiredPatterns.length} weak pattern(s) stopped
            </span>
          </div>
          <p className="mt-3 text-xs text-gray-500">{command.performanceLearning.videoPerformance.evidenceRule}</p>
        </div>

        {command.videoExperiments.active && <div className="mt-4 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Controlled video experiment</p>
              <p className="mt-2 text-lg font-black">One variable: {command.videoExperiments.active.variable.replaceAll("_", " ")}</p>
              <p className="mt-3 text-sm leading-6 text-violet-100">{command.videoExperiments.active.hypothesis}</p>
            </div>
            <span className="rounded-full border border-violet-300/20 px-4 py-2 text-sm font-bold text-violet-200">{command.videoExperiments.active.status.replaceAll("_", " ")}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Control</p><p className="mt-2 font-bold">{command.videoExperiments.active.control.value}</p><p className="mt-1 text-xs text-gray-400">Score: {command.videoExperiments.active.control.averageScore ?? "collecting"}</p></div>
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Challenger</p><p className="mt-2 font-bold">{command.videoExperiments.active.challenger.value}</p><p className="mt-1 text-xs text-gray-400">Score: {command.videoExperiments.active.challenger.averageScore ?? "collecting"}</p></div>
          </div>
          <p className="mt-4 text-sm text-violet-100/80">Success rule: {command.videoExperiments.active.successRule}</p>
          <p className="mt-2 text-sm text-gray-400">Matched: {Object.entries(command.videoExperiments.active.matchedConditions).map(([key, value]) => `${key.replaceAll("_", " ")} = ${value}`).join(" · ")}</p>
          <p className="mt-3 text-xs text-gray-500">{command.videoExperiments.active.resultExplanation}</p>
        </div>}

        <div className="mt-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">Creative winner system</p>
              <p className="mt-2 text-lg font-black">{command.creativeWinners.active.length} active · {command.creativeWinners.watching.length} watching · {command.creativeWinners.retired.length} retired</p>
              <p className="mt-2 text-sm text-indigo-100/80">KAI reuses only verified winners that match the same creative context.</p>
            </div>
            <span className="rounded-full border border-indigo-300/20 px-4 py-2 text-sm font-bold text-indigo-200">{command.creativeWinners.total} learned template(s)</span>
          </div>
          {command.creativeWinners.active.slice(0, 3).map((winner) => <div key={winner.id} className="mt-4 rounded-xl bg-black/25 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-black">Scale {winner.variable.replaceAll("_", " ")}: {winner.value}</p>
              <span className="text-xs font-bold text-green-300">+{winner.lift} points · used {winner.appliedCount} time(s)</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">{winner.explanation}</p>
            <p className="mt-2 text-xs text-gray-500">Promoted score {winner.promotedScore} · recent score {winner.recentScore ?? "collecting"} · {winner.recentEvidenceCount}/3 reuse results</p>
          </div>)}
          {command.creativeWinners.retired.slice(0, 2).map((winner) => <p key={winner.id} className="mt-3 text-sm text-red-200">Stopped {winner.variable.replaceAll("_", " ")} = {winner.value}: {winner.explanation}</p>)}
          {command.creativeWinners.total === 0 && <p className="mt-4 text-sm text-gray-400">No winner is scaled until a controlled experiment earns promotion.</p>}
          {command.creativeWinners.heldForEvidence.length > 0 && <p className="mt-3 text-sm text-amber-200">{command.creativeWinners.heldForEvidence.length} winner(s) paused after six unmeasured uses while KAI waits for verified results.</p>}
          <p className="mt-3 text-xs text-gray-500">{command.creativeWinners.evidenceRule}</p>
        </div>

        {command.creativeRefresh.active && <div className="mt-4 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Creative refresh</p>
              <p className="mt-2 text-lg font-black">Refresh one variable: {command.creativeRefresh.active.variable.replaceAll("_", " ")}</p>
              <p className="mt-3 text-sm leading-6 text-orange-100">{command.creativeRefresh.active.hypothesis}</p>
            </div>
            <span className="rounded-full border border-orange-300/20 px-4 py-2 text-sm font-bold text-orange-200">{command.creativeRefresh.active.status.replaceAll("_", " ")}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Fatigue signal</p><p className="mt-2 font-bold">-{command.creativeRefresh.active.fatigueEvidence.decline} points</p><p className="mt-1 text-xs text-gray-400">{command.creativeRefresh.active.fatigueEvidence.verifiedReuseResults} verified reuse results</p></div>
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Protected control</p><p className="mt-2 font-bold">{command.creativeRefresh.active.control.value}</p><p className="mt-1 text-xs text-gray-400">3 matched versions</p></div>
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Refreshed challenger</p><p className="mt-2 font-bold">{command.creativeRefresh.active.challenger.value}</p><p className="mt-1 text-xs text-gray-400">3 matched versions</p></div>
          </div>
          <p className="mt-4 text-sm text-orange-100/80">{command.creativeRefresh.active.successRule}</p>
          <p className="mt-3 text-xs text-gray-500">{command.creativeRefresh.active.resultExplanation}</p>
        </div>}

        <div className="mt-4 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Creative portfolio</p>
              <p className="mt-2 text-lg font-black">{command.creativePortfolio.allocation.scale} scale · {command.creativePortfolio.allocation.rotate} rotate · {command.creativePortfolio.allocation.test} test · {command.creativePortfolio.allocation.learn} learn</p>
              <p className="mt-2 text-sm text-sky-100/80">{command.creativePortfolio.explanation}</p>
            </div>
            <span className="rounded-full border border-sky-300/20 px-4 py-2 text-sm font-bold text-sky-200">{command.creativePortfolio.allocation.hold} held for evidence</span>
          </div>
          {command.creativePortfolio.rankedWinners.slice(0, 4).map((winner) => <div key={winner.winnerId} className="mt-4 rounded-xl bg-black/25 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-black">#{winner.rank} · {winner.variable.replaceAll("_", " ")} = {winner.value}</p>
              <span className="text-sm font-bold text-sky-300">Portfolio score {winner.score}</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">{winner.reason}</p>
          </div>)}
          {command.creativePortfolio.rankedWinners.length === 0 && <p className="mt-4 text-sm text-gray-400">The portfolio remains in learning until a controlled experiment produces a verified winner.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {command.creativePortfolio.assignments.map((assignment) => <span key={assignment.slotId} title={assignment.reason} className={`rounded-full border px-3 py-1 text-xs font-bold ${assignment.role === "scale" ? "border-green-400/25 text-green-300" : assignment.role === "test" ? "border-violet-400/25 text-violet-300" : assignment.role === "hold" ? "border-amber-400/25 text-amber-300" : "border-white/15 text-gray-300"}`}>Slot {assignment.position}: {assignment.role}</span>)}
          </div>
          <p className="mt-3 text-xs text-gray-500">{command.creativePortfolio.evidenceRule}</p>
        </div>

        {command.crossPlatformExpansion.active && <div className="mt-4 rounded-2xl border border-teal-500/25 bg-teal-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Cross-platform expansion</p>
              <p className="mt-2 text-lg font-black">{command.crossPlatformExpansion.active.sourcePlatform} winner → {command.crossPlatformExpansion.active.destinationPlatform}</p>
              <p className="mt-3 text-sm leading-6 text-teal-100">{command.crossPlatformExpansion.active.hypothesis}</p>
            </div>
            <span className="rounded-full border border-teal-300/20 px-4 py-2 text-sm font-bold text-teal-200">{command.crossPlatformExpansion.active.status.replaceAll("_", " ")}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Destination control</p><p className="mt-2 font-bold">{command.crossPlatformExpansion.active.control.value}</p><p className="mt-1 text-xs text-gray-400">3 native {command.crossPlatformExpansion.active.destinationPlatform} versions · score {command.crossPlatformExpansion.active.control.averageScore ?? "collecting"}</p></div>
            <div className="rounded-xl bg-black/25 p-4"><p className="text-xs font-black uppercase text-gray-500">Adapted challenger</p><p className="mt-2 font-bold">{command.crossPlatformExpansion.active.challenger.value}</p><p className="mt-1 text-xs text-gray-400">3 adapted versions · score {command.crossPlatformExpansion.active.challenger.averageScore ?? "collecting"}</p></div>
          </div>
          <p className="mt-4 text-sm text-teal-100/80">{command.crossPlatformExpansion.active.successRule}</p>
          <p className="mt-3 text-xs text-gray-500">{command.crossPlatformExpansion.active.resultExplanation} {command.crossPlatformExpansion.evidenceRule}</p>
        </div>}

        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">Campaign journey</p>
              <p className="mt-2 text-lg font-black">{command.campaignSequence.stageCounts.attract} attract · {command.campaignSequence.stageCounts.educate} educate · {command.campaignSequence.stageCounts.prove} prove · {command.campaignSequence.stageCounts.convert} convert · {command.campaignSequence.stageCounts.follow_up} follow up</p>
              <p className="mt-2 text-sm text-rose-100/80">{command.campaignSequence.explanation}</p>
            </div>
            <span className="rounded-full border border-rose-300/20 px-4 py-2 text-sm font-bold text-rose-200">Weekly sequence ready</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {command.campaignSequence.assignments.map((assignment) => <span key={assignment.slotId} title={`${assignment.objective} ${assignment.reason}`} className={`rounded-full border px-3 py-1 text-xs font-bold ${assignment.stage === "convert" ? "border-green-400/25 text-green-300" : assignment.stage === "prove" ? "border-purple-400/25 text-purple-300" : assignment.stage === "attract" ? "border-blue-400/25 text-blue-300" : "border-white/15 text-gray-300"}`}>Slot {assignment.position}: {assignment.stage.replaceAll("_", " ")}{assignment.protectedExperimentId ? " · test protected" : ""}</span>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.entries(command.campaignSequence.results) as Array<[keyof Command["campaignSequence"]["results"], Command["campaignSequence"]["results"][keyof Command["campaignSequence"]["results"]]]>).map(([stage, result]) => <div key={stage} className="rounded-xl bg-black/25 p-3"><p className="text-xs font-black uppercase text-gray-500">{stage.replaceAll("_", " ")}</p><p className="mt-2 text-sm font-bold">{result.publications} measured</p><p className="mt-1 text-xs text-gray-400">{result.views} views · {result.clicks} clicks · {result.sales} sales</p></div>)}
          </div>
          <p className="mt-4 text-sm text-rose-100">{command.campaignSequence.dropoff}</p>
          <p className="mt-2 text-xs text-gray-500">{command.campaignSequence.approvalSummary} {command.campaignSequence.evidenceRule}</p>
        </div>
        {command.campaignRecovery.active && <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Campaign funnel recovery</p><p className="mt-2 text-lg font-black">Repair {command.campaignRecovery.active.brokenStage.replaceAll("_"," ")}: {command.campaignRecovery.active.variable.replaceAll("_"," ")}</p><p className="mt-3 text-sm text-amber-100">{command.campaignRecovery.active.diagnosis} {command.campaignRecovery.active.proposedFix}</p></div><span className="rounded-full border border-amber-300/20 px-4 py-2 text-sm font-bold text-amber-200">{command.campaignRecovery.active.status.replaceAll("_"," ")}</span></div><p className="mt-3 text-sm text-gray-300">Protected: {command.campaignRecovery.active.protectedVariables.join(", ")}.</p><p className="mt-2 text-sm text-gray-400">Success: {command.campaignRecovery.active.successRule}</p>{command.campaignRecovery.active.status==="awaiting_approval"&&<button disabled={saving} onClick={()=>void approve("approve_campaign_recovery")} className="mt-4 rounded-full bg-amber-500 px-5 py-3 font-black text-black disabled:opacity-50">Approve Recovery</button>}<p className="mt-3 text-xs text-gray-500">{command.campaignRecovery.evidenceRule}</p></div>}
        <div className="mt-4 rounded-2xl border border-lime-500/25 bg-lime-500/10 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">Revenue scaling governor</p><p className="mt-2 text-lg font-black">{command.revenueScaling.decision.action.toUpperCase()} · {command.revenueScaling.decision.recommendedWeeklyPosts} weekly posts</p><p className="mt-3 text-sm text-lime-100">{command.revenueScaling.decision.reason}</p></div><span className="rounded-full border border-lime-300/20 px-4 py-2 text-sm font-bold text-lime-200">{command.revenueScaling.decision.status.replaceAll("_"," ")}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Verified sales" value={String(command.revenueScaling.decision.verifiedSales)}/><Metric label="Verified revenue" value={`$${command.revenueScaling.decision.verifiedRevenue.toFixed(2)}`}/><Metric label="Revenue / post" value={`$${command.revenueScaling.decision.recentRevenuePerPost.toFixed(2)}`}/><Metric label="Revenue posts" value={String(command.revenueScaling.decision.revenuePublications)}/></div><p className="mt-3 text-sm text-gray-300">Capacity protected: {command.revenueScaling.decision.protectedCapacity.winnerPercent}% winners · {command.revenueScaling.decision.protectedCapacity.challengerPercent}% challengers · {command.revenueScaling.decision.protectedCapacity.learningPercent}% learning.</p><p className="mt-2 text-xs text-gray-500">Stop rule: {command.revenueScaling.decision.stopRule} {command.revenueScaling.evidenceRule}</p></div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Today&apos;s assignment</p>
            {command.todayAssignment ? <>
              <h3 className="mt-3 text-xl font-black">{command.todayAssignment.product}</h3>
              <p className="mt-2 text-gray-300">{command.todayAssignment.platform} · {command.todayAssignment.format.replaceAll("_", " ")} · {command.todayAssignment.bucket}</p>
              <p className="mt-3 text-sm leading-6 text-gray-400">{command.todayAssignment.expectedOutcome}</p>
              <p className="mt-3 font-bold text-purple-300">Expected revenue: ${command.todayAssignment.revenueTarget.toFixed(2)}</p>
              <p className={`mt-3 text-sm font-black ${command.autonomy.videoAuthorized ? "text-green-300" : "text-amber-300"}`}>
                Video production: {command.autonomy.videoAuthorized ? "authorized" : "waiting for weekly approval"}
              </p>
            </> : <p className="mt-3 text-gray-400">No unfinished assignment remains in this plan.</p>}
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">KAI&apos;s recommendation</p>
            <p className="mt-3 text-lg font-bold leading-7">{command.recommendation}</p>
            <p className="mt-4 text-sm leading-6 text-purple-100/70">{command.recovery.briefing}</p>
          </div>
        </div>

        {command.pendingApprovals.total > 0 && <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
          <p className="font-black text-amber-200">Only what needs you</p>
          {command.pendingApprovals.weeklyPlan && <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={saving} onClick={() => void approve("approve_plan")} className="rounded-full bg-purple-600 px-5 py-3 font-black hover:bg-purple-500 disabled:opacity-50">Approve Weekly Plan + Videos</button>
            {command.autonomy.revisionCount < 1 && <button disabled={saving} onClick={() => void approve("request_revision", { reason: "Revise the plan once using the strongest current evidence." })} className="rounded-full border border-white/20 px-5 py-3 font-black text-gray-200 disabled:opacity-50">Revise Once</button>}
          </div>}
          {command.pendingApprovals.recoveryActions.map((item) => <div key={item.id} className="mt-4 flex flex-col gap-3 border-t border-amber-400/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-100/80">{item.action}</p>
            <button disabled={saving} onClick={() => void approve("acknowledge_recovery", { recoveryActionId: item.id })} className="shrink-0 rounded-full border border-amber-300/30 px-4 py-2 text-sm font-black text-amber-200 disabled:opacity-50">Mark Handled</button>
          </div>)}
          {command.pendingApprovals.highRiskSlots.map((slot) => <div key={slot.id} className="mt-4 flex flex-col gap-3 border-t border-amber-400/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-100/80">Slot {slot.position} changes a high-risk {slot.bucket} variable and needs individual approval.</p>
            <button disabled={saving} onClick={() => void approve("approve_high_risk_slot", { slotId: slot.id })} className="shrink-0 rounded-full border border-amber-300/30 px-4 py-2 text-sm font-black text-amber-200 disabled:opacity-50">Approve Slot</button>
          </div>)}
        </div>}

        {command.plan.ownerApprovedAt && <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-400">Weekly autonomy: {command.autonomy.status.replaceAll("_", " ")}</span>
          {command.autonomy.status === "paused"
            ? <button disabled={saving} onClick={() => void approve("resume_plan")} className="rounded-full border border-green-400/30 px-4 py-2 text-sm font-black text-green-300">Resume Week</button>
            : <button disabled={saving} onClick={() => void approve("pause_plan")} className="rounded-full border border-red-400/30 px-4 py-2 text-sm font-black text-red-300">Pause Week</button>}
        </div>}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <p className="mt-7 border-t border-white/10 pt-5 text-lg font-black text-purple-300">{command.handoff}</p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Status({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-black/30 p-3 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>;
}
