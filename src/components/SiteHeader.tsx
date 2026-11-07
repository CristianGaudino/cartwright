import Image from "next/image";
import Link from "next/link";

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="focus-visible:outline-white">
          <Image src="/brand/logo.png" width={480} height={109} alt="Carright" loading="eager" className="h-8 w-auto lg:h-9" />
        </Link>
        {/* Below 1024px only Used cars fits beside the logo; the footer carries the rest (UI-SPEC Header). */}
        <nav aria-label="Main" className="flex items-center gap-6">
          <Link href="/used-cars" className="font-semibold focus-visible:outline-white">
            Used cars
          </Link>
          <Link href="/sell-your-car" className="hidden font-semibold focus-visible:outline-white lg:inline">
            Sell your car
          </Link>
          <Link href="/find-a-car" className="hidden font-semibold focus-visible:outline-white lg:inline">
            Find a car
          </Link>
        </nav>
      </div>
    </header>
  );
}
