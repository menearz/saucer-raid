import type { AnchorHTMLAttributes, ReactNode } from "react";

export function Link({
  to,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string; children?: ReactNode }) {
  return (
    <a href={to ?? rest.href} {...rest}>
      {children}
    </a>
  );
}

export function Navigate() {
  return null;
}

export function Outlet() {
  return null;
}

export function createFileRoute() {
  return () => ({});
}

export function createRootRoute() {
  return {};
}

export function createRouter() {
  return {};
}
