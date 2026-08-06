import KAIActivityLog from "../components/KAIActivityLog";
import KAIBrainOrgans from "../components/KAIBrainOrgans";
import KAIContentIdeas from "../components/KAIContentIdeas";
import KAIDailyBrief from "../components/KAIDailyBrief";
import KAIDesk from "../components/KAIDesk";
import KAILiveAITest from "../components/KAILiveAITest";
import KAIMemory from "../components/KAIMemory";
import KAIMemoryTimeline from "../components/KAIMemoryTimeline";
import KAIMorningQuestion from "../components/KAIMorningQuestion";
import KAIOvernightWorker from "../components/KAIOvernightWorker";
import KAIReasoning from "../components/KAIReasoning";
import KAIRuntimeDebug from "../components/KAIRuntimeDebug";
import KAIThoughtStream from "../components/KAIThoughtStream";
import MorningConversation from "../components/MorningConversation";

export default function KAIWorkspacePage() {
  return (
    <main className="min-h-screen bg-[#07040f] text-white">
      <section className="mx-auto max-w-7xl space-y-10 p-6">

        <MorningConversation />

        <Section
          title="Decision Making"
          description="How KAI decided today's priorities."
        >
          <KAIDailyBrief />
          <KAIReasoning />
          <KAIMorningQuestion />
        </Section>

        <Section
          title="Memory & Learning"
          description="What KAI remembers and how it is improving."
        >
          <KAIMemory />
          <KAIMemoryTimeline />
        </Section>

        <Section
          title="Current Work"
          description="What KAI is actively doing while you live your life."
        >
          <KAIDesk />
          <KAIContentIdeas />
          <KAIOvernightWorker />
        </Section>

        <details className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <summary className="cursor-pointer px-8 py-6 text-xl font-black">
            Builder Mode
          </summary>

          <div className="space-y-8 border-t border-white/10 p-8">
            <KAIRuntimeDebug />
            <KAILiveAITest />
            <KAIBrainOrgans />
            <KAIActivityLog />
            <KAIThoughtStream />
          </div>
        </details>

      </section>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-8">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-purple-300">
        {title}
      </p>

      <p className="mt-3 text-gray-400">
        {description}
      </p>

      <div className="mt-8 space-y-8">
        {children}
      </div>
    </section>
  );
}