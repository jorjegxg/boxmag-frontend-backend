"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary when the root layout itself fails: no providers or
 * i18n context are available, so the copy is static (EN + RO).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#ffffff",
          color: "#111827",
        }}
      >
        <main style={{ maxWidth: 560, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong / A apărut o eroare</h1>
          <p style={{ color: "#4b5563", fontSize: 14 }}>
            Please try again. / Te rugăm să încerci din nou.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#ef6b56",
                color: "#ffffff",
                border: 0,
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again / Încearcă din nou
            </button>
            {/* Full reload: the root layout is broken, so no client routing. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ padding: "10px 20px", color: "#374151", fontWeight: 600 }}>
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
