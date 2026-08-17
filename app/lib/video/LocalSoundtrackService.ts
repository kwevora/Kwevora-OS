import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VideoAudioTrack, VideoScene } from "../../remotion/types";

const SAMPLE_RATE = 44_100;
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-");
function hash(value: string) { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return result >>> 0; }

function writeWav(samples: Float32Array) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples.length * 2, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24); buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}

function synthesize(input: { seed: number; seconds: number; energy: string; mood: string }) {
  const length = Math.ceil(input.seconds * SAMPLE_RATE); const output = new Float32Array(length);
  const bpm = input.energy === "high" ? 118 : input.energy === "low" ? 88 : 104; const beat = 60 / bpm;
  const roots = input.mood.includes("emotional") ? [220, 261.63, 196, 174.61] : [261.63, 329.63, 220, 349.23];
  const variation = (input.seed % 7) / 100;
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE; const beatIndex = Math.floor(t / beat); const beatPhase = (t % beat) / beat;
    const root = roots[Math.floor(t / (beat * 4)) % roots.length] * (1 + variation);
    const pad = Math.sin(2 * Math.PI * root * t) * 0.055 + Math.sin(2 * Math.PI * root * 1.5 * t) * 0.035 + Math.sin(2 * Math.PI * root * 2 * t) * 0.02;
    const arpNote = [1, 1.25, 1.5, 2][beatIndex % 4]; const arp = Math.sin(2 * Math.PI * root * arpNote * t) * Math.exp(-beatPhase * 5) * 0.075;
    const kickPhase = t % beat; const kick = Math.sin(2 * Math.PI * (76 - kickPhase * 40) * kickPhase) * Math.exp(-kickPhase * 17) * 0.24;
    const barPhase = (t % (beat * 4)) / (beat * 4);
    const impact = Math.sin(2 * Math.PI * (105 - barPhase * 80) * t) * Math.exp(-barPhase * 22) * 0.11;
    const noiseSeed = Math.sin((i + input.seed) * 12.9898) * 43758.5453;
    const noise = (noiseSeed - Math.floor(noiseSeed)) * 2 - 1;
    const clapPhase = Math.abs((t % (beat * 2)) - beat);
    const clapNoise = noise * Math.exp(-clapPhase * 52) * (input.energy === "low" ? 0.018 : 0.055);
    const risePosition = (t % (beat * 8)) / (beat * 8);
    const riser = noise * risePosition * risePosition * 0.018;
    const hatPhase = t % (beat / 2);
    const hat = noise * Math.exp(-hatPhase * 65) * (input.energy === "low" ? 0.015 : 0.035);
    const sectionLift = Math.floor(t / (beat * 8)) % 2 === 0 ? 0.88 : 1.08;
    output[i] = (pad + arp + kick + impact + clapNoise + hat + riser) * sectionLift * Math.min(1, t / 0.35) * Math.max(0, Math.min(1, (input.seconds - t) / 1.2));
  }
  return output;
}

export async function generateLocalSoundtrack(input: { videoId: string; productName: string; audience: string; creativeApproach: string; mood: string; energy: string; durationSeconds: number; scenes: VideoScene[] }): Promise<VideoAudioTrack> {
  const folder = safeName(input.videoId); const outputDir = path.join(process.cwd(), "public", "generated", folder); await mkdir(outputDir, { recursive: true });
  const identity = [input.videoId, input.productName, input.audience, input.creativeApproach, input.mood].join("|");
  const samples = synthesize({ seed: hash(identity), seconds: Math.max(8, input.durationSeconds), energy: input.energy, mood: input.mood });
  const fileName = `${folder}-kai-original.wav`; await writeFile(path.join(outputDir, fileName), writeWav(samples));
  return { url: `/generated/${folder}/${fileName}`, volume: 0.16, fadeInSeconds: 0.2, fadeOutSeconds: 1.2, loop: false };
}
