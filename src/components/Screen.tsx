import type { ReactNode } from "react";
export function Screen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
export function assetUrl(uri: string): string {
  return uri.startsWith("/assets/")
    ? `${import.meta.env.BASE_URL}${uri.slice(1)}`
    : uri;
}
