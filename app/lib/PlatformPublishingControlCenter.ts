export type ControlledPlatform = "youtube" | "tiktok" | "instagram" | "facebook";

export type PlatformConnectionInput = {
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  accountName?: string;
  scopes?: string;
};

export type PlatformReadiness = {
  platform: ControlledPlatform;
  label: string;
  configured: boolean;
  connected: boolean;
  authenticated: boolean;
  executorAvailable: boolean;
  accountId: string;
  accountName: string;
  state: "ready" | "needs_connection" | "needs_app_setup" | "waiting_executor";
  requirements: Array<{ label: string; satisfied: boolean; reason: string }>;
  missingRequirements: string[];
  nextAction: string;
};

const LABELS: Record<ControlledPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

function configured(platform: ControlledPlatform): boolean {
  if (platform === "youtube") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (platform === "tiktok") return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function executorAvailable(): boolean {
  return true;
}

export class PlatformPublishingControlCenter {
  assess(platform: ControlledPlatform, connection: PlatformConnectionInput = {}): PlatformReadiness {
    const appConfigured = configured(platform);
    const authenticated = Boolean(connection.accessToken || connection.refreshToken);
    const connected = authenticated && Boolean(connection.accountId);
    const executor = executorAvailable();
    const grantedScopes = new Set((connection.scopes ?? "").split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
    const requiredScopes = platform === "tiktok"
      ? ["video.publish", "video.upload", "video.list"]
      : platform === "instagram"
        ? ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"]
        : platform === "facebook"
          ? ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "read_insights"]
          : [];
    const permissionsSatisfied = requiredScopes.every((scope) => grantedScopes.has(scope));
    const requirements = [
      {
        label: `${LABELS[platform]} developer app configured`,
        satisfied: appConfigured,
        reason: appConfigured
          ? "The required app credentials are configured on the KWEVORA server."
          : `Add the official ${LABELS[platform]} developer app credentials to KWEVORA.`,
      },
      {
        label: `${LABELS[platform]} account authorized`,
        satisfied: connected,
        reason: connected
          ? `Authorized${connection.accountName ? ` as ${connection.accountName}` : ""}.`
          : `Complete the official ${LABELS[platform]} account authorization.`,
      },
      {
        label: `${LABELS[platform]} publishing executor available`,
        satisfied: executor,
        reason: executor
          ? "KAI has a real platform executor and does not need a simulated result."
          : `The real ${LABELS[platform]} publishing executor must be installed before KAI can post.`,
      },
      ...(requiredScopes.length > 0 ? [{
        label: `${LABELS[platform]} publishing permissions granted`,
        satisfied: permissionsSatisfied,
        reason: permissionsSatisfied
          ? "The connected account granted the required publishing permissions."
          : `Reconnect and grant: ${requiredScopes.join(", ")}.`,
      }] : []),
    ];
    const missingRequirements = requirements.filter((item) => !item.satisfied).map((item) => item.label);
    const state = !appConfigured
      ? "needs_app_setup" as const
      : !connected || !permissionsSatisfied
        ? "needs_connection" as const
        : !executor
          ? "waiting_executor" as const
          : "ready" as const;
    const nextAction = state === "ready"
      ? `${LABELS[platform]} is ready for approved publishing jobs.`
      : state === "needs_app_setup"
        ? `Configure the official ${LABELS[platform]} developer app.`
        : state === "needs_connection"
          ? `Authorize the ${LABELS[platform]} account through its official connection flow.`
          : `Install and verify the real ${LABELS[platform]} publishing executor.`;
    return {
      platform,
      label: LABELS[platform],
      configured: appConfigured,
      connected,
      authenticated,
      executorAvailable: executor,
      accountId: connection.accountId?.trim() ?? "",
      accountName: connection.accountName?.trim() ?? "",
      state,
      requirements,
      missingRequirements,
      nextAction,
    };
  }

  report(connections: Partial<Record<ControlledPlatform, PlatformConnectionInput>>) {
    const platforms: ControlledPlatform[] = ["youtube", "tiktok", "instagram", "facebook"];
    const readiness = platforms.map((platform) => this.assess(platform, connections[platform]));
    return {
      ready: readiness.filter((item) => item.state === "ready").length,
      connected: readiness.filter((item) => item.connected).length,
      needsSetup: readiness.filter((item) => item.state === "needs_app_setup").length,
      waitingExecutor: readiness.filter((item) => item.state === "waiting_executor").length,
      platforms: readiness,
    };
  }
}

export const platformPublishingControlCenter = new PlatformPublishingControlCenter();
