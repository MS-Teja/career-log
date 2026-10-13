import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, FileText, LogOut, Menu, PenLine, Settings, Shield, X } from 'lucide-react';
import { useBadges } from '@/api/hooks';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { buttonClass } from './ui/Button';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
    isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
  );

function Count({ n, label }: { n?: number; label: string }) {
  if (!n) return null;
  return (
    <span className="meta rounded-full bg-accent px-1.5 text-[10px] leading-4 text-accent-fg" aria-label={`${n} ${label}`}>
      {n}
    </span>
  );
}

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { data: badges } = useBadges(!!user);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Close menus on outside click or Escape (returning focus to the trigger).
  useEffect(() => {
    if (!menuOpen && !mobileOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menuOpen) menuButton.current?.focus();
      setMenuOpen(false);
      setMobileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, mobileOpen]);

  // Move focus into the account menu when it opens.
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  const canSubmit = user && (user.role === 'senior' || user.role === 'admin');
  const adminCount = (badges?.reviewQueue ?? 0) + (badges?.seniorRequests ?? 0);
  const totalBadge = (badges?.changesRequested ?? 0) + adminCount;

  const links = (
    <>
      <NavLink to="/browse" className={navClass}>
        Browse
      </NavLink>
      <NavLink to="/questions" className={navClass}>
        Questions
      </NavLink>
      <NavLink to="/companies" className={navClass} end={false}>
        Companies
      </NavLink>
      {user && (
        <NavLink to="/prep" className={navClass}>
          My prep
        </NavLink>
      )}
      {user?.role === 'admin' && (
        <NavLink to="/admin" className={navClass}>
          Admin <Count n={adminCount} label="items need review" />
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-bg/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="container-page flex h-full items-center gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {canSubmit && (
            <Link to="/submit" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Share experience
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={menuButton}
                onClick={() => setMenuOpen((o) => !o)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent"
                aria-label={`Account menu${totalBadge ? `, ${totalBadge} notifications` : ''}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="account-menu"
              >
                {user.name.charAt(0).toUpperCase()}
                {totalBadge > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-bg bg-danger" aria-hidden />
                )}
              </button>
              {menuOpen && (
                <div
                  id="account-menu"
                  role="menu"
                  className="absolute right-0 mt-2 w-60 animate-fade-in rounded-lg border border-border bg-surface p-1 shadow-lg"
                >
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="meta capitalize">{user.role}</p>
                  </div>
                  {canSubmit && (
                    <MenuLink to="/me/posts" icon={<FileText className="h-4 w-4" />}>
                      My posts <Count n={badges?.changesRequested} label="posts need changes" />
                    </MenuLink>
                  )}
                  <MenuLink to="/bookmarks" icon={<Bookmark className="h-4 w-4" />}>
                    Bookmarks
                  </MenuLink>
                  <MenuLink to="/settings" icon={<Settings className="h-4 w-4" />}>
                    Settings
                  </MenuLink>
                  {user.role === 'admin' && (
                    <MenuLink to="/admin" icon={<Shield className="h-4 w-4" />}>
                      Admin <Count n={adminCount} label="items need review" />
                    </MenuLink>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => {
                      signOut();
                      navigate('/');
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:outline-none"
                  >
                    <LogOut className="h-4 w-4" aria-hidden /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" state={{ from: pathname }} className={buttonClass('ghost', 'sm', 'hidden sm:inline-flex')}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClass('primary', 'sm')}>
                Join
              </Link>
            </>
          )}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Main" className="flex flex-col gap-1 border-b border-border bg-bg px-4 py-3 md:hidden">
          {links}
          {canSubmit && (
            <NavLink to="/submit" className={navClass}>
              Share experience
            </NavLink>
          )}
          {!user && (
            <NavLink to="/login" className={navClass}>
              Sign in
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
}

function MenuLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink focus:outline-none"
    >
      <span aria-hidden>{icon}</span>
      {children}
    </Link>
  );
}
