"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginBody() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="font-display text-sm tracking-[0.2em] text-[var(--accent)] uppercase">
        FinSheet
      </p>
      <h1 className="font-display mt-3 text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
        Your sheets.
        <br />
        Clearer view.
      </h1>
      <p className="mt-4 max-w-md text-[var(--muted)]">
        Sign in with the Google account that owns your B(Y) / B(M) workbooks.
        Access is limited to an allow-list.
      </p>

      {error ? (
        <p className="mt-6 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error === "AccessDenied"
            ? "This Google account is not on the allow-list."
            : "Sign-in failed. Check OAuth credentials and try again."}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="mt-10 inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1a1510] transition hover:brightness-110"
      >
        Continue with Google
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-[var(--muted)]">Loading…</main>}>
      <LoginBody />
    </Suspense>
  );
}
