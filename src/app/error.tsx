"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// Any page without its own error screen (the car pages have one). It keeps the header and footer.
// Nothing is logged: the error and the URL are request data.
export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen retry={() => retry()} />;
}
