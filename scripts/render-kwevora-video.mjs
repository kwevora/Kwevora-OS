import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
} from "@remotion/renderer";

import {
  mkdir,
  readFile,
} from "node:fs/promises";

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();

function getJobFilePath() {
  const argument = process.argv[2];

  if (!argument) {
    throw new Error(
      "Missing render-job file. Run: node scripts/render-kwevora-video.mjs <job-file>",
    );
  }

  return path.resolve(
    projectRoot,
    argument,
  );
}

async function readRenderJob(
  jobFilePath,
) {
  const rawJob = await readFile(
    jobFilePath,
    "utf8",
  );

  const job = JSON.parse(rawJob);

  if (
    !job ||
    typeof job !== "object"
  ) {
    throw new Error(
      "The render job is not valid.",
    );
  }

  if (
    typeof job.videoId !== "string" ||
    !job.videoId.trim()
  ) {
    throw new Error(
      "The render job is missing videoId.",
    );
  }

  if (
    typeof job.title !== "string" ||
    !job.title.trim()
  ) {
    throw new Error(
      "The render job is missing title.",
    );
  }

  if (
    !Array.isArray(job.scenes) ||
    job.scenes.length === 0
  ) {
    throw new Error(
      "The render job must contain at least one scene.",
    );
  }

  return job;
}

async function renderKwevoraVideo() {
  const jobFilePath =
    getJobFilePath();

  const job =
    await readRenderJob(
      jobFilePath,
    );

  const entryPoint = path.join(
    projectRoot,
    "app",
    "remotion",
    "index.ts",
  );

  const publicDirectory =
    path.join(
      projectRoot,
      "public",
    );

  const outputDirectory =
    path.join(
      publicDirectory,
      "generated-videos",
    );

  await mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const outputLocation =
    path.join(
      outputDirectory,
      `${job.videoId}.mp4`,
    );

  const inputProps = {
    title: job.title,

    scenes: job.scenes,

    brand:
      typeof job.brand === "string" &&
      job.brand.trim()
        ? job.brand.trim()
        : "KWEVORA",

    musicMood:
      typeof job.musicMood === "string"
        ? job.musicMood
        : undefined,

    music:
      job.music &&
      typeof job.music === "object" &&
      typeof job.music.url === "string" &&
      job.music.url.trim()
        ? job.music
        : undefined,
  };

  console.log(
    "KAI renderer started.",
  );

  console.log(
    `Video ID: ${job.videoId}`,
  );

  console.log(
    `Scenes: ${job.scenes.length}`,
  );

  console.log(
    `Music mood: ${
      inputProps.musicMood ||
      "Not provided"
    }`,
  );

  console.log(
    `Music track: ${
      inputProps.music?.url ||
      "No music track"
    }`,
  );

  job.scenes.forEach(
    (scene, index) => {
      console.log(
        `Scene ${index + 1} image: ${
          scene.imageUrl ||
          "No image URL"
        }`,
      );
    },
  );

  console.log(
    "Bundling KWEVORA video...",
  );

  const serveUrl =
    await bundle({
      entryPoint,

      publicDir:
        publicDirectory,

      webpackOverride:
        (config) => config,
    });

  console.log(
    "Selecting composition...",
  );

  const composition =
    await selectComposition({
      serveUrl,

      id: "KwevoraVideo",

      inputProps,
    });

  console.log(
    "Rendering MP4...",
  );

  await renderMedia({
    composition,

    serveUrl,

    codec: "h264",

    outputLocation,

    inputProps,

    onProgress: ({
      progress,
    }) => {
      const percent =
        Math.round(
          progress * 100,
        );

      process.stdout.write(
        `\rRendering: ${percent}%`,
      );
    },
  });

  process.stdout.write("\n");

  const publicVideoUrl =
    `/generated-videos/${job.videoId}.mp4`;

  console.log(
    "KAI render complete.",
  );

  console.log(
    `Saved to: ${outputLocation}`,
  );

  console.log(
    `Video URL: ${publicVideoUrl}`,
  );

  return {
    success: true,

    videoId:
      job.videoId,

    outputLocation,

    videoUrl:
      publicVideoUrl,
  };
}

const isMainFile =
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(
      process.argv[1],
    ).href;

if (isMainFile) {
  renderKwevoraVideo()
    .then((result) => {
      console.log(
        `KAI_RENDER_RESULT=${JSON.stringify(
          result,
        )}`,
      );

      process.exit(0);
    })
    .catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown rendering error.";

      console.error(
        "\nKAI video rendering failed:",
      );

      console.error(
        message,
      );

      process.exit(1);
    });
}

export {
  renderKwevoraVideo,
};