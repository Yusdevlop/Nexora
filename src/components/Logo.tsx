export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#9DB0FF" />
          <stop offset="1" stopColor="#5BE3C0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="#131C30" />
      <rect x="112" y="272" width="80" height="128" rx="40" fill="url(#lg)" opacity=".7" />
      <rect x="216" y="208" width="80" height="192" rx="40" fill="url(#lg)" opacity=".88" />
      <rect x="320" y="112" width="80" height="288" rx="40" fill="url(#lg)" />
    </svg>
  )
}
