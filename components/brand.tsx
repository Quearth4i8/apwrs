/**
 * The APWRS mark: a hairline square holding a seed form with a teal
 * counter-square — a drawn object, like everything else in the system.
 */
export function Brand({ size = 26 }: { size?: number }) {
  const s = size / 26;
  return (
    <span
      className="relative grid flex-none place-items-center border border-accent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="bg-accent"
        style={{ width: 10 * s, height: 14 * s, transform: `translate(${3 * s}px, ${-2 * s}px)` }}
      />
      <span
        className="absolute bg-teal"
        style={{ left: 5 * s, bottom: 5 * s, width: 6 * s, height: 6 * s }}
      />
    </span>
  );
}
