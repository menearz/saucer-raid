import type { ReactNode } from "react";

export const authEnabled = false;

export function useCurrentUserState() {
  return { user: null, isPending: false };
}

export function useCurrentUser() {
  return null;
}

export function SignedIn(_props: { children: ReactNode }) {
  return null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  return children;
}

export function UserButton() {
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}
