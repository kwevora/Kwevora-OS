"use client";

import { useEffect, useState } from "react";
import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function KAIContentIdeas() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ideas = mounted ? runtime.contentIdeas : [];

  return (
    <section className="rounded-3xl border border-pink-500/30 bg-pink-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-pink-300">
        CONTENT KAI PREPARED
      </p>

      <h2 className="mt-4 text-4xl font-black">
        {mounted && ideas.length > 0
          ? "Complete content packages are ready."
          : "No content ideas yet."}
      </h2>

      <div className="mt-8 grid gap-6">
        {ideas.length > 0 ? (
          ideas.map((idea) => (
            <article
              key={idea.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-pink-300">
                    {idea.format.replaceAll("_", " ")}
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    {idea.title}
                  </h3>
                </div>

                {idea.videoPlan?.estimatedLengthSeconds && (
                  <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
                    About {idea.videoPlan.estimatedLengthSeconds} seconds
                  </p>
                )}
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-bold text-pink-300">HOOK</p>
                  <p className="mt-2 text-lg text-gray-200">{idea.hook}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-bold text-pink-300">
                    TARGET AUDIENCE
                  </p>
                  <p className="mt-2 text-gray-300">
                    {idea.audience || "Audience not provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm font-bold text-pink-300">CAPTION</p>
                <p className="mt-2 whitespace-pre-line leading-7 text-gray-300">
                  {idea.caption}
                </p>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-bold text-pink-300">
                    THUMBNAIL IDEA
                  </p>
                  <p className="mt-2 text-gray-300">
                    {idea.thumbnailIdea || "No thumbnail idea provided."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-bold text-pink-300">
                    CALL TO ACTION
                  </p>
                  <p className="mt-2 text-gray-300">
                    {idea.callToAction || "No call to action provided."}
                  </p>
                </div>
              </div>

              {idea.hashtags && idea.hashtags.length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-bold text-pink-300">HASHTAGS</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {idea.hashtags.map((hashtag) => (
                      <span
                        key={hashtag}
                        className="rounded-full bg-pink-500/10 px-3 py-2 text-sm text-pink-200"
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {idea.recommendedPlatforms &&
                idea.recommendedPlatforms.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm font-bold text-pink-300">
                      RECOMMENDED PLATFORMS
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {idea.recommendedPlatforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full bg-white/5 px-3 py-2 text-sm text-gray-200"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {idea.videoPlan && (
                <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5">
                  <p className="text-sm font-bold text-cyan-300">
                    VIDEO PLAN
                  </p>

                  <div className="mt-4">
                    <p className="text-sm font-bold text-gray-400">
                      Opening text
                    </p>
                    <p className="mt-1 text-gray-200">
                      {idea.videoPlan.openingText}
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-bold text-gray-400">Scenes</p>

                    <ol className="mt-3 space-y-3">
                      {idea.videoPlan.scenes.map((scene, index) => (
                        <li
                          key={`${idea.id}-scene-${index}`}
                          className="flex gap-3 text-gray-300"
                        >
                          <span className="font-black text-cyan-300">
                            {index + 1}.
                          </span>
                          <span>{scene}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-bold text-gray-400">
                      Ending text
                    </p>
                    <p className="mt-1 text-gray-200">
                      {idea.videoPlan.endingText}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm font-bold text-pink-300">
                  WHY KAI CHOSE THIS
                </p>
                <p className="mt-2 text-gray-400">{idea.reason}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <p className="text-gray-300">
              Run Live AI or End Day so KAI can prepare real content ideas.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}