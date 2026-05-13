import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import VerifyEmail from '../pages/VerifyEmail';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserHome from '../pages/user/UserHome';
import UserProfile from '../pages/user/UserProfile';
import SettingsPage from '../pages/user/SettingsPage';
import GroupDetail from '../pages/user/GroupDetail';
import EventsPage from '../pages/user/EventsPage';
import EventDetailPage from '../pages/user/EventDetailPage';
import SavedPostsPage from '../pages/user/SavedPostsPage';
import NotificationsPage from '../pages/user/NotificationsPage';
import ProtectedRoute from '../components/ProtectedRoute';
import NavigationBar from '../components/NavigationBar';
import PageTransition from '../components/PageTransition';

export default function AppRouter() {
  const { user } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <UserProfile />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <GroupDetail />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <SettingsPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <EventDetailPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <EventsPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <SavedPostsPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <NotificationsPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <PageTransition>
                <NavigationBar />
                <UserHome />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            user ? (
              user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/home" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}
