type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchema;
};

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
};

type JsonRpcEnvelope = {
  id?: number | string;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

export type OpenArtVideoResult =
  | {
      success: true;
      videoUrl: string;
      toolName: string;
      model?: string;
    }
  | {
      success: false;
      message: string;
    };

const MCP_URL = "https://mcp.openart.ai/mcp";
const VIDEO_EXTENSIONS = /\.(?:mp4|webm|mov)(?:\?|#|$)/i;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseEnvelope(text: string): JsonRpcEnvelope | undefined {
  const body = text.trim();
  if (!body) return undefined;

  if (body.startsWith("{")) {
    return JSON.parse(body) as JsonRpcEnvelope;
  }

  const dataLines = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  for (let index = dataLines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(dataLines[index]) as JsonRpcEnvelope;
    } catch {
      // Ignore non-JSON keepalive events.
    }
  }

  return undefined;
}

class OpenArtMcpClient {
  private sessionId?: string;
  private requestId = 0;

  constructor(private readonly accessToken: string) {}

  private async request(method: string, params?: unknown, notification = false) {
    const id = notification ? undefined : ++this.requestId;
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        ...(id === undefined ? {} : { id }),
        method,
        ...(params === undefined ? {} : { params }),
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const newSessionId = response.headers.get("mcp-session-id");
    if (newSessionId) this.sessionId = newSessionId;

    const responseText = await response.text();
    if (!response.ok) {
      const suffix = responseText.trim().slice(0, 500);
      throw new Error(`OpenArt MCP returned ${response.status}${suffix ? `: ${suffix}` : "."}`);
    }

    if (notification || !responseText.trim()) return undefined;
    const envelope = parseEnvelope(responseText);
    if (!envelope) throw new Error("OpenArt MCP returned an unreadable response.");
    if (envelope.error) {
      throw new Error(
        `OpenArt MCP error: ${envelope.error.message ?? "The request failed."}`,
      );
    }
    return envelope.result;
  }

  async initialize() {
    await this.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "KWEVORA OS", version: "9.10.1" },
    });
    await this.request("notifications/initialized", undefined, true);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request("tools/list") as { tools?: McpTool[] } | undefined;
    return result?.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>) {
    return this.request("tools/call", { name, arguments: args });
  }
}

function toolText(tool: McpTool) {
  return `${tool.name} ${tool.description ?? ""}`.toLowerCase();
}

function chooseGenerationTool(tools: McpTool[]) {
  return [...tools]
    .map((tool) => {
      const text = toolText(tool);
      let score = 0;
      if (text.includes("video")) score += 8;
      if (text.includes("generate") || text.includes("create")) score += 6;
      if (text.includes("text to video") || text.includes("text-to-video")) score += 6;
      if (text.includes("image to video") || text.includes("image-to-video")) score += 3;
      if (text.includes("status") || text.includes("result") || text.includes("list")) score -= 12;
      if (text.includes("delete")) score -= 20;
      return { tool, score };
    })
    .sort((a, b) => b.score - a.score)
    .find((candidate) => candidate.score >= 10)?.tool;
}

function chooseStatusTool(tools: McpTool[]) {
  return [...tools]
    .map((tool) => {
      const text = toolText(tool);
      let score = 0;
      if (text.includes("status") || text.includes("result") || text.includes("task")) score += 6;
      if (text.includes("get") || text.includes("check") || text.includes("query")) score += 4;
      if (text.includes("generate") || text.includes("create") || text.includes("delete")) score -= 8;
      return { tool, score };
    })
    .sort((a, b) => b.score - a.score)
    .find((candidate) => candidate.score >= 6)?.tool;
}

function preferredEnum(values: unknown[], fieldName: string) {
  const strings = values.filter((value): value is string => typeof value === "string");
  const loweredField = fieldName.toLowerCase();
  if (loweredField.includes("model")) {
    for (const preference of ["seedance", "kling", "wan", "pixverse", "grok"]) {
      const match = strings.find((value) => value.toLowerCase().includes(preference));
      if (match) return match;
    }
  }
  if (loweredField.includes("ratio") || loweredField.includes("aspect")) {
    return strings.find((value) => /9[:x/]16/.test(value)) ?? strings[0];
  }
  if (loweredField.includes("resolution") || loweredField.includes("quality")) {
    return strings.find((value) => /1080|high|hd/i.test(value)) ?? strings[0];
  }
  return values[0];
}

function valueForField(
  name: string,
  schema: JsonSchema,
  input: {
    prompt: string;
    productAssetUrl?: string;
    taskId?: string;
  },
): unknown {
  const lower = name.toLowerCase();
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return preferredEnum(schema.enum, name);

  if (input.taskId && /(task|job|generation|request).*(id)|^id$/.test(lower)) {
    return input.taskId;
  }
  if (/(prompt|description|instruction|text|script)/.test(lower)) return input.prompt;
  if (/(aspect|ratio)/.test(lower)) return "9:16";
  if (/(duration|seconds|length)/.test(lower)) return 5;
  if (/(count|number|num_|quantity)/.test(lower)) return 1;
  if (/(resolution|quality)/.test(lower)) return "1080p";
  if (
    input.productAssetUrl &&
    /(image|reference|source|asset).*(url|uri)|^(image|reference|source)$/.test(lower)
  ) {
    return input.productAssetUrl;
  }

  if (schema.type === "boolean") return false;
  if (schema.type === "integer" || schema.type === "number") return 1;
  if (schema.type === "array") return [];
  if (schema.type === "object") return {};
  if (schema.type === "string") return input.prompt;
  return undefined;
}

function buildArguments(
  tool: McpTool,
  input: {
    prompt: string;
    productAssetUrl?: string;
    taskId?: string;
  },
) {
  const properties = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const args: Record<string, unknown> = {};

  for (const [name, schema] of Object.entries(properties)) {
    const value = valueForField(name, schema, input);
    if (value !== undefined && (required.has(name) || value !== "")) args[name] = value;
  }

  return args;
}

function findUrl(value: unknown): string | undefined {
  if (typeof value === "string") {
    const urls = value.match(URL_PATTERN) ?? [];
    return urls.find((url) => VIDEO_EXTENSIONS.test(url)) ??
      urls.find((url) => /video|output|download|cdn/i.test(url));
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prioritizedKeys = [
      "video_url", "videoUrl", "download_url", "downloadUrl", "output_url",
      "outputUrl", "url", "uri", "output", "result", "data", "structuredContent", "content",
    ];
    for (const key of prioritizedKeys) {
      if (key in record) {
        const found = findUrl(record[key]);
        if (found) return found;
      }
    }
    for (const nested of Object.values(record)) {
      const found = findUrl(nested);
      if (found) return found;
    }
  }

  return undefined;
}

function findTaskId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTaskId(item);
      if (found) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["task_id", "taskId", "job_id", "jobId", "generation_id", "generationId", "id"]) {
    const candidate = record[key];
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }
  for (const nested of Object.values(record)) {
    const found = findTaskId(nested);
    if (found) return found;
  }
  return undefined;
}

function outputFailed(value: unknown) {
  const text = JSON.stringify(value).toLowerCase();
  return /"status"\s*:\s*"(?:failed|error|cancelled)"/.test(text);
}

export async function generateOpenArtVideo(input: {
  accessToken?: string;
  prompt: string;
  productAssetUrl?: string;
}): Promise<OpenArtVideoResult> {
  const token = input.accessToken?.trim();
  if (!token) {
    return { success: false, message: "OpenArt is not connected for this request." };
  }

  try {
    const client = new OpenArtMcpClient(token);
    await client.initialize();
    const tools = await client.listTools();
    const generationTool = chooseGenerationTool(tools);
    if (!generationTool) {
      return {
        success: false,
        message: "OpenArt connected, but its current MCP tool list contains no video generator.",
      };
    }

    const args = buildArguments(generationTool, input);
    const generation = await client.callTool(generationTool.name, args);
    const immediateUrl = findUrl(generation);
    if (immediateUrl) {
      return {
        success: true,
        videoUrl: immediateUrl,
        toolName: generationTool.name,
        model: typeof args.model === "string" ? args.model : undefined,
      };
    }

    const taskId = findTaskId(generation);
    const statusTool = taskId ? chooseStatusTool(tools) : undefined;
    if (!taskId || !statusTool) {
      return {
        success: false,
        message: `OpenArt accepted the request through ${generationTool.name}, but returned neither a video URL nor a trackable task.`,
      };
    }

    for (let attempt = 0; attempt < 45; attempt += 1) {
      await sleep(3_000);
      const status = await client.callTool(
        statusTool.name,
        buildArguments(statusTool, { ...input, taskId }),
      );
      const videoUrl = findUrl(status);
      if (videoUrl) {
        return {
          success: true,
          videoUrl,
          toolName: generationTool.name,
          model: typeof args.model === "string" ? args.model : undefined,
        };
      }
      if (outputFailed(status)) {
        return { success: false, message: "OpenArt video generation failed." };
      }
    }

    return {
      success: false,
      message: "OpenArt did not finish the video clip before KAI's production timeout.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "OpenArt video generation failed.",
    };
  }
}
