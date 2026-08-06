import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export type VoiceGenerationRequest = {
  videoId: string;
  script: string;
};

export type VoiceGenerationResult = {
  success: boolean;
  audioUrl?: string;
  outputPath?: string;
  message: string;
};

const projectRoot = process.cwd();

function prepareScriptForSpeech(
  script: string,
): string {
  return script
    .replace(
      /\bKWEVORA\b/gi,
      "Kweh-vor-uh",
    )
    .replace(
      /\bKAI\b/g,
      "Kai",
    )
    .replace(
  /\bKwevora OS\b/gi,
  "Kweh-vor-uh",
)
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateVoice(
  request: VoiceGenerationRequest,
): Promise<VoiceGenerationResult> {
  const videoId =
    request.videoId.trim();

  const spokenScript =
    prepareScriptForSpeech(
      request.script,
    );

  if (!videoId) {
    return {
      success: false,
      message:
        "A video ID is required before voice generation can begin.",
    };
  }

  if (!spokenScript) {
    return {
      success: false,
      message:
        "A script is required before voice generation can begin.",
    };
  }

  const outputDirectory = path.join(
    projectRoot,
    "public",
    "generated-audio",
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const outputPath = path.join(
    outputDirectory,
    `${videoId}.wav`,
  );

  return new Promise((resolve) => {
    const python = spawn(
      "py",
      [
        "-3.11",
        "scripts/generate_voice.py",
        spokenScript,
        outputPath,
      ],
      {
        cwd: projectRoot,
        windowsHide: true,
      },
    );

    let stderr = "";

    python.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      },
    );

    python.on(
      "error",
      (error) => {
        resolve({
          success: false,
          message:
            error.message ||
            "KAI could not start the voice generator.",
        });
      },
    );

    python.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath,
            audioUrl:
              `/generated-audio/${videoId}.wav`,
            message:
              "Voice generated successfully.",
          });

          return;
        }

        resolve({
          success: false,
          message:
            stderr.trim() ||
            `Voice generation stopped with exit code ${code}.`,
        });
      },
    );
  });
}