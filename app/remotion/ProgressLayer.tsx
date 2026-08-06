"use client";

import React from "react";
import { AbsoluteFill } from "remotion";

type Props = {
  progress: number;
  color?: string;
  height?: number;
};

export default function ProgressLayer({
  progress,
  color = "#22c55e",
  height = 6,
}: Props) {
  const width = `${Math.max(0, Math.min(progress, 1)) * 100}%`;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            width,
            height: "100%",
            backgroundColor: color,
            transition: "width 0.2s linear",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}