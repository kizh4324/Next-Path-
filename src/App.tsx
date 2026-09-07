/** Route tree and auth gating. */

import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, type ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStatus } from '@/hooks/useRecommendations';
import { AuthView } from '@/views/AuthView';
import { CareerComparisonView } from '@/views/CareerComparisonView';
import { CareerDetailView } from '@/views/CareerDetailView';
import { CounselorQueueView } from '@/views/CounselorQueueView';
import { CoursesView } from '@/views/CoursesView';
import { GuardianSummaryView } from '@/views/GuardianSummaryView';
import { OnboardingWizard } from '@/views/OnboardingWizard';
import { ResultsDashboard } from '@/views/ResultsDashboard';
import { RoadmapView } from '@/views/RoadmapView';
import { ScholarshipsView } from '@/views/ScholarshipsView';
import { SettingsView } from '@/views/SettingsView';

// Recharts is ~150 KB gzipped and P1-only (FR-28). Loading it lazily keeps it off
// the critical path for a student on a basic phone who never opens this screen.
const ProgressDashboard = lazy(() =>
  import('@/views/ProgressDashboard').then((module) => ({ default: module.ProgressDashboard })),
);

function FullPageSpinner(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft">
      <Spinner label="Loading…" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireCounselor({ children }: { children: ReactNode }): JSX.Element {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'counselor' && user.role !== 'admin') {
    return <Navigate to="/results" replace />;
  }
  return <>{children}</>;
}

/** Send each role to the screen that is actually useful to them. */
function HomeRedirect(): JSX.Element {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: status, isLoading: statusLoading } = useProfileStatus(isAuthenticated);

  if (isLoading || (isAuthenticated && statusLoading)) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'counselor' || user?.role === 'admin') {
    return <Navigate to="/counselor" replace />;
  }
  if (user?.role === 'guardian') {
    return <Navigate to="/guardian" replace />;
  }
  const hasCompletedLocal =
    typeof window !== 'undefined' && window.localStorage.getItem('onboarding_completed') === 'true';
  if (status?.profile_exists || hasCompletedLocal) {
    return <Navigate to="/results" replace />;
  }
  return <Navigate to="/onboarding" replace />;
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<AuthView />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/results" element={<ResultsDashboard />} />
        <Route path="/careers/:careerId" element={<CareerDetailView />} />
        <Route path="/compare" element={<CareerComparisonView />} />
        <Route path="/roadmap" element={<RoadmapView />} />
        <Route path="/courses" element={<CoursesView />} />
        <Route path="/scholarships" element={<ScholarshipsView />} />
        <Route path="/guardian" element={<GuardianSummaryView />} />
        <Route
          path="/progress"
          element={
            <Suspense fallback={<Spinner label="Loading charts…" />}>
              <ProgressDashboard />
            </Suspense>
          }
        />
        <Route path="/settings" element={<SettingsView />} />
        <Route
          path="/counselor"
          element={
            <RequireCounselor>
              <CounselorQueueView />
            </RequireCounselor>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
