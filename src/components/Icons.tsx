/* Единый набор инлайн-SVG-иконок в стиле Lucide/Feather:
 * только stroke (без заливок), currentColor, скруглённые концы.
 * Размер задаётся через className, по умолчанию h-5 w-5. */
import type { ReactNode } from "react";

interface IconProps {
  className?: string;
}

function Base({
  className = "h-5 w-5",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Base>
  );
}

export function IconUtilities({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </Base>
  );
}

export function IconSubscription({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Base>
  );
}

export function IconCard({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </Base>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </Base>
  );
}

export function IconTrendDown({ className }: IconProps) {
  return (
    <Base className={className}>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </Base>
  );
}

export function IconTrendUp({ className }: IconProps) {
  return (
    <Base className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Base>
  );
}
