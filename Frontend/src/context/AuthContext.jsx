import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'student', 'admin', 'counselor'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAndSetUser = async (authUser) => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      try {
        const response = await fetch(`${API_URL}/api/auth/me?auth_user_id=${authUser.id}`);
        const data = await response.json();

        // Allow users on signup pages even if they don't have a DB record yet
        const isSignupRoute = window.location.pathname.includes('/signup/');

        if (!data.exists && !isSignupRoute) {
          // Force logout for ghost users trying to bypass signup
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setProfile(null);
          window.location.href = '/login?error=no_account';
        } else {
          setUser(authUser);
          setRole(data.role || null);
          setProfile(data.profile || null);
        }
      } catch (err) {
        console.error("Error verifying user profile:", err);
        // On network error during signup, don't block the user
        setUser(authUser);
      } finally {
        setLoading(false);
      }
    };

    // FIX Bug 1: Only use onAuthStateChange (fires INITIAL_SESSION on load).
    // Removed getSession() to prevent the double-call race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await verifyAndSetUser(session.user);
        } else {
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    role,
    profile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {/* FIX Bug 4: Show a real loading spinner instead of a blank white screen */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary, #0f172a)',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(59, 130, 246, 0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>Loading TwinSync...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
