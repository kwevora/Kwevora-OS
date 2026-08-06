export function getTodaysMission() {
  return {
    greeting:
  new Date().getHours() < 12
    ? "Good morning, Kent."
    : new Date().getHours() < 18
    ? "Good afternoon, Kent."
    : "Good evening, Kent.",

    assistant: "KAI",

    mission: "Create one faceless video",

    reason:
      "Posting consistently gives KWEVORA the highest chance of growing today.",

    estimatedTime: "20 minutes",

    impact: 5,

    focus: "Grow KWEVORA",
  };
}