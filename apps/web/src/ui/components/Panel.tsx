import type { ReactNode } from "react";

/** Ink fill, 2 px steel-700 border, 2 px steel-900 inner bevel; square corners. */
export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-2 border-steel-700 bg-ink p-4 shadow-[inset_0_0_0_2px_var(--color-steel-900)] ${className}`}
    >
      {title ? <h2 className="mb-4 text-2xl text-steel-200 uppercase">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-steel-700 bg-steel-900 p-2 ${className}`}>{children}</div>
  );
}
