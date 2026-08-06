import type { KaiMemoryEntry } from "./memoryStore";

export type KaiContentFormat =
  | "short_video"
  | "text_post"
  | "story"
  | "faceless_video"
  | "record_yourself"
  | "upload_video";

export type KaiMediaFile = {
  source: "recording" | "upload";
  fileName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  filePath: string;
};

export type KaiVideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
};

export type KaiContentIdea = {
  id: string;
  createdAt: string;
  title: string;
  hook: string;
  caption: string;
  format: KaiContentFormat;
  reason: string;
  hashtags?: string[];
  thumbnailIdea?: string;
  callToAction?: string;
  audience?: string;
  recommendedPlatforms?: string[];
  videoPlan?: KaiVideoPlan;
};

export type KaiContentPackage = {
  id: string;
  createdAt: string;
  status: "draft" | "waiting_review" | "approved" | "ready_to_publish";
  platform: "tiktok" | "instagram" | "facebook" | "youtube_shorts";
  title: string;
  hook: string;
  script: string[];
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  cta: string;
  destinationLink: string;
  pinnedComment: string;
  reason: string;
  media?: KaiMediaFile;
};

function now() {
  return new Date().toISOString();
}

function makeIdea(
  title: string,
  hook: string,
  caption: string,
  reason: string,
  format: KaiContentIdea["format"] = "short_video"
): KaiContentIdea {
  return {
    id: crypto.randomUUID(),
    createdAt: now(),
    title,
    hook,
    caption,
    reason,
    format,
  };
}

function makePackage(input: {
  platform: KaiContentPackage["platform"];
  title: string;
  hook: string;
  script: string[];
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  cta: string;
  destinationLink: string;
  pinnedComment: string;
  reason: string;
  media?: KaiMediaFile;
}): KaiContentPackage {
  return {
    id: crypto.randomUUID(),
    createdAt: now(),
    status: "waiting_review",
    ...input,
  };
}

export function generateContentIdeas(
  memory: KaiMemoryEntry[]
): KaiContentIdea[] {
  const latestMemory = memory[0]?.text.toLowerCase() ?? "";

  const hasBusyWindow =
    latestMemory.includes("busy") ||
    latestMemory.includes("3pm") ||
    latestMemory.includes("5pm") ||
    latestMemory.includes("appointment");

  if (hasBusyWindow) {
    return [
      makeIdea(
        "Build before the day gets busy",
        "If you only had two focused hours today, what would you build first?",
        "Protect your best hours. Use them on the work that actually moves you forward. One step closer. 🦾",
        "Kent has a busy window saved in memory, so KAI created content around protecting focus time."
      ),
      makeIdea(
        "Your morning matters more than your afternoon",
        "Most people waste their best energy reacting. Build before the world gets loud.",
        "KAI’s job is simple: prepare the hard part before the day starts pulling at you.",
        "This idea supports the KWEVORA promise: wake up, approve your day, and go live your life."
      ),
      makeIdea(
        "The hour before everything starts",
        "Before the errands, calls, appointments, and chaos… you need one clean move.",
        "One focused hour can change the whole day when the plan is already prepared.",
        "KAI remembered Kent’s availability and generated a video built around limited time."
      ),
    ];
  }

  return [
    makeIdea(
      "Wake up with the hard part done",
      "Imagine opening your laptop and your business already has a plan.",
      "That’s the promise: Wake up. Approve your day. Go live your life.",
      "This directly explains the KWEVORA OS core promise."
    ),
    makeIdea(
      "Your AI should not wait for commands",
      "Most AI tools wait. KAI starts before you arrive.",
      "The future isn’t asking AI what to do. It’s approving what it already prepared.",
      "This separates KWEVORA from normal AI chat tools."
    ),
    makeIdea(
      "One step closer",
      "You don’t need to fix your whole life today. You need one move that matters.",
      "KAI finds the next move, prepares it, and waits for your approval.",
      "This supports the One Step Closer content series."
    ),
  ];
}

export function generateMoneyModePackages(input?: {
  destinationLink?: string;
}): KaiContentPackage[] {
  const destinationLink =
    input?.destinationLink?.trim() ||
    "Add your Stan Store, free guide, or product link here.";

  const baseScript = [
    "Most people wake up already behind.",
    "They open their phone, react to problems, and spend the whole day trying to catch up.",
    "But what if your business had already been worked on before you even got out of bed?",
    "That’s what KWEVORA is built for.",
    "Wake up. Approve your day. Go live your life.",
  ];

  return [
    makePackage({
      platform: "tiktok",
      title: "Wake up with the hard part done",
      hook: "Most people wake up behind. What if your business didn’t?",
      script: baseScript,
      caption:
        "Imagine waking up and your content, plan, and next move are already prepared. That’s the future I’m building with KWEVORA. One step closer. 🦾",
      hashtags: [
        "#KWEVORA",
        "#DigitalProducts",
        "#AIBusiness",
        "#ContentCreator",
      ],
      thumbnailIdea:
        "Text on screen: “What if your business worked while you slept?”",
      cta: "Tap the link in my bio to grab the free guide or see what I’m building.",
      destinationLink,
      pinnedComment: `Start here: ${destinationLink}`,
      reason:
        "TikTok needs a strong hook and emotional contrast. This video sells the KWEVORA promise clearly.",
    }),
    makePackage({
      platform: "instagram",
      title: "Your AI should not wait for commands",
      hook: "The next wave of AI won’t wait for you to ask.",
      script: [
        "Most AI tools sit there waiting for commands.",
        "But business owners don’t need another blank screen.",
        "They need work prepared before they arrive.",
        "That’s the idea behind KWEVORA.",
        "KAI prepares the day. You approve it. Then you move.",
      ],
      caption:
        "Most AI tools wait. KWEVORA prepares. That difference matters when you’re trying to build income with limited time.",
      hashtags: [
        "#AIWorkflow",
        "#DigitalMarketing",
        "#CreatorBusiness",
        "#KWEVORA",
      ],
      thumbnailIdea:
        "Split screen: “Blank AI chat” vs “Prepared work waiting.”",
      cta: "Check the link in bio if you’re building digital income too.",
      destinationLink,
      pinnedComment: `Free guide / offer link: ${destinationLink}`,
      reason:
        "Instagram Reels can sell the contrast between normal AI tools and KAI’s morning operating system.",
    }),
    makePackage({
      platform: "facebook",
      title: "One move that matters",
      hook:
        "You don’t need to fix everything today. You need one move that matters.",
      script: [
        "When life feels heavy, building a business can feel impossible.",
        "But one focused move still counts.",
        "One video.",
        "One offer.",
        "One link.",
        "One step closer.",
      ],
      caption:
        "I’m building KWEVORA to help people wake up with one clear move already prepared. If you’re selling digital products or trying to start, this is for you.",
      hashtags: [
        "#OneStepCloser",
        "#DigitalProducts",
        "#OnlineBusiness",
      ],
      thumbnailIdea: "Text on screen: “One move today.”",
      cta: "Click the link connected to this post or visit my bio to start.",
      destinationLink,
      pinnedComment: `Here’s the link: ${destinationLink}`,
      reason:
        "Facebook needs a more personal tone. This version connects to people trying to build through pressure.",
    }),
    makePackage({
      platform: "youtube_shorts",
      title: "I’m building my AI COO",
      hook:
        "I’m building an AI COO because I need help making income now.",
      script: [
        "I’m not building this just to look cool.",
        "I’m building it because I need a system that helps me create, post, and sell.",
        "KAI is my AI COO.",
        "It prepares the day.",
        "I approve the work.",
        "Then we move one step closer.",
      ],
      caption:
        "Building KWEVORA in public: an AI COO for creators, digital product sellers, and people trying to build income with limited time.",
      hashtags: [
        "#BuildInPublic",
        "#AIStartup",
        "#DigitalProducts",
        "#KWEVORA",
      ],
      thumbnailIdea: "Text on screen: “Building my AI COO.”",
      cta: "Follow the journey and check the link attached to my profile.",
      destinationLink,
      pinnedComment: `Follow the build + start here: ${destinationLink}`,
      reason:
        "YouTube Shorts rewards story and journey. This positions Kent as Customer #1 and builds trust.",
    }),
  ];
}