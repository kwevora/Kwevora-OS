"use client";

import React from "react";
import { AbsoluteFill } from "remotion";

type Props = {
  gradient?: string;
  opacity?: number;
};

export default function OverlayLayer({
  gradient = "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)",
  opacity = 1,
}: Props) {
  return (
    <AbsoluteFill
      style={{
        background: gradient,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}