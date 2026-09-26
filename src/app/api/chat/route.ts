import {
  buildSystemPrompt,
  formatListingsContext,
  type AssistantListing,
} from "@/lib/ai-knowledge";
import { listPublicListings } from "@/lib/data/listings";
import { withinRateLimit } from "@/lib/rate-limit";
import { SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** Longest we wait for a model before moving on to the next option. */
const LLM_TIMEOUT_MS = 20_000;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type LlmConfig = { baseUrl: string; apiKey: string; model: string; name: string };

/**
 * Which OpenAI-compatible provider to call.
 *
 * On Cloudflare, OPENAI_BASE_URL and OPENAI_MODEL pointed at Groq from
 * wrangler.jsonc, and only the key was a secret. Since the move to the Node
 * server only the environment file is read, so without those two settings a
 * Groq key was sent to OpenAI's endpoint, rejected, and every visitor got the
 * WhatsApp fallback. Recognise a Groq key (they start "gsk_") or GROQ_API_KEY
 * and default to Groq, so the key alone is enough. Explicit OPENAI_BASE_URL /
 * OPENAI_MODEL still win.
 */
function resolveLlm(e: {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  GROQ_API_KEY?: string;
}): LlmConfig | null {
  const apiKey = e.OPENAI_API_KEY || e.GROQ_API_KEY;
  if (!apiKey) return null;
  const isGroq =
    !e.OPENAI_BASE_URL && (Boolean(e.GROQ_API_KEY && !e.OPENAI_API_KEY) || apiKey.startsWith("gsk_"));
  const baseUrl = e.OPENAI_BASE_URL || (isGroq ? GROQ_BASE_URL : "https://api.openai.com/v1");
  const model = e.OPENAI_MODEL || (isGroq ? GROQ_MODEL : "gpt-4o-mini");
  let name = baseUrl;
  try {
    name = new URL(baseUrl).hostname;
  } catch {
    // A mistyped base URL is reported by the request itself; don't crash here.
  }
  return { baseUrl, apiKey, model, name };
}

const FALLBACK = `I'm having trouble reaching the assistant right now — please WhatsApp us on ${SITE.whatsapp}, or send a message via the contact page and a member of the team will get straight back to you.`;

/** Primary brain: any OpenAI-compatible Chat Completions API — OpenAI, xAI/Grok,
 *  etc. Returns null on any failure so the caller can fall back to Workers AI;
 *  the assistant never goes dark. */
async function askChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMsg[],
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      // A hung provider must not hold the visitor's chat open indefinitely.
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 512,
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      console.error("LLM chat error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return (data?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch (err) {
    console.error("LLM request failed:", err);
    return null;
  }
}

/** Fallback brain: Cloudflare Workers AI (Llama 3.3 70B).
 *
 *  This used to run through the Workers `AI` binding, which only exists inside
 *  the Workers runtime. Now that the app is a plain Node server on Hetzner we
 *  call the same model over the public REST API instead, which needs an account
 *  id and an API token with the Workers AI read permission. Returns null when
 *  those are unset so the caller degrades to the WhatsApp fallback message. */
async function askWorkersAI(
  accountId: string | undefined,
  apiToken: string | undefined,
  messages: ChatMsg[],
): Promise<string | null> {
  if (!accountId || !apiToken) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      {
        method: "POST",
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ messages, max_tokens: 512, temperature: 0.4 }),
      },
    );
    if (!res.ok) {
      console.error("Workers AI error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { result?: { response?: string } };
    return (data?.result?.response ?? "").trim() || null;
  } catch (err) {
    console.error("Workers AI chat error:", err);
    return null;
  }
}

const BUSY = `I'm getting a lot of questions right now — give me a minute and try again, or WhatsApp us on ${SITE.whatsapp} for an immediate reply.`;

export async function POST(req: Request): Promise<Response> {
  // This endpoint is public and every call costs a model request, so throttle
  // per IP before doing any work.
  if (!(await withinRateLimit("CHAT_LIMITER"))) {
    return Response.json({ reply: BUSY }, { status: 429 });
  }

  let incoming: unknown;
  try {
    incoming = await req.json();
  } catch {
    return Response.json({ reply: "Sorry, I didn't catch that." }, { status: 400 });
  }

  const raw = (incoming as { messages?: unknown })?.messages;
  const history: Msg[] = Array.isArray(raw)
    ? (raw as Msg[])
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim().length > 0,
        )
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({
      reply: "How can I help with your property search in Harare today?",
    });
  }

  // Pull our current live listings so the assistant answers property questions
  // with real, up-to-date data ("scan the site"). safeRead returns [] if the DB
  // is unavailable, so this never throws and the assistant degrades gracefully.
  const { items } = await listPublicListings({ perPage: 30, sort: "newest" });
  const listingsBlock = formatListingsContext(
    items as unknown as AssistantListing[],
  );

  const messages: ChatMsg[] = [
    { role: "system", content: buildSystemPrompt() },
    ...(listingsBlock
      ? [{ role: "system" as const, content: listingsBlock }]
      : []),
    ...history,
  ];

  // Running as a Node server now, so config comes from the process environment
  // (/etc/virgin-prod.env) rather than a Workers binding.
  const e = process.env as {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    OPENAI_BASE_URL?: string;
    GROQ_API_KEY?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_AI_TOKEN?: string;
  };

  // 1) The external LLM (Groq, OpenAI, xAI…) when a key is configured.
  const llm = resolveLlm(e);
  if (llm) {
    const reply = await askChatCompletion(llm.baseUrl, llm.apiKey, llm.model, messages);
    if (reply) {
      console.log(`[chat] answered via ${llm.name} (${llm.model})`);
      return Response.json({ reply });
    }
  }

  // 2) Fall back to Workers AI (keeps the assistant alive if the external LLM is
  //    unset or unavailable).
  const reply = await askWorkersAI(
    e.CLOUDFLARE_ACCOUNT_ID,
    e.CLOUDFLARE_AI_TOKEN,
    messages,
  );
  if (reply) {
    console.log(
      llm
        ? `[chat] ${llm.name} failed — answered via Workers AI fallback`
        : "[chat] no external LLM key set — answered via Workers AI",
    );
  } else {
    // Say so plainly: the visitor is being told to use WhatsApp instead.
    console.error(
      `[chat] no model answered (${llm ? `${llm.name} failed` : "no LLM key set"}; ` +
        `Workers AI ${e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_AI_TOKEN ? "failed" : "not configured"}) — sent the WhatsApp fallback`,
    );
  }
  return Response.json({ reply: reply || FALLBACK });
}
