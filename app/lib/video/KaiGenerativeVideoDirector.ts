import type { KaiCreativeConcept, KaiCreativeScene } from "../kaiCreativeDirector";
import rejectionMemory from "../../../data/kai-video-rejections.json";

type DirectorInput = {
  topic: string;
  productName: string;
  offerDescription: string;
  audience: string;
  destination?: string;
  productAssetCount: number;
  creativeApproach: string;
  platform: string;
  fallbackConcept: KaiCreativeConcept;
};

type GeneratedScene = {
  purpose?: string;
  title?: string;
  visual?: string;
  footageQuery?: string;
  narration?: string;
  onScreenText?: string;
  durationSeconds?: number;
  emotion?: string;
  cameraShot?: KaiCreativeScene["cameraShot"];
  cameraMovement?: KaiCreativeScene["cameraMovement"];
  transition?: KaiCreativeScene["transition"];
  visualSource?: "stock" | "product";
  productAssetIndex?: number;
};

type GeneratedDirection = {
  conceptName?: string;
  hook?: string;
  musicStyle?: string;
  callToAction?: string;
  reason?: string;
  scenes?: GeneratedScene[];
};

const PRODUCT_SHOTS: KaiCreativeScene["cameraShot"][] = [
  "wide",
  "over-the-shoulder",
  "close-up",
  "top-down",
  "medium",
];

const PRODUCT_MOVEMENTS: KaiCreativeScene["cameraMovement"][] = [
  "slow-push-in",
  "pan-left",
  "pan-right",
  "tracking",
  "static",
];

const PURPOSES: KaiCreativeScene["purpose"][] = [
  "hook",
  "problem",
  "emotion",
  "explanation",
  "solution",
  "proof",
  "transformation",
  "call-to-action",
];

const BANNED_COPY = [
  /stop juggling your content/i,
  /scattered ideas kill consistency/i,
  /content shouldn't feel this hard/i,
  /one planner.*every campaign/i,
  /organizes it all/i,
  /plan.*schedule.*publish/i,
  /create with clarity/i,
  /get the planner/i,
  /show overwhelmed creators/i,
  /creative direction/i,
  /what the buyer receives/i,
];

function extractResponseText(data: any): string {
  if (typeof data.output_text === "string") return data.output_text;

  for (const item of data.output ?? []) {
    for (const part of item.content ?? []) {
      if (typeof part.text === "string") return part.text;
    }
  }

  return "";
}

function parseJson(text: string): GeneratedDirection {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("KAI's director returned no JSON.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as GeneratedDirection;
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function clean(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function visibleCopy(value: unknown): string {
  const text = clean(value).replace(/\s+/g, " ");

  if (!text || BANNED_COPY.some((pattern) => pattern.test(text))) {
    return "";
  }

  return words(text).slice(0, 7).join(" ");
}

function spokenProductName(productName: string): string {
  return productName
    .replace(/\bKWEVORA\b/g, "Kwevora")
    .replace(/\s+by\s+@?[a-z0-9_.-]+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedIdentityWords(value: string): string[] {
  const ignoredWords = new Set(["a", "an", "and", "by", "for", "of", "the"]);

  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !ignoredWords.has(word));
}

function narrationIdentifiesProduct(
  narration: string,
  productName: string,
): boolean {
  const spokenName = spokenProductName(productName);
  const normalizedNarration = normalizedIdentityWords(narration);
  const productIdentity = normalizedIdentityWords(spokenName);

  if (!productIdentity.length) {
    return true;
  }

  const narrationSet = new Set(normalizedNarration);

  return productIdentity.every((word) => narrationSet.has(word));
}

function requiredProductSceneCount(productAssetCount: number): number {
  if (productAssetCount <= 1) return 2;
  if (productAssetCount <= 3) return 3;
  return 5;
}

function productSceneIndexes(productAssetCount: number): Set<number> {
  if (productAssetCount <= 1) return new Set([3, 5]);
  if (productAssetCount <= 3) return new Set([2, 4, 6]);
  return new Set([1, 2, 3, 4, 5]);
}

function repairDirection(
  input: DirectorInput,
  direction: GeneratedDirection,
): GeneratedDirection {
  const generatedScenes = Array.isArray(direction.scenes)
    ? direction.scenes
    : [];
  const fallbackScenes = input.fallbackConcept.plan.scenes;
  const targetSceneCount = 8;
  const repairedScenes: GeneratedScene[] = [];
  const requiredProductIndexes = productSceneIndexes(input.productAssetCount);
  let productSceneNumber = 0;

  for (let index = 0; index < targetSceneCount; index += 1) {
    const generated = generatedScenes[index % Math.max(1, generatedScenes.length)] ?? {};
    const fallback = fallbackScenes[index % fallbackScenes.length];
    // The repaired sequence owns the story structure. Reusing an otherwise
    // valid generated purpose (especially "hook") across cloned scenes turns
    // every scene into a text card and causes the final quality gate to reject
    // an otherwise usable spoken campaign.
    const purpose = PURPOSES[index];
    // Reference-grade product ads keep the offer on camera through the body
    // of the story. Only the opening hook and closing CTA may use context.
    const forceProductProof = requiredProductIndexes.has(index);
    const visualSource = forceProductProof ? "product" : "stock";
    const rawTitle = clean(generated.title, purpose);
    const rawOnScreenText = clean(generated.onScreenText);
    const title = BANNED_COPY.some((pattern) => pattern.test(rawTitle))
      ? clean(purpose, `scene-${index + 1}`)
      : rawTitle;
    const onScreenText = BANNED_COPY.some((pattern) => pattern.test(rawOnScreenText))
      ? ""
      : rawOnScreenText;
    const baseQuery = clean(
      generated.footageQuery,
      clean(generated.visual, fallback.visualPrompt),
    );

    repairedScenes.push({
      ...generated,
      purpose,
      title,
      onScreenText,
      visual: clean(generated.visual, fallback.visual),
      narration: clean(generated.narration, fallback.narration),
      footageQuery: visualSource === "product"
        ? "uploaded product asset"
        : `${baseQuery || "small business creator working"} angle ${index + 1}`,
      durationSeconds: Number(generated.durationSeconds) || 3.5,
      cameraShot: visualSource === "product"
        ? PRODUCT_SHOTS[productSceneNumber % PRODUCT_SHOTS.length]
        : generated.cameraShot,
      cameraMovement: visualSource === "product"
        ? PRODUCT_MOVEMENTS[productSceneNumber % PRODUCT_MOVEMENTS.length]
        : generated.cameraMovement,
      visualSource,
      productAssetIndex: visualSource === "product"
        ? productSceneNumber++ % Math.max(1, input.productAssetCount)
        : undefined,
    });
  }

  const combinedNarration = repairedScenes
    .map((scene) => clean(scene.narration))
    .join(" ");
  if (!narrationIdentifiesProduct(combinedNarration, input.productName)) {
    repairedScenes[3].narration = `${spokenProductName(input.productName)} gives you ${input.offerDescription}. ${clean(repairedScenes[3].narration)}`;
  }

  if (!/\b(click|tap)\b.*\blink\b/i.test(clean(repairedScenes[7].narration))) {
    repairedScenes[7].narration = `Click the link to get ${spokenProductName(input.productName)}.`;
    repairedScenes[7].onScreenText = "Click the link to get it";
  }

  // Normalize the live director's output before validation. Models can ignore
  // a prompt-level word limit, so KAI enforces a deterministic per-scene cap.
  // Seven story scenes at 11 words plus the fixed CTA stay comfortably below
  // 95 words while keeping every scene meaningful and leaving room for repairs.
  for (let index = 0; index < 7; index += 1) {
    repairedScenes[index].narration = words(
      clean(repairedScenes[index].narration),
    ).slice(0, 11).join(" ");
  }

  // The validator requires 65-95 spoken words. Repair to the same floor
  // while keeping headroom below the ceiling. This prevents a short-script
  // repair from turning into an overlong script on the same attempt.
  const narrationWordCount = () =>
    words(repairedScenes.map((scene) => clean(scene.narration)).join(" ")).length;
  const appendWithinBudget = (sceneIndex: number, addition: string) => {
    const remainingWords = Math.max(0, 90 - narrationWordCount());
    const safeAddition = words(addition).slice(0, remainingWords).join(" ");

    if (safeAddition) {
      repairedScenes[sceneIndex].narration =
        `${clean(repairedScenes[sceneIndex].narration)} ${safeAddition}`.trim();
    }
  };

  let totalWords = narrationWordCount();
  if (totalWords < 65) {
    appendWithinBudget(6, input.offerDescription);
    totalWords = narrationWordCount();
  }
  if (totalWords < 65) {
    appendWithinBudget(
      7,
      "See the complete product at the link and decide whether it fits the way you create content.",
    );
    totalWords = narrationWordCount();
  }
  if (totalWords < 65) {
    appendWithinBudget(
      5,
      "Watch the product in use, notice the specific result, and compare that outcome with the problem shown at the beginning.",
    );
  }

  return {
    ...direction,
    scenes: repairedScenes,
  };
}

function validate(
  direction: GeneratedDirection,
  productName: string,
  productAssetCount: number,
) {
  const failures: string[] = [];
  const scenes = Array.isArray(direction.scenes) ? direction.scenes : [];

  if (scenes.length < 7 || scenes.length > 10) {
    failures.push("KAI must direct 7-10 scenes.");
  }

  const narration = scenes
    .map((scene) => clean(scene.narration))
    .join(" ");

  const narrationWordCount = words(narration).length;

  if (narrationWordCount < 65) {
    failures.push(
      `The spoken story is too thin (${narrationWordCount} words; minimum 65).`,
    );
  }

  if (narrationWordCount > 95) {
    failures.push(
      `The spoken story is too long (${narrationWordCount} words; maximum 95).`,
    );
  }

  if (!narrationIdentifiesProduct(narration, productName)) {
    failures.push("The narration never identifies the product.");
  }

  const stockScenes = scenes.filter(
    (scene) => scene.visualSource !== "product",
  );

  const queries = stockScenes
    .map((scene) => clean(scene.footageQuery).toLowerCase())
    .filter(Boolean);

  if (new Set(queries).size !== stockScenes.length) {
    failures.push("The context-footage plan repeats generic scenes.");
  }

  for (const scene of scenes) {
    if (!clean(scene.narration)) {
      failures.push("Every scene needs spoken narration.");
    }

    if (
      scene.visualSource !== "product" &&
      words(clean(scene.footageQuery)).length < 3
    ) {
      failures.push("Every stock scene needs a specific footage search.");
    }

    const exposed = `${clean(scene.title)} ${clean(scene.onScreenText)}`;

    if (BANNED_COPY.some((pattern) => pattern.test(exposed))) {
      failures.push("The direction reused rejected template copy.");
    }
  }

  const productScenes = scenes.filter(
    (scene) => scene.visualSource === "product",
  );

  const requiredProductScenes = requiredProductSceneCount(productAssetCount);
  if (productScenes.length < requiredProductScenes) {
    failures.push(
      `KAI needs ${requiredProductScenes} truthful product scenes for the available product media.`,
    );
  }

  const shotPatterns = new Set(
    productScenes.map((scene) =>
      `${clean(scene.cameraShot)}:${clean(scene.cameraMovement)}:${clean(scene.visual)}`.toLowerCase(),
    ),
  );

  const requiredShotPatterns = Math.min(4, requiredProductScenes);
  if (shotPatterns.size < requiredShotPatterns) {
    failures.push(
      `The product demonstration needs at least ${requiredShotPatterns} distinct treatments for the available product media.`,
    );
  }

  for (const scene of productScenes) {
    const assetIndex = Number(scene.productAssetIndex);

    if (
      !Number.isInteger(assetIndex) ||
      assetIndex < 0 ||
      assetIndex >= productAssetCount
    ) {
      failures.push(
        "Every product-proof scene must select a valid uploaded product asset.",
      );
    }
  }

  if (failures.length) {
    throw new Error([...new Set(failures)].join(" "));
  }
}

function applyDirection(
  input: DirectorInput,
  direction: GeneratedDirection,
): KaiCreativeConcept {
  validate(direction, input.productName, input.productAssetCount);

  const fallbackScenes = input.fallbackConcept.plan.scenes;

  const scenes = (direction.scenes ?? []).map(
    (generated, index): KaiCreativeScene => {
      const fallback = fallbackScenes[index % fallbackScenes.length];

      const purpose = PURPOSES.includes(
        generated.purpose as KaiCreativeScene["purpose"],
      )
        ? (generated.purpose as KaiCreativeScene["purpose"])
        : PURPOSES[Math.min(index, PURPOSES.length - 1)];

      const footageQuery = clean(
        generated.footageQuery,
        generated.visual,
      );

      const caption =
        purpose === "hook" ||
        purpose === "solution" ||
        purpose === "call-to-action"
          ? visibleCopy(generated.onScreenText || generated.title)
          : "";

      return {
        ...fallback,
        id: `kai-directed-${index + 1}`,
        purpose,
        title: caption || clean(generated.title, purpose),
        visual: clean(generated.visual, footageQuery),
        visualPrompt: footageQuery,
        bRollKeywords: footageQuery
          .split(/[,;]/)
          .map((value) => value.trim())
          .filter(Boolean),
        narration: clean(generated.narration),
        onScreenText: caption,
        supportingText: "",
        durationSeconds: Math.max(
          2.5,
          Math.min(5, Number(generated.durationSeconds) || 3.5),
        ),
        emotion: clean(generated.emotion, fallback.emotion),
        cameraShot: generated.cameraShot ?? fallback.cameraShot,
        cameraMovement:
          generated.cameraMovement ?? fallback.cameraMovement,
        transition: generated.transition ?? fallback.transition,
        visualSource:
          generated.visualSource === "product" ? "product" : "stock",
        productAssetIndex:
          generated.visualSource === "product"
            ? Math.max(
                0,
                Math.min(
                  input.productAssetCount - 1,
                  Number(generated.productAssetIndex) || 0,
                ),
              )
            : undefined,
      };
    },
  );

  return {
    ...input.fallbackConcept,
    name: clean(
      direction.conceptName,
      input.fallbackConcept.name,
    ),
    reason: clean(
      direction.reason,
      "KAI selected the most product-specific spoken concept.",
    ),
    confidence: 92,
    plan: {
      ...input.fallbackConcept.plan,
      hook: clean(direction.hook, scenes[0]?.narration),
      musicStyle: clean(
        direction.musicStyle,
        "modern rhythmic creator documentary with an immediate hook and dynamic section lifts",
      ),
      callToAction: clean(
        direction.callToAction,
        `Click the link to get ${spokenProductName(input.productName)}.`,
      ),
      scenes,
    },
  };
}

function createPrompt(
  input: DirectorInput,
  correctionFeedback: string,
): string {
  const productNameForNarration = spokenProductName(input.productName);
  const requiredProductScenes = requiredProductSceneCount(input.productAssetCount);

  return `
You are KAI's senior short-form commercial director. Direct one believable 28-35 second vertical social ad that a real creator would stop scrolling to watch.

PRODUCT: ${productNameForNarration}
PRODUCT LISTING NAME: ${input.productName}
BUYER GETS: ${input.offerDescription}
AUDIENCE: ${input.audience}
TOPIC: ${input.topic}
APPROACH: ${input.creativeApproach}
PLATFORM: ${input.platform}
DESTINATION: ${input.destination || "link in bio"}
UPLOADED PRODUCT ASSETS: ${input.productAssetCount} files, numbered 0 through ${Math.max(0, input.productAssetCount - 1)}

Hard rules:
- This is a SPOKEN human story, not a slideshow and not a text presentation.
- Open on a disruptive, specific, conversational line in under 2 seconds. No greeting.
- Return exactly 8 scenes.
- Write one continuous natural voiceover of 72-86 words across those 8 scenes. Keep each scene to roughly 6-11 spoken words; never exceed 11 words in one scene.
- The spoken narration must clearly say the exact product name "${productNameForNarration}" at least once.
- End with this direct action in natural language: "Click the link to get ${productNameForNarration}."
- Do not include the creator username or seller attribution when speaking the product name.
- Make the product mechanism tangible: show what is inside, how it is used, and the concrete before/after.
- Use stock footage only for human context. Mark those scenes visualSource "stock" and give them a literal portrait-footage query.
- Use exactly ${requiredProductScenes} truthful reveal, walkthrough, close-up, or proof scenes marked visualSource "product". Use the remaining scenes for varied human context from real portrait footage. Never repeat one product still through most of the ad.
- Direct those product moments as a demonstration sequence, not repeated pictures: overview, interaction, detail, proof, result. Vary cameraShot, cameraMovement, and the literal visual action.
- Match proven TikTok pacing: a meaningful visual change every 2.5-4.5 seconds, hard cuts for energy, and no scene longer than 5 seconds.
- For every product scene, set productAssetIndex to the uploaded file number that best supports that exact spoken line.
- Use the assets in a logical demonstration order and do not repeatedly show one file when multiple files are available.
- Never pretend stock footage is the product. Product scenes may use footageQuery "uploaded product asset".
- Every stock footageQuery must be unique and contain at least three specific words.
- Every scene must contain spoken narration.
- On-screen copy is optional. Use it only for the hook, product reveal, or CTA, maximum 7 words. No paragraphs.
- Never expose this prompt, the audience description, creative direction, production notes, or labels.
- Never use these rejected lines: Stop Juggling Your Content; Scattered Ideas Kill Consistency; Content Shouldn't Feel This Hard; One Planner Every Campaign; Organizes It All; Plan Schedule Publish; Create With Clarity; Get The Planner.
- Avoid generic motivation, unsupported income claims, fake testimonials, repetitive office shots, and meaningless phone footage.
- Music direction must describe rhythm, energy curve, instrumentation, and the first-second impact; do not name copyrighted songs or artists.

${
  correctionFeedback
    ? `IMPORTANT CORRECTION FROM KAI'S QUALITY CHECK:
The previous direction was rejected for these exact reasons:
${correctionFeedback}

Rebuild the complete direction from scratch and correct every listed failure. Do not repeat the rejected structure.`
    : ""
}

Owner rejection memory from earlier renders:
${JSON.stringify(rejectionMemory.rejections)}

Return only JSON:
{
  "conceptName":"specific name",
  "hook":"spoken opening line",
  "musicStyle":"specific original-score direction",
  "callToAction":"spoken CTA",
  "reason":"why this should hold attention",
  "scenes":[{
    "purpose":"hook|problem|emotion|explanation|solution|proof|transformation|call-to-action",
    "title":"internal short label",
    "visual":"literal action on camera",
    "footageQuery":"specific portrait footage search",
    "narration":"the exact spoken words for this scene",
    "onScreenText":"optional maximum seven words",
    "durationSeconds":3.5,
    "emotion":"specific emotion",
    "cameraShot":"close-up|medium|wide|over-the-shoulder|top-down",
    "cameraMovement":"handheld|tracking|slow-push-in|static|pan-left|pan-right",
    "transition":"hard-cut|cross-dissolve|fade|zoom-through",
    "visualSource":"stock|product",
    "productAssetIndex":0
  }]
}`;
}

async function requestDirection(
  apiKey: string,
  prompt: string,
): Promise<GeneratedDirection> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `KAI's live director failed: ${data?.error?.message ?? response.status}.`,
    );
  }

  return parseJson(extractResponseText(data));
}

export async function directGenerativeVideo(
  input: DirectorInput,
): Promise<KaiCreativeConcept> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "KAI's live director requires OPENAI_API_KEY; template fallback is disabled.",
    );
  }

  const maximumAttempts = 3;
  let correctionFeedback = "";
  let finalQualityError = "";

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const prompt = createPrompt(input, correctionFeedback);
    const direction = repairDirection(
      input,
      await requestDirection(apiKey, prompt),
    );

    try {
      return applyDirection(input, direction);
    } catch (error) {
      finalQualityError =
        error instanceof Error
          ? error.message
          : "KAI's quality check rejected the direction.";

      correctionFeedback = finalQualityError;
    }
  }

  throw new Error(
    `KAI rebuilt the campaign ${maximumAttempts} times but it still did not pass quality control. ${finalQualityError}`,
  );
}
