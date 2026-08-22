/** App shell: header, main region, footer, and the chatbot FAB. */

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { ChatbotFAB } from '@/components/chat/ChatbotFAB';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const STUDENT_NAV = [
  { to: '/results', label: 'My options' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/guardian', label: 'For parents' },
  { to: '/progress', label: 'Progress' },
];

const COUNSELOR_NAV = [{ to: '/counselor', label: 'Triage queue' }];

function OfflineBanner(): JSX.Element | null {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = (): void => setOffline(true);
    const goOnline = (): void => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-hairline bg-canvas-soft px-md py-xs text-center text-caption text-ink-secondary"
    >
      You are offline. Saved pages still work, and your progress is kept on this device.
    </div>
  );
}

export function AppHeader(): JSX.Element {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = user?.role === 'counselor' || user?.role === 'admin' ? COUNSELOR_NAV : STUDENT_NAV;

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-content items-center gap-md px-md py-sm">
        <Link to="/" className="flex items-center gap-xs text-title text-ink">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-on-primary text-body-sm font-bold"
          >
            N
          </span>
          Next_Path
        </Link>

        {isAuthenticated && (
          <>
            <nav aria-label="Main" className="ml-auto hidden items-center gap-xxs md:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-sm py-xxs text-body-sm transition-colors',
                      isActive
                        ? 'bg-canvas-soft text-ink font-medium'
                        : 'text-ink-secondary hover:bg-canvas-soft',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-xs md:ml-0">
              <span className="hidden text-caption text-ink-muted sm:inline">
                {user?.full_name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-ghost min-h-touch px-sm text-body-sm"
              >
                Sign out
              </button>
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="btn-utility min-h-touch px-sm md:hidden"
              >
                Menu
              </button>
            </div>
          </>
        )}
      </div>

      {isAuthenticated && menuOpen && (
        <nav aria-label="Mobile" className="border-t border-hairline bg-surface md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block min-h-touch px-md py-sm text-body-sm',
                  isActive ? 'bg-canvas-soft font-medium text-ink' : 'text-ink-secondary',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="mt-4xl border-t border-hairline bg-surface">
      <div className="mx-auto max-w-content px-md py-lg text-caption text-ink-muted">
        <p className="max-w-[70ch]">
          Next_Path helps you compare options and plan a next step. It does not predict
          your future, rank your ability, or replace a conversation with someone who
          knows you. Where we have no verified evidence, we say so rather than guess.
        </p>
        <p className="mt-xs">
          Career data derived from O*NET 30.3 (CC BY 4.0, US Department of Labor),
          modified for Indian pathways. Scholarship and job-market figures are cached
          from public sources — the official portal is always authoritative.
        </p>
        <p className="mt-xs text-ink-faint">
          In distress? Tele-MANAS 14416 · KIRAN 1800-599-0019 · Emergency 112
        </p>
      </div>
    </footer>
  );
}

export function AppLayout(): JSX.Element {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas-soft">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <OfflineBanner />
      <AppHeader />
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-md py-lg">
        <Outlet />
      </main>
      <Footer />
      {isAuthenticated && <ChatbotFAB />}
    </div>
  );
}
