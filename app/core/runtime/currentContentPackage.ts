import type {
  KaiContentPackage,
} from "./contentGenerator";

const CURRENT_CONTENT_PACKAGE_KEY =
  "kwevora-current-content-package";

export type CurrentContentPackage = {
  package: KaiContentPackage;
  source:
    | "overnight"
    | "review-queue"
    | "video-studio"
    | "manual";
  savedAt: string;
};

function browserStorageAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

export function saveCurrentContentPackage(
  contentPackage: KaiContentPackage,
  source: CurrentContentPackage["source"] =
    "manual",
): CurrentContentPackage {
  const currentPackage: CurrentContentPackage = {
    package: contentPackage,
    source,
    savedAt: new Date().toISOString(),
  };

  if (browserStorageAvailable()) {
    window.localStorage.setItem(
      CURRENT_CONTENT_PACKAGE_KEY,
      JSON.stringify(currentPackage),
    );
  }

  return currentPackage;
}

export function loadCurrentContentPackage():
  | CurrentContentPackage
  | null {
  if (!browserStorageAvailable()) {
    return null;
  }

  const savedValue =
    window.localStorage.getItem(
      CURRENT_CONTENT_PACKAGE_KEY,
    );

  if (!savedValue) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(savedValue) as Partial<CurrentContentPackage>;

    if (
      !parsed.package ||
      typeof parsed.package !== "object" ||
      typeof parsed.savedAt !== "string" ||
      typeof parsed.source !== "string"
    ) {
      clearCurrentContentPackage();
      return null;
    }

    return parsed as CurrentContentPackage;
  } catch {
    clearCurrentContentPackage();
    return null;
  }
}

export function clearCurrentContentPackage(): void {
  if (!browserStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(
    CURRENT_CONTENT_PACKAGE_KEY,
  );
}