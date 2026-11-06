import Image from "next/image";
import Link from "next/link";

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="focus-visible:outline-white">
          <Image src="/brand/logo.png" width={900} height={205} alt="Carright" loading="eager" className="h-8 w-auto lg:h-9" />
        </Link>
        <nav aria-label="Main">
          <Link href="/used-cars" className="font-semibold focus-visible:outline-white">
            Used cars
          </Link>
        </nav>
      </div>
    </header>
  );
}
