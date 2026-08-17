import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { openai } from "./openai";

export type GenerateSceneImageInput = {
  videoId: string;
  sceneId: string;
  prompt: string;
};

export type GeneratedSceneImage = {
  imageUrl: string;
  filePath: string;
  model: string;
};

function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateSceneImage(
  input: GenerateSceneImageInput,
): Promise<GeneratedSceneImage> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error(
      `Image prompt is missing for scene ${input.sceneId}.`,
    );
  }

  const safeVideoId =
    safeFileName(input.videoId) || "video";

  const safeSceneId =
    safeFileName(input.sceneId) || "scene";

  const outputDirectory = path.join(
    process.cwd(),
    "public",
    "generated",
    safeVideoId,
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const model = "gpt-image-1";

  const response = await openai.images.generate({
    model,
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    n: 1,
  });

  const imageBase64 =
    response.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error(
      `OpenAI did not return image data for scene ${input.sceneId}.`,
    );
  }

  const fileName = `${safeSceneId}.png`;

  const filePath = path.join(
    outputDirectory,
    fileName,
  );

  await writeFile(
    filePath,
    Buffer.from(imageBase64, "base64"),
  );

  const imageUrl =
    `/generated/${safeVideoId}/${fileName}`;

  return {
    imageUrl,
    filePath,
    model,
  };
}
