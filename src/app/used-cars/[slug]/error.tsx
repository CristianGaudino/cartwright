"use client";

import { useParams } from "next/navigation";
import { ErrorScreen } from "@/components/ErrorScreen";

// Covers car pages and the landing pages under this segment. It never changes a 404 or 410 status.
// Nothing is logged: the error and the URL are request data.
export default function SegmentError({ retry }: { error: unknown; retry: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const isCar = /-\d+$/.test(slug);
  return <ErrorScreen title={isCar ? "We Couldn't Load This Car" : "We Couldn't Load the Cars"} button={isCar ? "Try Loading the Car Again" : "Try Loading Cars Again"} retry={() => retry()} />;
}
