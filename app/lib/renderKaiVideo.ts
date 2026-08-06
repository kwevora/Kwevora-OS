import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  VideoAudioTrack,
  VideoScene,
} from "../remotion/types";

export type KaiVideoScene = VideoScene;

type RenderKaiVideoInput = {
  videoId: string;
  title: string;
  scenes: KaiVideoScene[];
  brand?: string;
  musicMood?: string;
  music?: VideoAudioTrack;
};

type RenderResult = {
  success: true;
  videoId: string;
  outputLocation: string;
  videoUrl: string;
};

export async function renderKaiVideo({
  videoId,
  title,
  scenes,
  brand = "KWEVORA",
  musicMood,
  music,
}: RenderKaiVideoInput): Promise<RenderResult> {
  const projectRoot = process.cwd();

  const jobsDirectory = path.join(
    projectRoot,
    "data",
    "render-jobs",
  );

  await mkdir(jobsDirectory, {
    recursive: true,
  });

  const jobFilePath = path.join(
    jobsDirectory,
    `${videoId}.json`,
  );

  await writeFile(
    jobFilePath,
    JSON.stringify(
      {
        videoId,
        title,
        brand,
        scenes,
        musicMood,
        music,
      },
      null,
      2,
    ),
    "utf8",
  );

  const rendererPath = path.join(
    projectRoot,
    "scripts",
    "render-kwevora-video.mjs",
  );

  const relativeJobPath = path.relative(
    projectRoot,
    jobFilePath,
  );

  return new Promise((resolve, reject) => {
    const renderer = spawn(
      process.execPath,
      [rendererPath, relativeJobPath],
      {
        cwd: projectRoot,
        windowsHide: true,
      },
    );

    let output = "";
    let errorOutput = "";

    renderer.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });

    renderer.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
    });

    renderer.on("error", (error) => {
      reject(error);
    });

    renderer.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            errorOutput ||
              `KAI renderer stopped with exit code ${code}.`,
          ),
        );

        return;
      }

      const resultLine = output
        .split(/\r?\n/)
        .find((line) =>
          line.startsWith("KAI_RENDER_RESULT="),
        );

      if (!resultLine) {
        reject(
          new Error(
            "KAI renderer finished without returning a result.",
          ),
        );

        return;
      }

      try {
        const result = JSON.parse(
          resultLine.replace(
            "KAI_RENDER_RESULT=",
            "",
          ),
        ) as RenderResult;

        resolve(result);
      } catch {
        reject(
          new Error(
            "KAI renderer returned an invalid result.",
          ),
        );
      }
    });
  });
}