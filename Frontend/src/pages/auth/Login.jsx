import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { Button, Form, Message, Container, Icon } from 'semantic-ui-react';

function Login() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'no_account') {
      setError("Account not found. Please sign up as a Student or Counselor first.");
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin + '/dashboard' } 
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <Container className="full-height" style={{ padding: '4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-card" style={{ maxWidth: '480px', width: '100%', background: 'var(--panel-bg)', borderRadius: '16px', padding: '3rem 2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--panel-border)', position: 'relative' }}>
        
        <Link to="/" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
          <Icon name="arrow left" /> Back
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <Icon name="user" size="large" />
            <Icon name="shield" size="large" />
          </div>
          <h1 className="auth-header" style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Unified Login Portal
          </h1>
          <p className="auth-subheader" style={{ color: 'var(--text-secondary)' }}>
            One secure login for both Students and Counselors.
          </p>
        </div>

        <Form size='large' error={!!error}>
          <Button 
            color='google plus' 
            fluid 
            size='large' 
            type="button"
            onClick={handleGoogleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginBottom: '1.5rem', padding: '1.2rem', fontSize: '1.1rem', borderRadius: '8px' }}
          >
            <Icon name='google' /> Sign In with Google
          </Button>
          
          {error && <Message error content={error} style={{ marginTop: '1rem', borderRadius: '8px' }} />}
        </Form>

        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--panel-border)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Don't have an account yet?</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link to="/signup/student" style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
              Student Sign Up
            </Link>
            <Link to="/signup/counselor" style={{ padding: '8px 16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
              Counselor Sign Up
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Login;
