export type RuntimeStatus = "planning" | "approved" | "working";

export type RuntimeState = {
  status: RuntimeStatus;
  lastUpdated: string;
};

let runtime: RuntimeState = {
  status: "planning",
  lastUpdated: new Date().toISOString(),
};

export function getRuntime() {
  return runtime;
}

export function updateRuntime(
  updater: (current: RuntimeState) => RuntimeState
) {
  runtime = {
    ...updater(runtime),
    lastUpdated: new Date().toISOString(),
  };

  return runtime;
}