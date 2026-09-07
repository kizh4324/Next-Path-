/** App shell: header, language selector, main region, footer, and the chatbot FAB. */

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { ChatbotFAB } from '@/components/chat/ChatbotFAB';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

const STUDENT_NAV = [
  { to: '/results', label: 'My Options' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/courses', label: 'Courses' },
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/guardian', label: 'For Parents' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Account' },
];

const COUNSELOR_NAV = [
  { to: '/counselor', label: 'Triage Queue' },
  { to: '/settings', label: 'Account' },
];

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
      className="border-b border-hairline bg-canvas-soft px-md py-xs text-center text-caption text-ink"
    >
      <span className="font-semibold">Offline Mode:</span> Your saved pathways and roadmap progress remain securely stored on this device.
    </div>
  );
}

export function AppHeader(): JSX.Element {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  const links = user?.role === 'counselor' || user?.role === 'admin' ? COUNSELOR_NAV : STUDENT_NAV;

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-content items-center justify-between gap-md px-md py-sm">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-xs text-title font-bold text-ink tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-on-primary text-body font-bold shadow-sm"
          >
            N
          </span>
          <span>Next_Path</span>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-md py-1.5 text-body-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-canvas-container text-primary font-semibold border border-hairline'
                      : 'text-ink-secondary hover:text-ink hover:bg-canvas-soft',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right Actions: Language Selector & Auth */}
        <div className="flex items-center gap-xs">
          {/* Language Selector */}
          <div className="relative">
            <select
              aria-label="Choose interface language"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="h-8 rounded-full border border-hairline bg-surface px-2.5 pr-6 text-caption font-medium text-ink-secondary hover:bg-canvas-soft focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted">
              ▼
            </span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-xs">
              <span className="hidden text-caption text-ink-muted lg:inline border-l border-hairline pl-xs">
                {user?.full_name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-ghost text-xs px-2.5 py-1 min-h-touch text-ink-muted hover:text-error"
              >
                Sign out
              </button>
              <button
                type="button"
                aria-label="Open mobile menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="btn-utility min-h-touch px-sm md:hidden"
              >
                {menuOpen ? 'Close' : 'Menu'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-xs">
              <Link to="/login" className="btn-utility text-xs px-3 py-1.5">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary text-xs px-3.5 py-1.5">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {isAuthenticated && menuOpen && (
        <nav aria-label="Mobile" className="border-t border-hairline bg-surface p-sm md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center min-h-touch rounded-md px-md text-body-sm font-medium',
                    isActive ? 'bg-canvas-container font-semibold text-primary' : 'text-ink-secondary hover:bg-canvas-soft',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="mt-4xl border-t border-hairline bg-surface">
      <div className="mx-auto max-w-content px-md py-xl text-caption text-ink-muted">
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-body-sm font-semibold text-ink">Editorial & Evidence Standards</p>
            <p className="mt-xs leading-relaxed max-w-[40ch]">
              Next_Path is designed for thoughtful career exploration. We do not produce algorithmic verdicts or rank human potential. All pathway statistics include verified source attribution and date timestamps.
            </p>
          </div>
          <div>
            <p className="text-body-sm font-semibold text-ink">Data Sovereignty & Privacy</p>
            <p className="mt-xs leading-relaxed max-w-[40ch]">
              Compliant with the Digital Personal Data Protection (DPDP) Act. You retain full ownership of your data with one-click complete profile erasure at any time in Account Settings.
            </p>
          </div>
          <div>
            <p className="text-body-sm font-semibold text-ink">Student Safety & Emergency Helplines</p>
            <p className="mt-xs leading-relaxed">
              If you are facing acute stress, exams pressure, or family crisis:
            </p>
            <ul className="mt-xs space-y-1 font-medium text-ink">
              <li>• Tele-MANAS (24x7 Free): <a href="tel:14416" className="text-primary hover:underline">14416</a></li>
              <li>• KIRAN Mental Health: <a href="tel:18005990019" className="text-primary hover:underline">1800-599-0019</a></li>
              <li>• National Emergency Helpline: <a href="tel:112" className="text-primary hover:underline">112</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-xl border-t border-hairline pt-md flex flex-wrap items-center justify-between gap-sm text-caption text-ink-faint">
          <p>© 2026 Next_Path — AI Career Decision Companion for Indian Students.</p>
          <p>Indian Curricula, CBSE/ICSE, Entrance Pathways (JEE, NEET, CUET, CLAT, CAT, GATE).</p>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout(): JSX.Element {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
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
