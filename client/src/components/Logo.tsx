import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-serif text-[19px] font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path d="M21.5 11.2A6.5 6.5 0 1 0 21.5 20.8" fill="none" strokeWidth="3.6" strokeLinecap="round" className="stroke-bg" />
      </svg>
      Career Log
    </Link>
  );
}
