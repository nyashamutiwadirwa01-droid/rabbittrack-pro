// (Rabbit icon import removed — replaced by the custom RabbitMark below.)

function RabbitMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <rect x="372" y="140" width="120" height="360" rx="60" transform="rotate(-10 432 320)" />
        <rect x="532" y="140" width="120" height="360" rx="60" transform="rotate(10 592 320)" />
        <circle cx="512" cy="640" r="230" />
      </g>
    </svg>
  );
}

export function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }[size];
  const icon = { sm: 18, md: 22, lg: 30 }[size];
  return (
    <div className={`inline-flex items-center justify-center rounded-xl2 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft ${dims} ${className}`}>
      <RabbitMark size={icon} />
    </div>
  );
}

export function Wordmark({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size];
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <div className="leading-tight">
        <div className={`font-display font-extrabold tracking-tight text-slate-900 dark:text-white ${text}`}>
          RabbitTrack <span className="text-brand-600">Pro</span>
        </div>
      </div>
    </div>
  );
}
