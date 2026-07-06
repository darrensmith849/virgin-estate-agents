"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Send, RotateCcw, ArrowUpRight } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi 👋 I'm the Virgin Estate assistant. Ask me anything about buying, selling or renting in Harare — or pick a topic below.";

// Quick options. `prompt` ones ask the assistant; `href` ones jump to a page.
const QUICK: { label: string; prompt?: string; href?: string }[] = [
  { label: "Areas you cover", prompt: "Which areas of Harare do you cover?" },
  { label: "Arrange a viewing", prompt: "How do I arrange a viewing?" },
  {
    label: "Sell or let my property",
    prompt:
      "I'm thinking of selling or letting my property — how does it work and how do I get a valuation?",
  },
  { label: "Do you do rentals?", prompt: "Do you handle rentals and lettings?" },
  { label: "Your services", prompt: "What services do you offer?" },
  { label: "Buying process", prompt: "How does buying a home with you work?" },
  { label: "Browse listings", href: "/listings" },
  { label: "Talk to the team", href: "/contact" },
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            data.reply ||
            "Sorry — please try again, or WhatsApp us and the team will help.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "I couldn't connect just then — please try again, or reach us on WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const reset = () => setMessages([{ role: "assistant", content: GREETING }]);
  const last = messages[messages.length - 1];
  const showChips = !loading && last.role === "assistant";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the Virgin Estate assistant"
          className="group fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-brand py-3 pl-3 pr-4 text-white shadow-lg shadow-brand/30 transition-transform duration-300 ease-out hover:scale-105 hover:bg-brand-700"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Sparkles size={18} />
          </span>
          <span className="text-sm font-medium">Ask us</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-4 left-4 z-50 flex max-h-[min(82vh,36rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl sm:left-auto sm:right-6 sm:w-[23rem]">
          {/* Header — branded */}
          <div className="flex items-center justify-between gap-3 bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles size={18} />
              </span>
              <div className="leading-tight">
                <p className="font-serif text-base">Virgin Estate</p>
                <p className="flex items-center gap-1.5 text-[0.7rem] text-white/80">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Assistant · online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Start over"
                  title="Start over"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw size={13} /> Start over
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-paper-2 px-3.5 py-2 text-sm leading-relaxed text-ink-soft"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-paper-2 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                </div>
              </div>
            )}

            {/* Quick options — reappear after every reply, so you can always pick another */}
            {showChips && (
              <div className="pt-1">
                {messages.length > 1 && (
                  <p className="mb-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted">
                    Or pick a topic
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((c) =>
                    c.href ? (
                      <Link
                        key={c.label}
                        href={c.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand hover:text-brand"
                      >
                        {c.label}
                        <ArrowUpRight size={12} />
                      </Link>
                    ) : (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => send(c.prompt!)}
                        className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand hover:text-brand"
                      >
                        {c.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about property in Harare…"
              className="min-w-0 flex-1 rounded-full border border-line bg-paper-2 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
