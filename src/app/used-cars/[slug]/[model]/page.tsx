import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLanding } from "@/components/landing/data";
import { LandingPage } from "@/components/landing/LandingPage";
import { landingMetadata, landingPath } from "@/lib/stock/landing";

// resolveLanding checks the make and the model against taxonomy(); anything unknown is a 404 before rendering (T-02-20).
export async function generateMetadata({ params }: PageProps<"/used-cars/[slug]/[model]">): Promise<Metadata> {
  const { slug, model } = await params;
  const data = await resolveLanding(slug, model);
  return data ? landingMetadata(data.landing, data.facts, landingPath(data.landing)) : {};
}

export default async function ModelPage({ params }: PageProps<"/used-cars/[slug]/[model]">) {
  const { slug, model } = await params;
  const data = await resolveLanding(slug, model);
  if (!data) notFound();
  return <LandingPage data={data} />;
}
