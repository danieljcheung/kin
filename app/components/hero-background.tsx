export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]"
    >
      <div className="hero-shader-base absolute inset-0" />
      <div className="hero-shader-orb hero-shader-orb-a" />
      <div className="hero-shader-orb hero-shader-orb-b" />
      <div className="hero-shader-orb hero-shader-orb-c" />
      <div className="hero-shader-grid absolute inset-0 opacity-50" />
      <div className="hero-shader-glow absolute inset-x-[18%] top-[12%] h-40 rounded-full" />
    </div>
  );
}
