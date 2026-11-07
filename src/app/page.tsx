import { connection } from "next/server";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { getReviews } from "@/lib/reviews";

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Carright</h1>
      <p>Used cars in Tralee. Site coming soon.</p>
      <div className="mt-12">
        <ReviewsStrip data={await getReviews()} />
      </div>
    </main>
  );
}
