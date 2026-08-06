export type SocialPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube_shorts";

export type PlatformConnectionStatus =
  | "not_connected"
  | "manual_ready"
  | "connected";

export type PlatformConnection = {
  platform: SocialPlatform;
  label: string;
  status: PlatformConnectionStatus;
  username: string;
  profileUrl: string;
  notes: string;
};

export const defaultPlatformConnections: PlatformConnection[] = [
  {
    platform: "tiktok",
    label: "TikTok",
    status: "manual_ready",
    username: "",
    profileUrl: "",
    notes:
      "KAI can prepare TikTok content for manual posting now. Direct posting will require platform account connection later.",
  },
  {
    platform: "instagram",
    label: "Instagram",
    status: "manual_ready",
    username: "",
    profileUrl: "",
    notes:
      "KAI can prepare Instagram Reel packages now. Direct posting will require account connection later.",
  },
  {
    platform: "facebook",
    label: "Facebook",
    status: "manual_ready",
    username: "",
    profileUrl: "",
    notes:
      "KAI can prepare Facebook Reel/post packages now. Page publishing will require account connection later.",
  },
  {
    platform: "youtube_shorts",
    label: "YouTube Shorts",
    status: "manual_ready",
    username: "",
    profileUrl: "",
    notes:
      "KAI can prepare YouTube Shorts packages now. Direct publishing will require channel connection later.",
  },
];

export function getPlatformLabel(platform: SocialPlatform | string) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  if (platform === "facebook") return "Facebook";
  if (platform === "youtube_shorts") return "YouTube Shorts";

  return platform;
}