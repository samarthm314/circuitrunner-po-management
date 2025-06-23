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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-po" element={<CreatePO />} />
        <Route path="/my-pos" element={<MyPOs />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/pending-purchase" element={<PendingPurchase />} />
        <Route path="/all-pos" element={<AllPOs />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budget-management" element={<BudgetManagement />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

function App() {
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