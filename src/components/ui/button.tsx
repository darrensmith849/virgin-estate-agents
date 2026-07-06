import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_-12px_rgba(15,33,24,0.6)] hover:bg-brand-700 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_32px_-12px_rgba(15,33,24,0.66)]",
  outline:
    "border border-line bg-transparent text-ink hover:bg-paper-2 hover:border-sand/40",
  ghost: "text-ink hover:bg-paper-2",
  subtle: "bg-paper-2 text-ink hover:bg-line",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(({ className, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={buttonVariants({ variant, size, className })}
    {...props}
  />
));
Button.displayName = "Button";
