"use client";

import React from "react";
import { AbsoluteFill, Img, Video } from "remotion";

type Props = {
  imageUrl?: string;
  videoUrl?: string;
  overlayOpacity?: number;
};

export default function ImageLayer({
  imageUrl,
  videoUrl,
  overlayOpacity = 0.35,
}: Props) {
  return (
    <AbsoluteFill>
      {videoUrl ? (
        <Video
          src={videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}

      <AbsoluteFill
        style={{
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
        }}
      />
    </AbsoluteFill>
  );
}