type BackgroundPathsProps = {
  className?: string;
};

type FloatingPathsProps = {
  position: number;
};

function getPathDuration(id: number, position: number) {
  const seed = Math.abs((id + 1) * 997 + position * 389);
  return 20 + (seed % 1000) / 100;
}

function FloatingPaths({ position }: FloatingPathsProps) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    opacity: 0.1 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="h-full w-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <title>Background Paths</title>
        {paths.map((path) => {
          const duration = getPathDuration(path.id, position);

          return (
            <path
              key={`${position}-${path.id}`}
              d={path.d}
              pathLength={1}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.opacity}
              strokeDasharray="0.3 1"
              strokeDashoffset="0"
            >
              <animate
                attributeName="stroke-dasharray"
                values="0.3 1;1 0;0.3 1"
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dashoffset"
                values="0;-1;0"
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.6;0.3"
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
            </path>
          );
        })}
      </svg>
    </div>
  );
}

export function BackgroundPaths({ className = "" }: BackgroundPathsProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}
