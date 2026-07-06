"use client";

import { useEffect, useRef } from "react";

/*
 * CountUp — animates a stat value up from zero the first time it scrolls into
 * view, preserving any prefix/suffix (e.g. "$120M+", "450+", "12 yrs").
 *
 * SSR renders the final value (so no-JS / crawlers see the real number and
 * there's no hydration mismatch); on the client we drive the count imperatively
 * via the ref. Honors prefers-reduced-motion (leaves the final value in place).
 */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function parse(value: string) {
  const m = value.match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], target: Number(m[2].replace(/,/g, "")), suffix: m[3] };
}

export function CountUp({
  value,
  className,
  duration = 1400,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parsed = parse(value);
    if (!parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fmt = (n: number) =>
      `${parsed.prefix}${Math.round(n).toLocaleString("en-US")}${parsed.suffix}`;

    // Reset to the start value before the band is reached (it's below the fold,
    // so this is never seen) — then animate up once it enters the viewport.
    el.textContent = fmt(0);

    let raf = 0;
    let startTs = 0;
    let started = false;

    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / duration);
      if (t < 1) {
        el.textContent = fmt(parsed.target * easeOut(t));
        raf = requestAnimationFrame(tick);
      } else {
        el.textContent = value; // exact final string, original formatting
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    // tabular-nums keeps every digit the same width, so the figure doesn't
    // shimmy/reflow as it counts up — a small thing that reads as premium.
    <span
      ref={ref}
      className={["tabular-nums", className].filter(Boolean).join(" ")}
    >
      {value}
    </span>
  );
}
