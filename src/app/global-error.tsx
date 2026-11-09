"use client";

import { ErrorScreen } from "@/components/ErrorScreen";
import "./globals.css";

// Only when the root layout itself fails: it replaces the layout, so it brings its own document and styles (no header or footer).
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-IE">
      <body className="flex min-h-dvh flex-col">
        <ErrorScreen retry={() => retry()} />
      </body>
    </html>
  );
}
