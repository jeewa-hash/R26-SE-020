import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RegisterAdminPage from './pages/RegisterAdminPage';
import ViewUsersPage from './pages/ViewUsersPage';
import ManageCategoriesPage from './pages/ManageCategoriesPage';
import ProviderVerificationPage from './pages/ProviderVerificationPage';
import NICVerificationsPage from './pages/NICVerificationsPage';
import PenaltyManagementPage from './pages/PenaltyManagementPage';
import InquiriesPage from './pages/InquiriesPage';
import AuditLogPage from './pages/AuditLogPage';
import DemandForecastingPage from './pages/DemandForecastingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import UserLocationsPage from './pages/UserLocationsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="register-admin" element={<RegisterAdminPage />} />
          <Route path="users" element={<ViewUsersPage />} />
          <Route path="categories" element={<ManageCategoriesPage />} />
          <Route path="verify-provider/:id" element={<ProviderVerificationPage />} />
          <Route path="nic-verifications" element={<NICVerificationsPage />} />
          <Route path="penalty-management" element={<PenaltyManagementPage />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
          <Route path="demand-forecasting" element={<DemandForecastingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="user-locations" element={<UserLocationsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
