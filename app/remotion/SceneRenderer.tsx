import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
} from "remotion";

import BrandLayer from "./BrandLayer";
import { VideoScene } from "./types";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

type SceneRendererProps = {
  scene: VideoScene;
  title: string;
  brand: string;
  localFrame: number;
  sceneDuration: number;
  sceneIndex: number;
  totalScenes: number;
  fps: number;
  width: number;
  height: number;
};

type CameraTransform = {
  scale: number;
  translateX: number;
  translateY: number;
  rotate: number;
};

type TextLayout = {
  justifyContent: React.CSSProperties["justifyContent"];
  alignItems: React.CSSProperties["alignItems"];
  textAlign: React.CSSProperties["textAlign"];
  padding: string;
  maxWidth: number;
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase().replace(/_/g, "-") ?? "";
}

function resolveSceneImageUrl(imageUrl?: string): string | null {
  const value = imageUrl?.trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const publicPath = value
    .replace(/\\/g, "/")
    .replace(/^\.\/public\//, "")
    .replace(/^public\//, "")
    .replace(/^\//, "");

  return staticFile(publicPath);
}

const resolveSceneVideoUrl = resolveSceneImageUrl;

function getCameraTransform({
  movement,
  shot,
  localFrame,
  sceneDuration,
}: {
  movement?: string;
  shot?: string;
  localFrame: number;
  sceneDuration: number;
}): CameraTransform {
  const normalizedMovement = normalizeValue(movement);
  const normalizedShot = normalizeValue(shot);

  let startingScale = 1.02;
  let endingScale = 1.08;
  let startingX = 0;
  let endingX = 0;
  let startingY = 0;
  let endingY = 0;
  let rotation = 0;

  if (
    normalizedShot.includes("close") ||
    normalizedShot.includes("detail")
  ) {
    startingScale = 1.1;
    endingScale = 1.18;
  }

  if (
    normalizedShot.includes("wide") ||
    normalizedShot.includes("establish")
  ) {
    startingScale = 1;
    endingScale = 1.05;
  }

  if (
    normalizedShot.includes("low-angle") ||
    normalizedShot.includes("low angle")
  ) {
    startingY = 22;
    endingY = -8;
  }

  if (
    normalizedShot.includes("high-angle") ||
    normalizedShot.includes("high angle")
  ) {
    startingY = -18;
    endingY = 8;
  }

  if (
    normalizedMovement.includes("pull-out") ||
    normalizedMovement.includes("pull out") ||
    normalizedMovement.includes("zoom-out") ||
    normalizedMovement.includes("zoom out")
  ) {
    startingScale = Math.max(startingScale, 1.14);
    endingScale = 1.02;
  }

  if (
    normalizedMovement.includes("push-in") ||
    normalizedMovement.includes("push in") ||
    normalizedMovement.includes("zoom-in") ||
    normalizedMovement.includes("zoom in")
  ) {
    endingScale = Math.max(endingScale, startingScale + 0.1);
  }

  if (
    normalizedMovement.includes("pan-left") ||
    normalizedMovement.includes("pan left")
  ) {
    startingX = 55;
    endingX = -55;
  }

  if (
    normalizedMovement.includes("pan-right") ||
    normalizedMovement.includes("pan right")
  ) {
    startingX = -55;
    endingX = 55;
  }

  if (
    normalizedMovement.includes("tilt-up") ||
    normalizedMovement.includes("tilt up")
  ) {
    startingY = 40;
    endingY = -35;
  }

  if (
    normalizedMovement.includes("tilt-down") ||
    normalizedMovement.includes("tilt down")
  ) {
    startingY = -35;
    endingY = 40;
  }

  if (
    normalizedMovement.includes("handheld") ||
    normalizedMovement.includes("shake")
  ) {
    startingScale = Math.max(startingScale, 1.07);

    const shakeX =
      Math.sin(localFrame * 0.83) * 6 +
      Math.sin(localFrame * 0.31) * 3;

    const shakeY =
      Math.cos(localFrame * 0.71) * 5 +
      Math.sin(localFrame * 0.24) * 2;

    rotation =
      Math.sin(localFrame * 0.18) * 0.35;

    return {
      scale: interpolate(
        localFrame,
        [0, sceneDuration],
        [startingScale, endingScale],
        clamp,
      ),
      translateX: shakeX,
      translateY: shakeY,
      rotate: rotation,
    };
  }

  return {
    scale: interpolate(
      localFrame,
      [0, sceneDuration],
      [startingScale, endingScale],
      clamp,
    ),

    translateX: interpolate(
      localFrame,
      [0, sceneDuration],
      [startingX, endingX],
      clamp,
    ),

    translateY: interpolate(
      localFrame,
      [0, sceneDuration],
      [startingY, endingY],
      clamp,
    ),

    rotate: rotation,
  };
}

function getTransitionOpacity({
  transition,
  localFrame,
  sceneDuration,
}: {
  transition?: string;
  localFrame: number;
  sceneDuration: number;
}) {
  const normalizedTransition = normalizeValue(transition);
  const transitionFrames = Math.min(
    18,
    Math.max(6, Math.floor(sceneDuration / 3)),
  );

  if (
    normalizedTransition.includes("cut") ||
    normalizedTransition.includes("none")
  ) {
    return interpolate(
      localFrame,
      [
        0,
        2,
        Math.max(2, sceneDuration - 2),
        sceneDuration,
      ],
      [0, 1, 1, 0],
      clamp,
    );
  }

  return interpolate(
    localFrame,
    [
      0,
      transitionFrames,
      Math.max(
        transitionFrames,
        sceneDuration - transitionFrames,
      ),
      sceneDuration,
    ],
    [0, 1, 1, 0],
    clamp,
  );
}

function getTransitionTransform({
  transition,
  localFrame,
  sceneDuration,
}: {
  transition?: string;
  localFrame: number;
  sceneDuration: number;
}) {
  const normalizedTransition = normalizeValue(transition);
  const transitionFrames = Math.min(
    18,
    Math.max(6, Math.floor(sceneDuration / 3)),
  );

  if (normalizedTransition.includes("slide-left")) {
    return `translateX(${interpolate(
      localFrame,
      [0, transitionFrames],
      [130, 0],
      clamp,
    )}px)`;
  }

  if (normalizedTransition.includes("slide-right")) {
    return `translateX(${interpolate(
      localFrame,
      [0, transitionFrames],
      [-130, 0],
      clamp,
    )}px)`;
  }

  if (
    normalizedTransition.includes("zoom") ||
    normalizedTransition.includes("punch")
  ) {
    return `scale(${interpolate(
      localFrame,
      [0, transitionFrames],
      [1.18, 1],
      clamp,
    )})`;
  }

  return "none";
}

function getTextLayout({
  textPosition,
  width,
}: {
  textPosition?: string;
  width: number;
}): TextLayout {
  const normalizedPosition = normalizeValue(textPosition);

  if (
    normalizedPosition.includes("top") ||
    normalizedPosition.includes("upper")
  ) {
    return {
      justifyContent: "flex-start",
      alignItems: "flex-start",
      textAlign: "left",
      padding: "185px 76px 235px",
      maxWidth: width * 0.82,
    };
  }

  if (
    normalizedPosition.includes("lower-third") ||
    normalizedPosition.includes("lower third") ||
    normalizedPosition.includes("bottom")
  ) {
    return {
      justifyContent: "flex-end",
      alignItems: "flex-start",
      textAlign: "left",
      padding: "185px 76px 245px",
      maxWidth: width * 0.86,
    };
  }

  if (normalizedPosition.includes("center")) {
    return {
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "180px 76px 230px",
      maxWidth: width * 0.84,
    };
  }

  if (normalizedPosition.includes("right")) {
    return {
      justifyContent: "center",
      alignItems: "flex-end",
      textAlign: "right",
      padding: "180px 76px 230px",
      maxWidth: width * 0.76,
    };
  }

  return {
    justifyContent: "center",
    alignItems: "flex-start",
    textAlign: "left",
    padding: "180px 76px 230px",
    maxWidth: width * 0.86,
  };
}

function getAtmosphere(scene: VideoScene) {
  const combinedMood = [
    scene.emotion,
    scene.lighting,
    scene.colorMood,
    scene.backgroundStyle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combinedMood.includes("hope") ||
    combinedMood.includes("warm") ||
    combinedMood.includes("golden")
  ) {
    return {
      background:
        "linear-gradient(145deg, #26160D 0%, #130D0A 46%, #030303 100%)",
      glow:
        "radial-gradient(circle, rgba(255,180,85,0.26), rgba(255,135,45,0.06) 42%, transparent 70%)",
      accent: "rgba(255,204,128,0.96)",
      overlay:
        "linear-gradient(to bottom, rgba(255,155,55,0.08), transparent 36%, rgba(0,0,0,0.48))",
    };
  }

  if (
    combinedMood.includes("urgent") ||
    combinedMood.includes("danger") ||
    combinedMood.includes("intense")
  ) {
    return {
      background:
        "linear-gradient(145deg, #280707 0%, #110506 52%, #020202 100%)",
      glow:
        "radial-gradient(circle, rgba(255,48,48,0.22), rgba(130,0,0,0.05) 44%, transparent 72%)",
      accent: "rgba(255,112,112,0.98)",
      overlay:
        "linear-gradient(to bottom, rgba(140,0,0,0.16), transparent 38%, rgba(0,0,0,0.58))",
    };
  }

  if (
    combinedMood.includes("calm") ||
    combinedMood.includes("peace") ||
    combinedMood.includes("cool")
  ) {
    return {
      background:
        "linear-gradient(145deg, #081522 0%, #071019 50%, #010304 100%)",
      glow:
        "radial-gradient(circle, rgba(90,170,255,0.19), rgba(40,90,170,0.04) 45%, transparent 72%)",
      accent: "rgba(155,211,255,0.96)",
      overlay:
        "linear-gradient(to bottom, rgba(35,105,175,0.1), transparent 38%, rgba(0,0,0,0.52))",
    };
  }

  if (
    combinedMood.includes("success") ||
    combinedMood.includes("growth") ||
    combinedMood.includes("confident")
  ) {
    return {
      background:
        "linear-gradient(145deg, #0C2118 0%, #07120E 50%, #010302 100%)",
      glow:
        "radial-gradient(circle, rgba(82,225,157,0.2), rgba(20,100,68,0.05) 44%, transparent 72%)",
      accent: "rgba(144,255,202,0.96)",
      overlay:
        "linear-gradient(to bottom, rgba(25,125,80,0.1), transparent 38%, rgba(0,0,0,0.52))",
    };
  }

  const backgroundColor =
    scene.backgroundColor || "#050505";

  return {
    background: `
      radial-gradient(
        circle at 25% 20%,
        rgba(255,255,255,0.11),
        transparent 34%
      ),
      radial-gradient(
        circle at 78% 76%,
        rgba(255,255,255,0.07),
        transparent 38%
      ),
      linear-gradient(
        145deg,
        ${backgroundColor} 0%,
        #06080D 48%,
        #000000 100%
      )
    `,
    glow:
      "radial-gradient(circle, rgba(255,255,255,0.1), rgba(255,255,255,0.025) 42%, transparent 70%)",
    accent: "rgba(255,255,255,0.95)",
    overlay:
      "linear-gradient(to bottom, rgba(0,0,0,0.18), transparent 30%, transparent 68%, rgba(0,0,0,0.48))",
  };
}

export default function SceneRenderer({
  scene,
  brand,
  localFrame,
  sceneDuration,
  sceneIndex,
  totalScenes,
  fps,
  width,
  height,
}: SceneRendererProps) {
  const sceneOpacity = getTransitionOpacity({
    transition: scene.transition,
    localFrame,
    sceneDuration,
  });

  const transitionTransform = getTransitionTransform({
    transition: scene.transition,
    localFrame,
    sceneDuration,
  });

  const entrance = spring({
    fps,
    frame: localFrame,
    config: {
      damping: 16,
      stiffness: 90,
      mass: 0.9,
    },
  });

  const textY = interpolate(
    entrance,
    [0, 1],
    [90, 0],
    clamp,
  );

  const textScale = interpolate(
    entrance,
    [0, 1],
    [0.88, 1],
    clamp,
  );

  const progress = interpolate(
    localFrame,
    [0, sceneDuration],
    [0, 1],
    clamp,
  );

  const camera = getCameraTransform({
    movement: scene.cameraMovement,
    shot: scene.cameraShot,
    localFrame,
    sceneDuration,
  });

  const textLayout = getTextLayout({
    textPosition: scene.textPosition,
    width,
  });

  const atmosphere = getAtmosphere(scene);

  const words = (scene.text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const glowX = interpolate(
    localFrame,
    [0, sceneDuration],
    [-120, 120],
    clamp,
  );

  const glowY = interpolate(
    localFrame,
    [0, sceneDuration],
    [80, -80],
    clamp,
  );

  const sceneImageUrl = resolveSceneImageUrl(scene.imageUrl);
  const sceneVideoUrl = resolveSceneVideoUrl(scene.videoUrl);
  const isProductProof = scene.metadata?.productProof === true;
  const mediaClipStartFrame =
    typeof scene.metadata?.mediaClipStartFrame === "number"
      ? scene.metadata.mediaClipStartFrame
      : isProductProof && typeof scene.metadata?.productClipStartFrame === "number"
        ? scene.metadata.productClipStartFrame
        : undefined;
  const productReveal = spring({
    fps,
    frame: localFrame,
    config: { damping: 18, stiffness: 82, mass: 0.9 },
  });

  const flashOpacity = normalizeValue(
    scene.transition,
  ).includes("flash")
    ? interpolate(
        localFrame,
        [0, 2, 7, 12],
        [1, 0.88, 0.15, 0],
        clamp,
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          scene.backgroundColor || "#050505",
        overflow: "hidden",
        color: "#FFFFFF",
        fontFamily:
          "Inter, Arial, Helvetica, sans-serif",
        opacity: sceneOpacity,
        transform: transitionTransform,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `
            translate3d(
              ${camera.translateX}px,
              ${camera.translateY}px,
              0
            )
            scale(${camera.scale})
            rotate(${camera.rotate}deg)
          `,
          background: atmosphere.background,
        }}
      />

      {sceneVideoUrl ? (
        <AbsoluteFill
          style={{
            opacity: sceneOpacity,
            transform: transitionTransform,
            overflow: "hidden",
            ...(isProductProof
              ? {
                  inset: "9% 6% 18%",
                  borderRadius: 34,
                  border: "2px solid rgba(255,255,255,0.28)",
                  boxShadow: "0 28px 90px rgba(0,0,0,0.72), 0 0 42px rgba(67,232,255,0.16)",
                  backgroundColor: "rgba(5,8,14,0.94)",
                  transform: `translateY(${interpolate(productReveal, [0, 1], [90, 0], clamp)}px) scale(${interpolate(productReveal, [0, 1], [0.88, 1], clamp)})`,
                }
              : {}),
          }}
        >
          <OffthreadVideo
            src={sceneVideoUrl}
            muted={scene.metadata?.motionAudioEnabled !== true}
            startFrom={mediaClipStartFrame}
            pauseWhenBuffering
            style={{
              width: "100%",
              height: "100%",
              objectFit: isProductProof ? "contain" : "cover",
            }}
          />
          {isProductProof ? (
            <div style={{ position: "absolute", top: 18, left: 22, display: "flex", gap: 10 }}>
              {["#ff6259", "#ffbd2e", "#28c840"].map((color) => (
                <div key={color} style={{ width: 15, height: 15, borderRadius: "50%", backgroundColor: color }} />
              ))}
            </div>
          ) : null}
        </AbsoluteFill>
      ) : sceneImageUrl ? (
        <AbsoluteFill
          style={{
            ...(isProductProof
              ? {
                  inset: "9% 6% 18%",
                  borderRadius: 34,
                  border: "2px solid rgba(255,255,255,0.28)",
                  overflow: "hidden",
                  boxShadow: "0 28px 90px rgba(0,0,0,0.72), 0 0 42px rgba(67,232,255,0.16)",
                  backgroundColor: "rgba(5,8,14,0.94)",
                  transform: `translateY(${interpolate(productReveal, [0, 1], [90, 0], clamp)}px) scale(${interpolate(productReveal, [0, 1], [0.88, 1.035], clamp)})`,
                }
              : {
                  transform: `translate3d(${camera.translateX}px, ${camera.translateY}px, 0) scale(${camera.scale}) rotate(${camera.rotate}deg)`,
                }),
          }}
        >
          <Img
            src={sceneImageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: isProductProof ? "contain" : "cover",
              objectPosition: "center",
            }}
          />
          {isProductProof ? (
            <div style={{ position: "absolute", top: 18, left: 22, display: "flex", gap: 10 }}>
              {["#ff6259", "#ffbd2e", "#28c840"].map((color) => (
                <div key={color} style={{ width: 15, height: 15, borderRadius: "50%", backgroundColor: color }} />
              ))}
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          width: width * 0.72,
          height: width * 0.72,
          borderRadius: "50%",
          left: width * 0.14 + glowX,
          top: height * 0.27 + glowY,
          background: atmosphere.glow,
          filter: "blur(26px)",
          opacity: 0.82,
        }}
      />

      <AbsoluteFill
        style={{
          background: atmosphere.overlay,
        }}
      />

      <AbsoluteFill
        style={{
          opacity: 0.08,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.13) 0px, rgba(255,255,255,0.13) 1px, transparent 1px, transparent 5px)",
          mixBlendMode: "soft-light",
        }}
      />

      <BrandLayer
        brand={brand}
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        accentColor={atmosphere.accent}
      />

      <AbsoluteFill
        style={{
          justifyContent: textLayout.justifyContent,
          alignItems: textLayout.alignItems,
          padding: textLayout.padding,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: textLayout.maxWidth,
            textAlign: textLayout.textAlign,
          }}
        >
          {(["hook", "solution", "call-to-action"].includes(
            String(scene.metadata?.scenePurpose ?? ""),
          )) ? <div
            style={{
              transform: `translateY(${textY}px) scale(${textScale})`,
              transformOrigin:
                textLayout.textAlign === "center"
                  ? "center"
                  : textLayout.textAlign === "right"
                    ? "right center"
                    : "left center",
              fontSize:
                words.length > 16
                  ? 68
                  : words.length > 10
                    ? 78
                    : 90,
              fontWeight: 850,
              lineHeight: 1.08,
              letterSpacing: -2.5,
              textAlign: textLayout.textAlign,
              textShadow:
                "0 12px 45px rgba(0,0,0,0.62)",
            }}
          >
            {words.map((word, index) => {
              const wordStart = 8 + index * 3;

              const wordOpacity = interpolate(
                localFrame,
                [wordStart, wordStart + 10],
                [0, 1],
                clamp,
              );

              const wordY = interpolate(
                localFrame,
                [wordStart, wordStart + 12],
                [28, 0],
                {
                  ...clamp,
                  easing: Easing.out(Easing.cubic),
                },
              );

              return (
                <span
                  key={`${scene.id}-${index}-${word}`}
                  style={{
                    display: "inline-block",
                    marginRight: "0.24em",
                    opacity: wordOpacity,
                    transform: `translateY(${wordY}px)`,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div> : null}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 92,
          width: "auto",
          height: 5,
          overflow: "hidden",
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.17)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: atmosphere.accent,
          }}
        />
      </div>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          boxShadow:
            "inset 0 0 180px rgba(0,0,0,0.58), inset 0 0 45px rgba(0,0,0,0.48)",
        }}
      />

      {flashOpacity > 0 ? (
        <AbsoluteFill
          style={{
            backgroundColor: "#FFFFFF",
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
