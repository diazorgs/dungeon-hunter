import type { ButtonHTMLAttributes, Ref } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  ref?: Ref<HTMLButtonElement>;
};

/** DESIGN.md §11.4: hover amber border, always-visible bone focus ring, 1 px press. */
export function PixelButton({ variant = "primary", className = "", ...props }: Props) {
  const look =
    variant === "primary" ? "border-steel-700 bg-steel-800" : "border-transparent bg-transparent";
  return (
    <button
      type="button"
      className={`border-2 px-4 py-2 text-left text-base text-steel-200 uppercase ${look} hover:border-amber-500 aria-checked:border-amber-500 aria-pressed:border-amber-500 aria-selected:border-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:text-steel-600 disabled:hover:border-steel-700 ${className}`}
      {...props}
    />
  );
}
