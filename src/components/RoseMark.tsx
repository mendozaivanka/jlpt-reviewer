/** The Nordic Rose mark: a pink rounded square with a horizon line and a small sun. */
export default function RoseMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <rect x="2" y="2" width="48" height="48" rx="14" className="fill-primary" />
      <line x1="12" y1="31" x2="40" y2="31" strokeWidth="3" strokeLinecap="round" className="stroke-primary-foreground" />
      <circle cx="33" cy="22" r="4.5" className="fill-primary-foreground" />
    </svg>
  );
}
