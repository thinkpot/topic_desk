import Image from "next/image";
import { BRAND_NAME } from "@/lib/brand";

// Source is 512×465, so the height is derived rather than guessed — passing a
// mismatched ratio to next/image would letterbox the mark.
const RATIO = 465 / 512;

/**
 * The brand mark. `alt` is empty on purpose: every use sits beside the
 * wordmark, so giving it alt text would make screen readers say the name twice.
 */
export default function Logo({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * RATIO)}
      className={className}
      priority
    />
  );
}

/** Mark plus wordmark, as used in every header. */
export function LogoLockup({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">{BRAND_NAME}</span>
    </span>
  );
}
