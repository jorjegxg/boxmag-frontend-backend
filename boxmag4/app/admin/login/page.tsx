"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const configError = searchParams.get("error") === "config";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    configError
      ? "Parola de admin nu este configurată pe server."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Autentificare eșuată.");
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Autentificare eșuată.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Boxmag
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Acces admin</h1>
        <p className="mt-2 text-sm text-gray-600">
          Introdu parola de admin pentru a continua.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label
              htmlFor="admin-password"
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Parolă
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-my-red px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Se autentifică..." : "Autentificare"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-my-red hover:underline">
            Înapoi la site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-gray-600">
          Se încarcă...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
