import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/auth/Login';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { CreatePO } from './components/po/CreatePO';
import { MyPOs } from './components/po/MyPOs';
import { PendingApproval } from './components/po/PendingApproval';
import { PendingPurchase } from './components/po/PendingPurchase';
import { AllPOs } from './components/po/AllPOs';
import { BudgetManagement } from './components/budget/BudgetManagement';
import { Transactions } from './components/transactions/Transactions';
import { UserManagement } from './components/admin/UserManagement';
import { CookieConsent } from './components/ui/CookieConsent';
import { LocalStorageNotice } from './components/ui/LocalStorageNotice';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isGuest, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If user is not authenticated and trying to access a protected route
    if (!loading && !currentUser && !isGuest && location.pathname !== '/') {
      // Clear any stale state and redirect to root
      window.history.replaceState(null, '', '/');
    }
  }, [currentUser, isGuest, loading, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return currentUser || isGuest ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRoutes: React.FC = () => {
  const { currentUser, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        <LocalStorageNotice />
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <>
        <Login />
        <CookieConsent />
        <LocalStorageNotice />
      </>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-po" element={<CreatePO />} />
        <Route path="/my-pos" element={<MyPOs />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/pending-purchase" element={<PendingPurchase />} />
        <Route path="/all-pos" element={<AllPOs />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budget-management" element={<BudgetManagement />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <CookieConsent />
      <LocalStorageNotice />
    </Layout>
  );
};

function App() {
  useEffect(() => {
    // Handle browser back/forward navigation edge cases
    const handlePopState = () => {
      // If we're on an invalid route and not authenticated, go to root
      const path = window.location.pathname;
      const validPaths = ['/', '/dashboard', '/create-po', '/my-pos', '/pending-approval', '/pending-purchase', '/all-pos', '/transactions', '/budget-management', '/user-management'];
      
      if (!validPaths.includes(path)) {
        window.history.replaceState(null, '', '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App bg-gray-900 min-h-screen">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;