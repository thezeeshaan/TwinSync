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
    <Container className="full-height" style={{ padding: '4rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <h1 className="auth-header">
          Welcome to TwinSync
        </h1>
        <p className="auth-subheader">Log in to your account</p>

        <Form size='large' error={!!error}>
          <Button 
            color='google plus' 
            fluid 
            size='large' 
            type="button"
            onClick={handleGoogleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginBottom: '1.5rem', padding: '1.2rem', fontSize: '1.1rem', borderRadius: '12px' }}
          >
            <Icon name='google' /> Sign in with Google
          </Button>
          
          {error && <Message error content={error} style={{ marginTop: '1rem' }} />}
        </Form>

        <div className="auth-link-box">
          New to us?{' '}
          <Link to="/signup/student">Student Sign Up</Link> |{' '}
          <Link to="/signup/counselor">Counselor Sign Up</Link>
        </div>
      </div>
    </Container>
  );
}

export default Login;
