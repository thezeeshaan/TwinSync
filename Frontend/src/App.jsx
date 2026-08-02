import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Insights from './pages/Insights';
import StudentSignUp from './pages/auth/StudentSignUp';
import CounselorSignUp from './pages/auth/CounselorSignUp';
import Login from './pages/auth/Login';
import Community from './pages/Community';
import CommunityChat from './pages/CommunityChat';
import Counselor from './pages/Counselor';
import CounselorChat from './pages/CounselorChat';
import AdminPanel from './pages/AdminPanel';
import MySessions from './pages/MySessions';
import './App.css';


// Simple Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Only show ThemeToggle when the user is authenticated
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/checkin" element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            } />
            <Route path="/insights" element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            } />
            <Route path="/signup/student" element={<StudentSignUp />} />
            <Route path="/signup/counselor" element={<CounselorSignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/community" element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            } />
            <Route path="/community/chat/:conversationId" element={
              <ProtectedRoute>
                <CommunityChat />
              </ProtectedRoute>
            } />
            <Route path="/counselor" element={
              <ProtectedRoute>
                <Counselor />
              </ProtectedRoute>
            } />
            <Route path="/counselor/chat/:sessionId" element={
              <ProtectedRoute>
                <CounselorChat />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/my-sessions" element={
              <ProtectedRoute>
                <MySessions />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
