import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { Button, Form, Header, Message, Segment, Container, Icon } from 'semantic-ui-react';
import { useAuth } from '../../context/AuthContext';

const genderOptions = [
  { key: 'm', text: 'Male', value: 'male' },
  { key: 'f', text: 'Female', value: 'female' },
  { key: 'n', text: 'Non-binary', value: 'non_binary' },
];

function CounselorSignUp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '', phone: '', gender: 'female',
    designation: '', description: '', is_staff: false, college: ''
  });

  const handleChange = (e, { name, value, checked, type }) => {
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const [success, setSuccess] = useState(false);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/signup/counselor'
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) throw new Error("You must be logged in with Google first.");

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      // FIX 1+2: Get the current session token and send it as a Bearer token.
      // The backend extracts user identity from the verified JWT — never from the body.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please sign in again.");

      // Only send profile form data — no auth_user_id or email needed
      const profileData = { ...formData };

      const response = await fetch(`${API_URL}/api/auth/register-counselor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save counselor profile in database");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container className="full-height" style={{ padding: '4rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1 className="auth-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Registration Submitted!
          </h1>
          <p className="auth-subheader" style={{ marginBottom: '1.5rem' }}>
            Thank you for applying to be a counselor on TwinSync.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Your profile is pending verification by an administrator. Once approved, you can log in and start accepting sessions.
          </p>
          <Button onClick={() => navigate('/dashboard')} color="blue" size="large" fluid style={{ padding: '1.2rem', borderRadius: '12px' }}>
            Go to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="full-height" style={{ padding: '4rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <h1 className="auth-header">
            Counselor Registration
          </h1>
          <p className="auth-subheader">Sign up securely with your Google account.</p>
          
          <Button 
            color='google plus' 
            fluid 
            size='large' 
            onClick={handleGoogleSignUp}
            loading={loading}
            style={{ padding: '1.2rem', fontSize: '1.1rem', borderRadius: '12px' }}
          >
            <Icon name='google' /> Sign up with Google
          </Button>
          
          {error && <Message error content={error} style={{ marginTop: '1rem' }} />}
          
          <div className="auth-link-box">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="full-height" style={{ padding: '4rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '650px' }}>
        <h1 className="auth-header">
          Complete Counselor Profile
        </h1>
        <p className="auth-subheader">Please provide your professional details.</p>
        
        <Message info icon style={{ marginBottom: '2rem', borderRadius: '12px' }}>
          <Icon name='google' />
          <Message.Content>
            <Message.Header>Signed in securely as</Message.Header>
            {user.email}
          </Message.Content>
        </Message>

        <Form onSubmit={handleCompleteProfile} error={!!error} size="large">
          <Form.Group widths='equal'>
            <Form.Input fluid label='Full Name' name="name" placeholder='Name' required onChange={handleChange} />
            <Form.Input fluid label='Phone Number' name="phone" type='tel' placeholder='Phone' required onChange={handleChange} />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input fluid label='College Name' name="college" placeholder='e.g. IIT Kharagpur' required onChange={handleChange} />
            <Form.Select fluid label='Gender' name="gender" options={genderOptions} value={formData.gender} onChange={handleChange} />
          </Form.Group>
          
          <Form.Input fluid label='Designation' name="designation" placeholder='e.g. Senior Student Counselor' required onChange={handleChange} />
          
          <Form.TextArea 
            label='Short Description / Bio' 
            name="description"
            placeholder='Tell us about your experience and how you help students...' 
            required 
            onChange={handleChange}
          />
          
          <Form.Checkbox 
            label='I am an official staff counselor at this institute (uncheck if peer counselor)' 
            name="is_staff"
            checked={formData.is_staff}
            onChange={handleChange}
          />

          {error && <Message error header='Registration Failed' content={error} />}

          <Button color='teal' fluid size='large' loading={loading} disabled={loading} style={{ marginTop: '2.5rem', padding: '1.2rem', borderRadius: '12px', fontSize: '1.1rem' }}>
            Submit Application
          </Button>
        </Form>
      </div>
    </Container>
  );
}

export default CounselorSignUp;
