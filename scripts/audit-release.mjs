import { access, readFile } from "node:fs/promises";
import process from "node:process";

const root = process.cwd();
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

await Promise.all([
  requireFile("Install-Kwevora-9.10.1.ps1"),
  requireFile("Setup-Free-Video.ps1"),
  requireFile("RELEASE-9.10.1.md"),
]);

const packageJson = JSON.parse(await text("package.json"));
if (packageJson.version !== "9.10.1") failures.push("package.json has the wrong release version.");
if (packageJson.scripts?.dev !== "next dev") failures.push("The development start command is missing.");

const director = await text("app/lib/video/KaiGenerativeVideoDirector.ts");
requireText(director, "spokenProductName", "Seller attribution repair is missing.");
requireText(director, "repairDirection", "Automatic AI direction repair is missing.");
requireText(director, "maximumAttempts = 3", "Automatic quality retry is missing.");

const production = await text("app/lib/video/VideoProductionEngine.ts");
requireText(production, "createProductFirstFallback", "Product-first footage fallback is missing.");
requireText(production, "KAI switched automatically", "Automatic footage recovery is missing.");

const setup = await text("Setup-Free-Video.ps1");
requireText(setup, "Test-PexelsKey", "Pexels key validation is missing.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("KWEVORA 9.10.1 release audit passed.");
