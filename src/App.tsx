import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Attendance = lazy(() => import('./pages/Attendance').then((module) => ({ default: module.Attendance })));
const History = lazy(() => import('./pages/History').then((module) => ({ default: module.History })));
const Statistics = lazy(() => import('./pages/Statistics').then((module) => ({ default: module.Statistics })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen animate-pulse bg-brandBg-light dark:bg-brandBg-dark" />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/history" element={<History />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
        
        {/* Soft Toast Notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            className: 'bg-white text-brandText-primaryLight border border-gray-100 dark:bg-brandCard-dark dark:text-brandText-primaryDark dark:border-gray-900/40 rounded-2xl shadow-premium px-4.5 py-3 text-sm font-semibold transition-all select-none',
            success: {
              iconTheme: {
                primary: '#7C5CFC',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
