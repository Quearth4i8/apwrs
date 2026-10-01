import Image from "next/image";

/**
 * The ABCDryBASIN badge: a seedling breaking through dry, cracked soil.
 * The source is public/images/abcdrybasin_logo.jpg; the PNG beside it is the
 * same badge cut to a circle with transparent corners, so it sits cleanly on
 * both themes. app/icon.png and app/apple-icon.png are sized copies of it.
 */
export function Brand({ size = 30 }: { size?: number }) {
  return (
    <Image
      src="/images/abcdrybasin_logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="flex-none rounded-full"
      priority
    />
  );
}
