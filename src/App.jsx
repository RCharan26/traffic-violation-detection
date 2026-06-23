import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ViolationProvider, useViolations } from './context/ViolationContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Detection from './pages/Detection.jsx';
import Evidence from './pages/Evidence.jsx';
import Search from './pages/Search.jsx';
import Analytics from './pages/Analytics.jsx';
import Performance from './pages/Performance.jsx';
import Admin from './pages/Admin.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';
import TrainingStatus from './pages/TrainingStatus.jsx';

// ── Protected Route Wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { state } = useViolations();
  const token = localStorage.getItem('tvai_token');
  const user = localStorage.getItem('tvai_user');

  if (!state.user || !token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ── Inner layout that conditionally shows global Navbar & Sidebar ─────────────
// The landing page (/) has its own fullscreen hero navbar — suppress global one there.
function AppLayout() {
  const location = useLocation();
  const { state } = useViolations();
  const isLanding = location.pathname === '/';
  const showSidebar = !isLanding && state.user;

  return (
    <div className="min-h-screen font-sans flex" style={{ background: 'var(--color-bg)', color: 'hsl(40,6%,95%)' }}>
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {!isLanding && <Navbar />}
        <main className="flex-1">
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected operator command center routes */}
          <Route
            path="/detection"
            element={
              <ProtectedRoute>
                <Detection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evidence"
            element={
              <ProtectedRoute>
                <Evidence />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training-status"
            element={
              <ProtectedRoute>
                <TrainingStatus />
              </ProtectedRoute>
            }
          />

          {/* Wildcard redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ViolationProvider>
        <AppLayout />
      </ViolationProvider>
    </BrowserRouter>
  );
}
