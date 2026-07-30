import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  // FIX 4: Track verification_status for counselors ('pending', 'verified', 'rejected')
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAndSetUser = async (authUser, session) => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      try {
        // FIX 1+2: Send the verified JWT as a Bearer token.
        // Backend extracts the user ID from the token — never trust client-supplied IDs.
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await response.json();

        // Allow users on signup pages even if they don't have a DB record yet
        const isSignupRoute = window.location.pathname.includes('/signup/');

        if (!data.exists && !isSignupRoute) {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setProfile(null);
          setVerificationStatus(null);
          window.location.href = '/login?error=no_account';
        } else {
          setUser(authUser);
          setRole(data.role || null);
          setProfile(data.profile || null);
          setVerificationStatus(data.verification_status || null);
        }
      } catch (err) {
        console.error("Error verifying user profile:", err);
        setUser(authUser);
      } finally {
        setLoading(false);
      }
    };

    // Only use onAuthStateChange — no race condition from getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await verifyAndSetUser(session.user, session);
        } else {
          setUser(null);
          setRole(null);
          setProfile(null);
          setVerificationStatus(null);
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
    verificationStatus,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
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
