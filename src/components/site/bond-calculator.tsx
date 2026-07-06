"use client";

import { useState } from "react";

import { formatPrice } from "@/lib/utils";

/*
 * BondCalculator — an indicative USD bond/affordability calculator. Pure
 * client-side maths (standard amortisation), no dependencies. Pre-filled with
 * the listing price; users adjust deposit, rate and term.
 */
export function BondCalculator({ price }: { price: number }) {
  const [depositPct, setDepositPct] = useState(10);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(20);

  const loan = Math.max(0, Math.round(price - (price * depositPct) / 100));
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly =
    r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const sliders = [
    {
      id: "deposit",
      label: "Deposit",
      value: depositPct,
      set: setDepositPct,
      min: 0,
      max: 50,
      step: 5,
      out: `${depositPct}%`,
    },
    {
      id: "rate",
      label: "Interest rate",
      value: rate,
      set: setRate,
      min: 5,
      max: 25,
      step: 0.5,
      out: `${rate}%`,
    },
    {
      id: "term",
      label: "Term",
      value: years,
      set: setYears,
      min: 5,
      max: 30,
      step: 1,
      out: `${years} yrs`,
    },
  ];

  return (
    <div className="ve-card rounded-2xl p-6 sm:p-7">
      <h3 className="text-lg">Bond repayment calculator</h3>
      <p className="mt-1 text-sm text-muted">
        An indicative monthly repayment, in USD.
      </p>

      <div className="mt-5 space-y-5">
        {sliders.map((s) => (
          <div key={s.id}>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={s.id} className="text-ink-soft">
                {s.label}
              </label>
              <span className="font-medium text-ink tabular-nums">{s.out}</span>
            </div>
            <input
              id={s.id}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="mt-2 w-full accent-brand"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm text-muted">Estimated monthly repayment</p>
        <p className="mt-1 font-serif text-3xl text-brand tabular-nums">
          {formatPrice(Math.round(monthly))}
          <span className="text-base font-normal text-muted"> /mo</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Loan of {formatPrice(loan)} over {years} years at {rate}%. Indicative
          only — not a quote or an offer of finance.
        </p>
      </div>
    </div>
  );
}
