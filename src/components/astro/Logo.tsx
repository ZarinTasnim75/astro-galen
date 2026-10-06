export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="11" className="fill-primary" />
      <ellipse cx="20" cy="20" rx="18" ry="7" transform="rotate(-24 20 20)" fill="none" className="stroke-cyan" strokeWidth="1.6" />
      <path d="M11 20.5h4.2l2-4.5 3 9 2.4-6 1.4 1.5H29" fill="none" className="stroke-primary-foreground" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35.2" cy="13" r="1.8" className="fill-cyan" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground">AstroGalen</div>
        <div className="eyebrow mt-1 text-[0.6rem]">Health · Mission</div>
      </div>
    </div>
  );
}
