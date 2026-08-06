import type {
  KaiCameraMovement,
  KaiCameraShot,
  KaiCreativeScene,
  KaiScenePurpose,
  KaiSceneTransition,
} from "./kaiCreativeDirector";

import type {
  KaiCreativeDecision,
  KaiPacingStyle,
  KaiVisualTreatment,
} from "./kaiCreativeDecisionEngine";

export type KaiLens =
  | "16mm"
  | "24mm"
  | "35mm"
  | "50mm"
  | "85mm"
  | "135mm";

export type KaiDepthOfField =
  | "deep"
  | "medium"
  | "shallow";

export type KaiTimeOfDay =
  | "pre-dawn"
  | "morning"
  | "midday"
  | "golden-hour"
  | "sunset"
  | "blue-hour"
  | "night";

export type KaiWeather =
  | "clear"
  | "overcast"
  | "light-rain"
  | "heavy-rain"
  | "fog"
  | "snow"
  | "storm";

export type KaiLightingStyle =
  | "natural"
  | "cinematic"
  | "motivated"
  | "commercial"
  | "documentary"
  | "volumetric"
  | "practical";

export type KaiComposition =
  | "rule-of-thirds"
  | "centered"
  | "leading-lines"
  | "symmetrical"
  | "negative-space"
  | "layered-depth";

export type KaiEmotionIntensity =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export type KaiCameraDirection = {
  shot: KaiCameraShot;
  movement: KaiCameraMovement;
  lens: KaiLens;
  height: string;
  distance: string;
  framing: string;
};

export type KaiCompositionDirection = {
  style: KaiComposition;
  foreground: string;
  midground: string;
  background: string;
  depthOfField: KaiDepthOfField;
};

export type KaiLightingDirection = {
  style: KaiLightingStyle;
  keyLight: string;
  fillLight: string;
  rimLight: string;
  practicalLights: string[];
};

export type KaiEnvironmentDirection = {
  location: string;
  atmosphere: string;
  weather: KaiWeather;
  timeOfDay: KaiTimeOfDay;
  environmentalStorytelling: string[];
};

export type KaiPerformanceDirection = {
  facialExpression: string;
  eyeDirection: string;
  bodyLanguage: string;
  movement: string;
};

export type KaiMotionDirection = {
  subjectMotion: string;
  cameraMotionReason: string;
  transition: KaiSceneTransition;
};

export type KaiSoundDirection = {
  ambience: string[];
  soundEffects: string[];
  musicCue: string;
};

export type KaiCaptionDirection = {
  emphasis: string;
  timing: string;
};

export type KaiPromptPackage = {
  imagePrompt: string;
  videoPrompt: string;
};

export type KaiSceneQuality = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

export type KaiProductionBlueprint = {
  sceneId: string;
  sceneTitle: string;
  purpose: KaiScenePurpose;

  storyReason: string;
  viewerShouldFeel: string;
  viewerShouldUnderstand: string;

  camera: KaiCameraDirection;
  composition: KaiCompositionDirection;
  lighting: KaiLightingDirection;
  environment: KaiEnvironmentDirection;
  performance: KaiPerformanceDirection;
  motion: KaiMotionDirection;
  sound: KaiSoundDirection;
  captions: KaiCaptionDirection;

  prompt: KaiPromptPackage;
  quality: KaiSceneQuality;
};

export type KaiDirectorNotes = {
  continuityWarnings: string[];
  editorNotes: string[];
  rendererNotes: string[];
  storytellingNotes: string[];
};

export type KaiContinuityState = {
  previousSceneId?: string;
  previousLocation?: string;
  previousTimeOfDay?: KaiTimeOfDay;
  previousWeather?: KaiWeather;
  previousLightingStyle?: KaiLightingStyle;
  previousCameraShot?: KaiCameraShot;
  previousLens?: KaiLens;
  previousColorMood?: string;
  previousBackgroundStyle?: string;
};

export type KaiSceneReview = {
  blueprint: KaiProductionBlueprint;
  notes: KaiDirectorNotes;
  continuityState: KaiContinuityState;
};

export type CreateSceneBlueprintInput = {
  scene: KaiCreativeScene;
  creativeDecision?: KaiCreativeDecision;
};

function clean(value?: string): string {
  return value?.trim() ?? "";
}

function normalize(value?: string): string {
  return clean(value).toLowerCase();
}

function sentence(value: string): string {
  const trimmed = clean(value);

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed)
    ? trimmed
    : `${trimmed}.`;
}

function joinPromptParts(
  parts: Array<string | undefined>,
): string {
  return parts
    .map((part) => clean(part))
    .filter(Boolean)
    .map(sentence)
    .join(" ");
}

function clampScore(value: number): number {
  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function chooseLens(
  purpose: KaiScenePurpose,
): KaiLens {
  switch (purpose) {
    case "hook":
      return "35mm";

    case "problem":
      return "50mm";

    case "emotion":
      return "85mm";

    case "explanation":
      return "35mm";

    case "solution":
      return "24mm";

    case "proof":
      return "50mm";

    case "transformation":
      return "35mm";

    case "call-to-action":
      return "24mm";
  }
}

function chooseComposition(
  purpose: KaiScenePurpose,
): KaiComposition {
  switch (purpose) {
    case "hook":
      return "centered";

    case "problem":
      return "negative-space";

    case "emotion":
      return "rule-of-thirds";

    case "explanation":
      return "leading-lines";

    case "solution":
      return "layered-depth";

    case "proof":
      return "symmetrical";

    case "transformation":
      return "layered-depth";

    case "call-to-action":
      return "centered";
  }
}

function chooseDepthOfField(
  purpose: KaiScenePurpose,
): KaiDepthOfField {
  switch (purpose) {
    case "emotion":
      return "shallow";

    case "proof":
    case "explanation":
      return "deep";

    default:
      return "medium";
  }
}

function chooseLightingStyle(
  scene: KaiCreativeScene,
  visualTreatment?: KaiVisualTreatment,
): KaiLightingStyle {
  const searchable = normalize(
    [
      scene.lighting,
      scene.colorMood,
      visualTreatment,
    ].join(" "),
  );

  if (
    searchable.includes("documentary") ||
    searchable.includes("raw") ||
    searchable.includes("authentic")
  ) {
    return "documentary";
  }

  if (
    searchable.includes("commercial") ||
    searchable.includes("premium") ||
    searchable.includes("luxury")
  ) {
    return "commercial";
  }

  if (
    searchable.includes("volumetric") ||
    searchable.includes("futuristic") ||
    searchable.includes("three-dimensional")
  ) {
    return "volumetric";
  }

  if (
    searchable.includes("natural") ||
    searchable.includes("warm-lifestyle")
  ) {
    return "natural";
  }

  if (
    searchable.includes("practical") ||
    searchable.includes("lamp") ||
    searchable.includes("screen light")
  ) {
    return "practical";
  }

  if (
    searchable.includes("motivated") ||
    searchable.includes("gold") ||
    searchable.includes("sunset")
  ) {
    return "motivated";
  }

  return "cinematic";
}

function chooseTimeOfDay(
  scene: KaiCreativeScene,
): KaiTimeOfDay {
  const searchable = normalize(
    [
      scene.visual,
      scene.visualPrompt,
      scene.lighting,
      scene.colorMood,
      scene.backgroundStyle,
    ].join(" "),
  );

  if (
    searchable.includes("pre-dawn") ||
    searchable.includes("before sunrise")
  ) {
    return "pre-dawn";
  }

  if (
    searchable.includes("morning") ||
    searchable.includes("sunrise")
  ) {
    return "morning";
  }

  if (
    searchable.includes("midday") ||
    searchable.includes("noon")
  ) {
    return "midday";
  }

  if (
    searchable.includes("golden hour") ||
    searchable.includes("golden-hour")
  ) {
    return "golden-hour";
  }

  if (searchable.includes("sunset")) {
    return "sunset";
  }

  if (
    searchable.includes("blue hour") ||
    searchable.includes("blue-hour")
  ) {
    return "blue-hour";
  }

  if (
    searchable.includes("night") ||
    searchable.includes("dark room")
  ) {
    return "night";
  }

  return "golden-hour";
}

function chooseWeather(
  scene: KaiCreativeScene,
): KaiWeather {
  const searchable = normalize(
    [
      scene.visual,
      scene.visualPrompt,
      scene.backgroundStyle,
      scene.colorMood,
    ].join(" "),
  );

  if (searchable.includes("storm")) {
    return "storm";
  }

  if (
    searchable.includes("heavy rain") ||
    searchable.includes("downpour")
  ) {
    return "heavy-rain";
  }

  if (
    searchable.includes("rain") ||
    searchable.includes("drizzle")
  ) {
    return "light-rain";
  }

  if (
    searchable.includes("fog") ||
    searchable.includes("mist")
  ) {
    return "fog";
  }

  if (searchable.includes("snow")) {
    return "snow";
  }

  if (
    searchable.includes("overcast") ||
    searchable.includes("cloudy")
  ) {
    return "overcast";
  }

  return "clear";
}

function emotionIntensity(
  purpose: KaiScenePurpose,
): KaiEmotionIntensity {
  switch (purpose) {
    case "hook":
      return 8;

    case "problem":
      return 7;

    case "emotion":
      return 10;

    case "explanation":
      return 4;

    case "solution":
      return 7;

    case "proof":
      return 6;

    case "transformation":
      return 9;

    case "call-to-action":
      return 8;
  }
}

function pacingDirection(
  pacing?: KaiPacingStyle,
): string {
  switch (pacing) {
    case "slow-cinematic":
      return "Use slow, deliberate camera movement that gives emotional moments time to register.";

    case "steady-emotional":
      return "Use restrained movement with gradual visual progression and emotionally motivated holds.";

    case "fast-social":
      return "Use immediate visual movement and frequent meaningful changes without creating confusion.";

    case "rapid-montage":
      return "Use precise, energetic motion designed for fast cuts and strong visual contrast.";

    case "balanced":
    default:
      return "Use controlled movement that supports clarity, emotion, and forward momentum.";
  }
}

function buildStoryReason(
  scene: KaiCreativeScene,
): string {
  const narration = clean(scene.narration);
  const onScreenText = clean(scene.onScreenText);

  if (narration) {
    return `Advance the ${scene.purpose} stage of the story by visually supporting this narration: ${narration}`;
  }

  if (onScreenText) {
    return `Advance the ${scene.purpose} stage of the story and reinforce this message: ${onScreenText}`;
  }

  return `Advance the story through a clear ${scene.purpose} moment that earns the next scene.`;
}

function buildViewerEmotion(
  scene: KaiCreativeScene,
): string {
  const intensity = emotionIntensity(
    scene.purpose,
  );

  const emotion =
    clean(scene.emotion) ||
    {
      hook: "curiosity",
      problem: "recognition and frustration",
      emotion: "deep emotional connection",
      explanation: "clarity",
      solution: "hope",
      proof: "trust",
      transformation: "inspiration",
      "call-to-action": "readiness",
    }[scene.purpose];

  return `${emotion} at an intensity of ${intensity}/10`;
}

function buildViewerUnderstanding(
  scene: KaiCreativeScene,
): string {
  return (
    clean(scene.onScreenText) ||
    clean(scene.supportingText) ||
    clean(scene.narration) ||
    `The viewer should understand why this ${scene.purpose} moment matters.`
  );
}

function buildCamera(
  scene: KaiCreativeScene,
): KaiCameraDirection {
  const lens = chooseLens(scene.purpose);

  const height =
    scene.cameraShot === "low-angle"
      ? "Below eye level to increase presence and perceived power."
      : scene.cameraShot === "top-down"
        ? "Directly above the subject to create clarity, vulnerability, or visual organization."
        : "At natural eye level unless the scene's visual action requires another position.";

  const distance =
    scene.cameraShot === "extreme-wide"
      ? "Far enough away to establish scale and environment."
      : scene.cameraShot === "wide"
        ? "Wide enough to show the subject's full relationship with the environment."
        : scene.cameraShot === "close-up"
          ? "Close enough to prioritize expression and small physical details."
          : scene.cameraShot === "extreme-close-up"
            ? "Extremely close to isolate one emotionally important detail."
            : "A controlled medium distance that preserves context while emphasizing the subject.";

  return {
    shot: scene.cameraShot,
    movement: scene.cameraMovement,
    lens,
    height,
    distance,
    framing:
      "Place the primary subject at the strongest visual focal point and remove anything that competes with the story.",
  };
}

function buildComposition(
  scene: KaiCreativeScene,
): KaiCompositionDirection {
  return {
    style: chooseComposition(scene.purpose),
    foreground:
      "Use one restrained foreground element to create depth or frame the subject without blocking important action.",
    midground:
      clean(scene.visual) ||
      "Place the primary subject and meaningful action in the midground.",
    background:
      clean(scene.backgroundStyle) ||
      "Use a believable background that supports the story without becoming visually distracting.",
    depthOfField: chooseDepthOfField(
      scene.purpose,
    ),
  };
}

function buildLighting(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
): KaiLightingDirection {
  const style = chooseLightingStyle(
    scene,
    creativeDecision?.visualTreatment,
  );

  return {
    style,
    keyLight:
      clean(scene.lighting) ||
      "Use one clearly motivated key light that establishes shape, direction, and emotional tone.",
    fillLight:
      scene.purpose === "emotion"
        ? "Keep fill restrained so facial shape and emotional contrast remain visible."
        : "Use soft fill to preserve detail without flattening the image.",
    rimLight:
      "Use subtle separation light only when needed to distinguish the subject from the background.",
    practicalLights: [
      "Include practical light sources only when they naturally belong in the environment.",
    ],
  };
}

function buildEnvironment(
  scene: KaiCreativeScene,
): KaiEnvironmentDirection {
  return {
    location:
      clean(scene.backgroundStyle) ||
      "A story-relevant location that feels specific, believable, and connected to the subject.",
    atmosphere:
      [
        clean(scene.emotion),
        clean(scene.colorMood),
      ]
        .filter(Boolean)
        .join(" with ") ||
      "An atmosphere that supports the scene's emotional purpose.",
    weather: chooseWeather(scene),
    timeOfDay: chooseTimeOfDay(scene),
    environmentalStorytelling: [
      "Every visible object should reveal something about the subject, problem, business, or emotional moment.",
      "Avoid decorative clutter that does not strengthen meaning.",
      "Preserve a consistent physical world across adjacent scenes.",
    ],
  };
}

function buildPerformance(
  scene: KaiCreativeScene,
): KaiPerformanceDirection {
  switch (scene.purpose) {
    case "hook":
      return {
        facialExpression:
          "Immediate, readable curiosity, urgency, or confidence without exaggerated acting.",
        eyeDirection:
          "Direct attention toward the strongest focal point or toward the viewer when appropriate.",
        bodyLanguage:
          "Purposeful posture with visible intention from the first frame.",
        movement:
          "Begin with meaningful action rather than waiting for the scene to start.",
      };

    case "problem":
      return {
        facialExpression:
          "Controlled frustration, pressure, concern, or fatigue that feels believable.",
        eyeDirection:
          "Focus on the source or consequence of the problem.",
        bodyLanguage:
          "Slight tension in posture and restrained movement.",
        movement:
          "Use repetitive, interrupted, or burdened action to make the problem visible.",
      };

    case "emotion":
      return {
        facialExpression:
          clean(scene.emotion) ||
          "Honest emotion expressed through subtle facial detail.",
        eyeDirection:
          "Use intentional eye focus and brief natural shifts rather than constant direct eye contact.",
        bodyLanguage:
          "Open, vulnerable, and physically believable.",
        movement:
          "Slow, deliberate movement that gives the emotional moment time to register.",
      };

    case "explanation":
      return {
        facialExpression:
          "Calm confidence and clarity.",
        eyeDirection:
          "Follow the object, interface, demonstration, or idea being explained.",
        bodyLanguage:
          "Controlled and easy to understand.",
        movement:
          "Synchronize gestures and actions with each explanatory beat.",
      };

    case "solution":
      return {
        facialExpression:
          "Visible relief, confidence, and possibility.",
        eyeDirection:
          "Shift attention toward the solution or improved outcome.",
        bodyLanguage:
          "More open posture than the problem scene.",
        movement:
          "Use smoother and more decisive movement to signal progress.",
      };

    case "proof":
      return {
        facialExpression:
          "Natural confidence without exaggerated celebration.",
        eyeDirection:
          "Direct attention toward the evidence.",
        bodyLanguage:
          "Stable and grounded.",
        movement:
          "Keep movement restrained so the proof remains easy to examine.",
      };

    case "transformation":
      return {
        facialExpression:
          "Believable satisfaction, confidence, or renewed energy.",
        eyeDirection:
          "Look toward the changed result or future possibility.",
        bodyLanguage:
          "Open, energized, and visibly different from the earlier struggle.",
        movement:
          "Use fluid forward movement that makes the transformation feel active.",
      };

    case "call-to-action":
      return {
        facialExpression:
          "Clear, confident, and inviting.",
        eyeDirection:
          "Direct attention toward the viewer or the exact next action.",
        bodyLanguage:
          "Steady posture with no distracting movement.",
        movement:
          "Finish with one simple action or hold that gives the viewer time to respond.",
      };
  }
}

function buildMotion(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
): KaiMotionDirection {
  return {
    subjectMotion:
      "Use physically believable motion that supports the visual purpose and remains consistent throughout the shot.",
    cameraMotionReason:
      pacingDirection(
        creativeDecision?.pacing,
      ),
    transition: scene.transition,
  };
}

function buildSound(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
): KaiSoundDirection {
  const suppliedSound =
    scene.soundDesign?.filter(Boolean) ?? [];

  return {
    ambience:
      suppliedSound.length > 0
        ? suppliedSound
        : [
            "Use subtle environmental ambience that makes the location feel real.",
          ],
    soundEffects: [
      "Add only story-motivated sound effects that reinforce visible action or transitions.",
    ],
    musicCue:
      creativeDecision?.music.style ||
      "Use music that supports the emotional arc without competing with narration.",
  };
}

function buildCaptions(
  scene: KaiCreativeScene,
): KaiCaptionDirection {
  const timingMap: Record<
    KaiScenePurpose,
    string
  > = {
    hook:
      "Display the strongest phrase within the first 0.3 seconds.",
    problem:
      "Reveal short phrases as the visible problem becomes recognizable.",
    emotion:
      "Allow the performance to register before introducing text.",
    explanation:
      "Synchronize each phrase with the exact idea or action being explained.",
    solution:
      "Introduce text when the visual shift toward relief or possibility begins.",
    proof:
      "Display the strongest factual or visible evidence at the moment it appears.",
    transformation:
      "Reveal the message at the emotional and visual peak.",
    "call-to-action":
      "Keep the next action clearly visible through the final moment.",
  };

  return {
    emphasis:
      clean(scene.onScreenText) ||
      clean(scene.supportingText) ||
      "Emphasize the single most important viewer takeaway.",
    timing: timingMap[scene.purpose],
  };
}

type KaiBlueprintWithoutOutput = Omit<
  KaiProductionBlueprint,
  "prompt" | "quality"
>;

function buildImagePrompt(
  scene: KaiCreativeScene,
  blueprint: KaiBlueprintWithoutOutput,
  creativeDecision?: KaiCreativeDecision,
): string {
  return joinPromptParts([
    `Create a polished cinematic still for a ${scene.purpose} scene`,
    `Scene title: ${scene.title}`,
    `Story purpose: ${blueprint.storyReason}`,
    `Primary visual: ${scene.visualPrompt || scene.visual}`,
    `Viewer emotion: ${blueprint.viewerShouldFeel}`,
    `Location: ${blueprint.environment.location}`,
    `Atmosphere: ${blueprint.environment.atmosphere}`,
    `Time of day: ${blueprint.environment.timeOfDay}`,
    `Weather: ${blueprint.environment.weather}`,
    `Camera shot: ${blueprint.camera.shot}`,
    `Lens: ${blueprint.camera.lens}`,
    `Camera height: ${blueprint.camera.height}`,
    `Camera distance: ${blueprint.camera.distance}`,
    `Framing: ${blueprint.camera.framing}`,
    `Composition: ${blueprint.composition.style}`,
    `Foreground: ${blueprint.composition.foreground}`,
    `Midground: ${blueprint.composition.midground}`,
    `Background: ${blueprint.composition.background}`,
    `Depth of field: ${blueprint.composition.depthOfField}`,
    `Lighting treatment: ${blueprint.lighting.style}`,
    `Key light: ${blueprint.lighting.keyLight}`,
    `Fill light: ${blueprint.lighting.fillLight}`,
    `Rim light: ${blueprint.lighting.rimLight}`,
    `Color mood: ${scene.colorMood}`,
    `Performance: ${blueprint.performance.facialExpression}, ${blueprint.performance.bodyLanguage}`,
    `Visual treatment: ${creativeDecision?.visualTreatment || "cinematic-realism"}`,
    scene.useThreeDimensionalElements
      ? `Three-dimensional direction: ${
          scene.threeDimensionalDirection ||
          creativeDecision?.threeDimensionalDirection ||
          "Use dimensional depth only when it clarifies the story."
        }`
      : undefined,
    "Use natural proportions, believable materials, coherent lighting, realistic spatial depth, and a strong focal hierarchy",
    "No logos, no watermarks, no unreadable text, no duplicated subjects, no distorted anatomy, and no unnecessary visual clutter",
  ]);
}

function buildVideoPrompt(
  scene: KaiCreativeScene,
  blueprint: KaiBlueprintWithoutOutput,
  creativeDecision?: KaiCreativeDecision,
): string {
  return joinPromptParts([
    `Create a cinematic video scene serving the ${scene.purpose} stage of the story`,
    `Scene title: ${scene.title}`,
    `Narrative reason: ${blueprint.storyReason}`,
    `The viewer should feel: ${blueprint.viewerShouldFeel}`,
    `The viewer should understand: ${blueprint.viewerShouldUnderstand}`,
    `Opening visual: ${scene.visualPrompt || scene.visual}`,
    `Location: ${blueprint.environment.location}`,
    `Atmosphere: ${blueprint.environment.atmosphere}`,
    `Time of day: ${blueprint.environment.timeOfDay}`,
    `Weather: ${blueprint.environment.weather}`,
    `Begin with a ${blueprint.camera.shot} using a ${blueprint.camera.lens} lens`,
    `Camera placement: ${blueprint.camera.height}`,
    `Camera distance: ${blueprint.camera.distance}`,
    `Camera movement: ${blueprint.camera.movement}`,
    `Reason for movement: ${blueprint.motion.cameraMotionReason}`,
    `Subject motion: ${blueprint.motion.subjectMotion}`,
    `Performance direction: ${blueprint.performance.facialExpression}, ${blueprint.performance.bodyLanguage}, ${blueprint.performance.movement}`,
    `Eye direction: ${blueprint.performance.eyeDirection}`,
    `Composition: ${blueprint.composition.style}`,
    `Foreground: ${blueprint.composition.foreground}`,
    `Midground: ${blueprint.composition.midground}`,
    `Background: ${blueprint.composition.background}`,
    `Depth of field: ${blueprint.composition.depthOfField}`,
    `Lighting style: ${blueprint.lighting.style}`,
    `Key light: ${blueprint.lighting.keyLight}`,
    `Fill light: ${blueprint.lighting.fillLight}`,
    `Rim light: ${blueprint.lighting.rimLight}`,
    `Color mood: ${scene.colorMood}`,
    `Music direction: ${
      creativeDecision?.music.emotionalProgression ||
      blueprint.sound.musicCue
    }`,
    `Transition out: ${blueprint.motion.transition}`,
    scene.useThreeDimensionalElements
      ? `Three-dimensional direction: ${
          scene.threeDimensionalDirection ||
          creativeDecision?.threeDimensionalDirection ||
          "Use spatial depth and dimensional movement only when it supports meaning."
        }`
      : undefined,
    "Motion must remain physically believable, visually coherent, stable, and intentional",
    "Maintain subject identity, wardrobe, environment, lighting direction, color treatment, and spatial continuity throughout the shot",
    "No flicker, no warping, no sudden object changes, no duplicated subjects, no camera teleportation, and no unreadable text",
  ]);
}

function evaluateSceneQuality(
  scene: KaiCreativeScene,
  blueprint: KaiBlueprintWithoutOutput,
): KaiSceneQuality {
  let score = 50;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (clean(scene.title).length >= 3) {
    score += 3;
  }

  if (clean(scene.visual).length >= 30) {
    score += 8;
    strengths.push(
      "The primary visual contains enough detail to guide production.",
    );
  } else {
    weaknesses.push(
      "The primary visual may be too broad to guarantee a specific result.",
    );
    recommendations.push(
      "Describe the subject, action, environment, and focal point more clearly.",
    );
  }

  if (
    clean(scene.visualPrompt).length >= 40
  ) {
    score += 8;
    strengths.push(
      "The visual prompt provides useful production detail.",
    );
  } else {
    weaknesses.push(
      "The visual prompt could provide more precise production direction.",
    );
    recommendations.push(
      "Add camera, subject, environment, lighting, and action details.",
    );
  }

  if (
    clean(scene.onScreenText).length >= 5
  ) {
    score += 5;
    strengths.push(
      "The scene contains a defined on-screen message.",
    );
  }

  if (clean(scene.narration).length >= 15) {
    score += 6;
    strengths.push(
      "The narration gives the scene a clear narrative role.",
    );
  } else if (
    !clean(scene.onScreenText) &&
    !clean(scene.supportingText)
  ) {
    weaknesses.push(
      "The viewer takeaway is underdeveloped.",
    );
    recommendations.push(
      "Add narration, on-screen text, or supporting text that defines the scene's meaning.",
    );
  }

  if (clean(scene.emotion)) {
    score += 5;
    strengths.push(
      "The emotional target is explicitly defined.",
    );
  }

  if (clean(scene.lighting)) {
    score += 4;
    strengths.push(
      "The lighting direction supports intentional production.",
    );
  }

  if (clean(scene.colorMood)) {
    score += 4;
    strengths.push(
      "The color mood helps preserve a consistent visual identity.",
    );
  }

  if (clean(scene.backgroundStyle)) {
    score += 4;
    strengths.push(
      "The environment has a defined visual direction.",
    );
  }

  if (scene.durationSeconds > 0) {
    score += 3;
  } else {
    weaknesses.push(
      "The scene duration is invalid.",
    );
    recommendations.push(
      "Assign a duration greater than zero seconds.",
    );
  }

  if (scene.bRollKeywords.length > 0) {
    score += 3;
    strengths.push(
      "B-roll keywords provide useful supporting visual options.",
    );
  }

  if (
    blueprint.viewerShouldFeel &&
    blueprint.viewerShouldUnderstand
  ) {
    score += 5;
    strengths.push(
      "The scene balances emotional intent with viewer understanding.",
    );
  }

  if (
    scene.purpose === "emotion" &&
    blueprint.composition.depthOfField !==
      "shallow"
  ) {
    score -= 4;
    weaknesses.push(
      "The emotional subject may not be visually isolated enough.",
    );
    recommendations.push(
      "Use shallow depth of field to concentrate attention on the performance.",
    );
  }

  if (
    scene.purpose === "hook" &&
    scene.cameraMovement === "static"
  ) {
    score -= 3;
    weaknesses.push(
      "A static opening may lack immediate visual energy.",
    );
    recommendations.push(
      "Use subject action, a reveal, or subtle camera motion during the opening beat.",
    );
  }

  if (weaknesses.length === 0) {
    strengths.push(
      "No major structural production weakness was detected.",
    );
  }

  return {
    score: clampScore(score),
    strengths,
    weaknesses,
    recommendations,
  };
}

function createBaseBlueprint(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
): KaiBlueprintWithoutOutput {
  return {
    sceneId: scene.id,
    sceneTitle: scene.title,
    purpose: scene.purpose,

    storyReason: buildStoryReason(scene),
    viewerShouldFeel:
      buildViewerEmotion(scene),
    viewerShouldUnderstand:
      buildViewerUnderstanding(scene),

    camera: buildCamera(scene),
    composition: buildComposition(scene),
    lighting: buildLighting(
      scene,
      creativeDecision,
    ),
    environment: buildEnvironment(scene),
    performance: buildPerformance(scene),
    motion: buildMotion(
      scene,
      creativeDecision,
    ),
    sound: buildSound(
      scene,
      creativeDecision,
    ),
    captions: buildCaptions(scene),
  };
}

export function createSceneBlueprint(
  input: CreateSceneBlueprintInput,
): KaiProductionBlueprint;

export function createSceneBlueprint(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
): KaiProductionBlueprint;

export function createSceneBlueprint(
  inputOrScene:
    | CreateSceneBlueprintInput
    | KaiCreativeScene,
  optionalDecision?: KaiCreativeDecision,
): KaiProductionBlueprint {
  const scene =
    "scene" in inputOrScene
      ? inputOrScene.scene
      : inputOrScene;

  const creativeDecision =
    "scene" in inputOrScene
      ? inputOrScene.creativeDecision
      : optionalDecision;

  const baseBlueprint =
    createBaseBlueprint(
      scene,
      creativeDecision,
    );

  const prompt: KaiPromptPackage = {
    imagePrompt: buildImagePrompt(
      scene,
      baseBlueprint,
      creativeDecision,
    ),
    videoPrompt: buildVideoPrompt(
      scene,
      baseBlueprint,
      creativeDecision,
    ),
  };

  const quality = evaluateSceneQuality(
    scene,
    baseBlueprint,
  );

  return {
    ...baseBlueprint,
    prompt,
    quality,
  };
}

function analyzeContinuity(
  current: KaiProductionBlueprint,
  previous?: KaiContinuityState,
): string[] {
  if (!previous) {
    return [];
  }

  const warnings: string[] = [];

  if (
    previous.previousLocation &&
    previous.previousLocation !==
      current.environment.location
  ) {
    warnings.push(
      "The location changes between scenes. Consider an establishing shot or motivated transition.",
    );
  }

  if (
    previous.previousTimeOfDay &&
    previous.previousTimeOfDay !==
      current.environment.timeOfDay
  ) {
    warnings.push(
      "The time of day changes between scenes. Make the passage of time visually clear.",
    );
  }

  if (
    previous.previousWeather &&
    previous.previousWeather !==
      current.environment.weather
  ) {
    warnings.push(
      "Weather changes between scenes. Confirm that the change is intentional.",
    );
  }

  if (
    previous.previousLightingStyle &&
    previous.previousLightingStyle !==
      current.lighting.style
  ) {
    warnings.push(
      "The lighting style changes noticeably. Preserve a shared color and contrast language unless the story requires a shift.",
    );
  }

  if (
    previous.previousLens &&
    previous.previousLens !==
      current.camera.lens &&
    current.purpose === "emotion"
  ) {
    warnings.push(
      "The lens changes before an emotional scene. Confirm that the new perspective strengthens rather than weakens continuity.",
    );
  }

  if (
    previous.previousCameraShot ===
      current.camera.shot &&
    previous.previousLens ===
      current.camera.lens
  ) {
    warnings.push(
      "The camera shot and lens repeat from the previous scene. Confirm that the repetition is intentional.",
    );
  }

  return warnings;
}

export function createContinuityState(
  blueprint: KaiProductionBlueprint,
): KaiContinuityState {
  return {
    previousSceneId: blueprint.sceneId,
    previousLocation:
      blueprint.environment.location,
    previousTimeOfDay:
      blueprint.environment.timeOfDay,
    previousWeather:
      blueprint.environment.weather,
    previousLightingStyle:
      blueprint.lighting.style,
    previousCameraShot:
      blueprint.camera.shot,
    previousLens:
      blueprint.camera.lens,
    previousColorMood:
      blueprint.environment.atmosphere,
    previousBackgroundStyle:
      blueprint.composition.background,
  };
}

function buildDirectorNotes(
  blueprint: KaiProductionBlueprint,
): KaiDirectorNotes {
  const notes: KaiDirectorNotes = {
    continuityWarnings: [],
    editorNotes: [],
    rendererNotes: [],
    storytellingNotes: [],
  };

  notes.editorNotes.push(
    "Keep cuts motivated by emotion, information, action, or visual transformation rather than elapsed time alone.",
  );

  notes.rendererNotes.push(
    "Preserve subject identity, wardrobe, physical proportions, environment, and lighting direction throughout the shot.",
  );

  notes.rendererNotes.push(
    "Reject flicker, warping, duplicated objects, unstable backgrounds, and unexplained changes between frames.",
  );

  notes.storytellingNotes.push(
    blueprint.storyReason,
  );

  notes.storytellingNotes.push(
    `The viewer should feel ${blueprint.viewerShouldFeel}.`,
  );

  notes.storytellingNotes.push(
    `The viewer should understand: ${blueprint.viewerShouldUnderstand}`,
  );

  switch (blueprint.purpose) {
    case "hook":
      notes.editorNotes.push(
        "Deliver a meaningful visual change or pattern interrupt immediately.",
      );
      break;

    case "emotion":
      notes.editorNotes.push(
        "Hold the shot long enough for the performance to register before cutting.",
      );
      break;

    case "proof":
      notes.editorNotes.push(
        "Keep the evidence visible long enough to be understood and verified.",
      );
      break;

    case "transformation":
      notes.editorNotes.push(
        "Make the contrast with the earlier condition visually unmistakable.",
      );
      break;

    case "call-to-action":
      notes.editorNotes.push(
        "Remove competing messages and preserve enough final hold time for action.",
      );
      break;

    default:
      break;
  }

  return notes;
}

export function reviewSceneBlueprint(
  blueprint: KaiProductionBlueprint,
  previous?: KaiContinuityState,
): KaiSceneReview {
  const notes =
    buildDirectorNotes(blueprint);

  notes.continuityWarnings.push(
    ...analyzeContinuity(
      blueprint,
      previous,
    ),
  );

  return {
    blueprint,
    notes,
    continuityState:
      createContinuityState(blueprint),
  };
}

export function createAndReviewScene(
  scene: KaiCreativeScene,
  creativeDecision?: KaiCreativeDecision,
  previous?: KaiContinuityState,
): KaiSceneReview {
  const blueprint =
    createSceneBlueprint(
      scene,
      creativeDecision,
    );

  return reviewSceneBlueprint(
    blueprint,
    previous,
  );
}

export function directSceneSequence(
  scenes: KaiCreativeScene[],
  creativeDecision?: KaiCreativeDecision,
): KaiSceneReview[] {
  const reviews: KaiSceneReview[] = [];
  let continuityState:
    | KaiContinuityState
    | undefined;

  for (const scene of scenes) {
    const review = createAndReviewScene(
      scene,
      creativeDecision,
      continuityState,
    );

    reviews.push(review);
    continuityState =
      review.continuityState;
  }

  return reviews;
}