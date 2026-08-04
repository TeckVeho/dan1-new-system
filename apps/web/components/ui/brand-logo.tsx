import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 500;
const LOGO_HEIGHT = 70;

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="株式会社 談 DAN CO., LTD."
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
