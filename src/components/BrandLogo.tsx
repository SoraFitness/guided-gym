import { useEffect, useState } from "react";
import { getBrandLogoUrl } from "@/lib/foodImages";
import { cn } from "@/lib/utils";

export function BrandLogo({ brand, className }: { brand?: string; className?: string }) {
  const logoUrl = getBrandLogoUrl(brand);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoUrl]);

  if (!logoUrl || failed) return null;

  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-black/10",
        className,
      )}
    >
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-contain"
      />
    </span>
  );
}
