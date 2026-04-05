// Shared TripTangle mascot logo — tangled location pin with smiley face.
// Use <TripTangleLogo size={N} /> everywhere across the app.

export function TripTangleLogo({ size = 40 }: { size?: number }) {
  const height = Math.round((118 / 100) * size);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 118"
      fill="none"
      aria-label="TripTangle"
    >
      {/* Drop shadow */}
      <ellipse cx="50" cy="114" rx="18" ry="4" fill="rgba(0,0,0,0.12)" />
      {/* Pin body */}
      <path
        d="M50 6 C28 6 10 24 10 46 C10 72 50 110 50 110 C50 110 90 72 90 46 C90 24 72 6 50 6Z"
        fill="#f7ede0"
        stroke="#c4916a"
        strokeWidth="2.2"
      />
      {/* Face circle */}
      <circle cx="50" cy="44" r="27" fill="#fde8d0" stroke="#c4916a" strokeWidth="1.8" />
      {/* Colorful tangled loops */}
      <path d="M24 32 Q12 14 32 9 Q46 5 42 22" stroke="#2980B9" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M76 32 Q88 14 68 9 Q54 5 58 22" stroke="#E74C3C" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M18 52 Q4 40 9 22 Q14 10 26 24"  stroke="#27AE60" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M82 52 Q96 40 91 22 Q86 10 74 24" stroke="#F39C12" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M36 8 Q50 1 64 8" stroke="#8E44AD" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="42" cy="41" r="4.2" fill="#5d3a1a" />
      <circle cx="58" cy="41" r="4.2" fill="#5d3a1a" />
      <circle cx="43.5" cy="39.5" r="1.6" fill="white" />
      <circle cx="59.5" cy="39.5" r="1.6" fill="white" />
      {/* Rosy cheeks */}
      <circle cx="36" cy="50" r="5" fill="#f4a0a0" opacity="0.45" />
      <circle cx="64" cy="50" r="5" fill="#f4a0a0" opacity="0.45" />
      {/* Smile */}
      <path d="M41 52 Q50 60 59 52" stroke="#5d3a1a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
