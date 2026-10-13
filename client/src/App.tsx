import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Skeleton } from '@/components/ui/Skeleton';
import Home from '@/pages/Home';

const Browse = lazy(() => import('@/pages/Browse'));
const ExperienceDetail = lazy(() => import('@/pages/ExperienceDetail'));
const Companies = lazy(() => import('@/pages/Companies'));
const CompanyPage = lazy(() => import('@/pages/CompanyPage'));
const Submit = lazy(() => import('@/pages/Submit'));
const MyPosts = lazy(() => import('@/pages/MyPosts'));
const Bookmarks = lazy(() => import('@/pages/Bookmarks'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const VerifyOtp = lazy(() => import('@/pages/VerifyOtp'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const Questions = lazy(() => import('@/pages/Questions'));
const Compare = lazy(() => import('@/pages/Compare'));
const Prep = lazy(() => import('@/pages/Prep'));
const Settings = lazy(() => import('@/pages/Settings'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const seniorRoles = ['senior', 'admin'] as const;

export default function App() {
  return (
    <>
      <Navbar />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Suspense
          fallback={
            <div className="container-page space-y-3 py-10">
              <Skeleton className="h-9 w-1/3" />
              <Skeleton className="h-48" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/experiences/:id" element={<ExperienceDetail />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:slug" element={<CompanyPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyOtp />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/compare" element={<Compare />} />
            <Route
              path="/prep"
              element={
                <ProtectedRoute>
                  <Prep />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submit"
              element={
                <ProtectedRoute roles={[...seniorRoles]}>
                  <Submit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/experiences/:id/edit"
              element={
                <ProtectedRoute roles={[...seniorRoles]}>
                  <Submit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/me/posts"
              element={
                <ProtectedRoute roles={[...seniorRoles]}>
                  <MyPosts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <Bookmarks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="border-t border-border py-8">
        <div className="container-page flex flex-col justify-between gap-2 text-[13px] text-muted sm:flex-row">
          <span>Career Log · built by students, for students</span>
          <span>Share approaches, not verbatim questions. Respect company NDAs.</span>
        </div>
      </footer>
    </>
  );
}
