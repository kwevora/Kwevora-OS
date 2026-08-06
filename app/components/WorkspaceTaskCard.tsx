type WorkspaceTaskCardProps = {
  icon: string;
  title: string;
  status: string;
  progress: number;
  eta: string;
  why: string;
};

export default function WorkspaceTaskCard({
  icon,
  title,
  status,
  progress,
  eta,
  why,
}: WorkspaceTaskCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-4xl">{icon}</p>
          <h3 className="mt-4 text-2xl font-black">{title}</h3>
          <p className="mt-2 text-gray-400">{status}</p>
        </div>

        <div className="rounded-full bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-300">
          {progress}%
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm text-gray-400">
          <span>Progress</span>
          <span>{eta}</span>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-black/40 p-4">
        <p className="text-sm font-bold text-purple-300">Why KAI is doing this</p>
        <p className="mt-2 text-sm text-gray-300">{why}</p>
      </div>
    </div>
  );
}