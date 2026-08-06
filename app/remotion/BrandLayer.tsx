import React from "react";

type BrandLayerProps = {
  brand: string;
  sceneIndex: number;
  totalScenes: number;
  accentColor: string;
};

export default function BrandLayer({
  brand,
  sceneIndex,
  totalScenes,
  accentColor,
}: BrandLayerProps) {
  const sceneNumber = String(sceneIndex + 1).padStart(2, "0");
  const totalSceneNumber = String(totalScenes).padStart(2, "0");

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          {brand}
        </div>

        <div
          style={{
            fontSize: 23,
            fontWeight: 600,
            letterSpacing: 4,
            opacity: 0.55,
          }}
        >
          {sceneNumber} / {totalSceneNumber}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 126,
          left: 64,
          width: 120,
          height: 5,
          borderRadius: 999,
          backgroundColor: accentColor,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 118,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 650,
            letterSpacing: 1.5,
            opacity: 0.72,
          }}
        >
          One Step Closer
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 23,
            fontWeight: 800,
            opacity: 0.82,
          }}
        >
          K
        </div>
      </div>
    </>
  );
}