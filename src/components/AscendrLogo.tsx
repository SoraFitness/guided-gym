import { cn } from "@/lib/utils";

interface AscendrLogoProps {
  className?: string;
  decorative?: boolean;
}

/** The primary Ascendr mark for brand moments, not everyday navigation. */
export function AscendrLogo({ className, decorative = false }: AscendrLogoProps) {
  return (
    <img
      src="/media/ascendr-logo.png"
      alt={decorative ? "" : "Ascendr"}
      aria-hidden={decorative || undefined}
      className={cn("aspect-square shrink-0 object-cover", className)}
    />
  );
}
