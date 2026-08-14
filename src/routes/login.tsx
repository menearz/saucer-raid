import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
          Saucer Raid
        </p>
        <h1 className="font-display mt-1 text-4xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Keep your best raid on this device after you sign in.</p>
        <div className="mt-5 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="h-12 w-full rounded-[16px] border border-border bg-surface-2 text-sm font-medium text-fg hover:bg-fg/5"
              >
                Continue with {p.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link to="/" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:underline">
          Back to the valley
        </Link>
      </div>
    </main>
  );
}
