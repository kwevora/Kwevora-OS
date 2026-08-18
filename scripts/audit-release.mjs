import { access, readFile } from "node:fs/promises";
import process from "node:process";

const failures = [];

async function text(file) {
  return readFile(new URL(`../${file}`, import.meta.url), "utf8");
}

async function requireFile(file) {
  try {
    await access(new URL(`../${file}`, import.meta.url));
  } catch {
    failures.push(`Missing required release file: ${file}`);
  }
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) failures.push(label);
}

function rejectText(source, rejected, label) {
  if (source.includes(rejected)) failures.push(label);
}

await Promise.all([
  requireFile("public/product-assets/kwevora-content-planner/hero.png"),
  requireFile("public/product-assets/kwevora-content-planner/dashboard.jpg"),
  requireFile("public/product-assets/kwevora-content-planner/calendar.jpg"),
  requireFile("public/product-assets/kwevora-content-planner/ideas.jpg"),
]);

const packageJson = JSON.parse(await text("package.json"));
if (packageJson.version !== "9.10.1") failures.push("package.json has the wrong release version.");
if (packageJson.scripts?.dev !== "next dev") failures.push("The development start command is missing.");

const production = await text("app/lib/video/VideoProductionEngine.ts");
requireText(production, "buildProvenProductAdTemplate", "The proven product-ad template is missing.");
requireText(production, "Rendering the verified template once", "Single-pass rendering is missing.");
rejectText(production, "directGenerativeVideo", "The production path still contains generative video retries.");
rejectText(production, "generateMotionScenes", "The production path still depends on stock-motion generation.");
rejectText(production, "directAdaptiveVideo", "The production path still contains the adaptive fallback renderer.");

const template = await text("app/lib/video/ProvenProductAdTemplate.ts");
requireText(template, "kwevora-planner-proof-v1", "The KWEVORA planner template is missing.");
requireText(template, "TOTAL_FRAMES = 30 * FPS", "The locked 30-second timeline is missing.");
requireText(template, "Seven of eight scenes", "Required real-product coverage is missing.");
requireText(template, "Click the link", "The Stan Store call to action is missing.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("KWEVORA 9.10.1 release audit passed.");
