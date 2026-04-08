type BackgroundPathsProps = {
  className?: string;
};

const staticPaths = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  d: `M-${320 - i * 14} ${-90 + i * 18}C${120 + i * 8} ${20 + i * 10} ${420 +
    i * 3} ${160 + i * 6} ${760 + i * 2} ${330 + i * 4}`,
  width: 0.7 + i * 0.05,
  opacity: 0.09 + i * 0.02,
}));

export function BackgroundPaths({ className = "" }: BackgroundPathsProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#ffe7a8]/35 blur-3xl" />

      <svg
        className="h-full w-full"
        viewBox="0 0 760 360"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {staticPaths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
          />
        ))}
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,249,228,0.46),transparent_36%),radial-gradient(circle_at_85%_18%,rgba(255,238,183,0.28),transparent_34%)]" />
    </div>
  );
}
