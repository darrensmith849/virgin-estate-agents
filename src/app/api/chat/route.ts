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
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_AI_TOKEN?: string;
  };

  // 1) Prefer the external LLM (OpenAI or xAI/Grok) when a key is configured.
  //    Default endpoint is OpenAI; set OPENAI_BASE_URL=https://api.x.ai/v1 for Grok.
  if (e.OPENAI_API_KEY) {
    const reply = await askChatCompletion(
      e.OPENAI_BASE_URL || "https://api.openai.com/v1",
      e.OPENAI_API_KEY,
      e.OPENAI_MODEL || "gpt-4o-mini",
      messages,
    );
    if (reply) {
      console.log(`[chat] answered via external LLM (${e.OPENAI_BASE_URL || "openai"})`);
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
  console.log(
    e.OPENAI_API_KEY
      ? "[chat] external LLM failed — answered via Workers AI fallback"
      : "[chat] no external LLM key set — answered via Workers AI",
  );
  return Response.json({ reply: reply || FALLBACK });
}
