import Image from "next/image";
import Link from "next/link";
import { SavedLink } from "@/components/saved/SavedLink";

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="focus-visible:outline-white">
          <Image src="/brand/logo.png" width={480} height={109} alt="Carright" loading="eager" className="h-8 w-auto lg:h-9" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-2">
          <Link href="/used-cars" className="font-semibold focus-visible:outline-white">
            Used cars
          </Link>
          <SavedLink />
        </nav>
      </div>
    </header>
  );
}
