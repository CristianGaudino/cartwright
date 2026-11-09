import type { Metadata } from "next";
import Image from "next/image";
import { FeatureCard, TitleText } from "@/components/Feature";
import { CheckIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DirectionsButton } from "@/components/DirectionsButton";
import { OpeningHours } from "@/components/OpeningHours";
import { pageMain, pageTitle, subTitle } from "@/components/ui";
import { dealerDirectionsUrl } from "@/lib/dealer";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "About Us", description: `${SITE_NAME} is a used car dealer in Tralee, Co. Kerry: a carefully selected range of used cars, finance help and trade-ins.` };

// The dealer's own story replaces this copy: no history, awards, years trading or staff names are invented here.
const WHY = [
  { Icon: CheckIcon, title: "Carefully Selected Cars", text: "A range of used cars chosen with care, each shown with its details and photos." },
  { Icon: ShieldCheckIcon, title: "Straightforward Buying", text: "Plain answers and no pressure. Ask us anything about a car before you decide." },
  { Icon: SwapIcon, title: "Finance and Trade-Ins", text: "Estimate your monthly payment online, and get a valuation on the car you're trading in." },
];
const EXPECT = [
  { title: "Browse", text: "Look through the stock online, save the cars you like and compare them." },
  { title: "Get in touch", text: "Enquire, book a test drive, or call us. We'll answer your questions." },
  { title: "Come and See It", text: "Visit us in Tralee, see the car and take it for a drive." },
];

export default function AboutPage() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>About Us</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">{SITE_NAME} is a used car dealer in Tralee, Co. Kerry. Call in, look around and ask us anything.</p>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12">
        {/* On a phone the photo comes first; from 1024px it sits on the right with the hours under it. */}
        <div className="flex flex-col gap-6 lg:order-2">
          <Image src="/brand/about.webp" width={1200} height={900} alt="" className="aspect-[4/3] w-full rounded-card object-cover" />
          <OpeningHours />
          <DirectionsButton href={dealerDirectionsUrl()} />
        </div>
        <div className="flex flex-col gap-10 lg:order-1">
          <section className="flex flex-col gap-4">
            <h2 className={subTitle}>Why Choose Us</h2>
            <ul className="grid grid-cols-1 gap-3">
              {WHY.map(({ Icon, ...f }) => (
                <FeatureCard key={f.title} badge={<Icon className="size-6" />} {...f} />
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className={subTitle}>What to Expect</h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {EXPECT.map((s, i) => (
                <li key={s.title} className="flex gap-4 sm:flex-col">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-text font-semibold text-ink">{i + 1}</span>
                  <TitleText title={s.title} text={s.text} />
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
