import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { Button, Form, Header, Message, Segment, Container, Checkbox, Icon, Divider } from 'semantic-ui-react';
import { useAuth } from '../../context/AuthContext';

const genderOptions = [
  { key: 'p', text: 'Prefer not to say', value: 'prefer_not_to_say' },
  { key: 'm', text: 'Male', value: 'male' },
  { key: 'f', text: 'Female', value: 'female' },
  { key: 'n', text: 'Non-binary', value: 'non_binary' },
];

function StudentSignUp() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Check if user logged in via Google
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State (No email or password needed here anymore!)
  const [formData, setFormData] = useState({
    name: '', phone: '', age: '', gender: 'prefer_not_to_say',
    college: '', department: '', roll_number: '', degree: '',
    emergency_name: '', emergency_phone: '',
    consent_wellbeing: false, consent_daily: false, consent_counselor: false,
    consent_emergency: false, consent_peer: false
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
          redirectTo: window.location.origin + '/signup/student'
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = [];
    const phoneRegex = /^\d{10}$/;

    if (!formData.name || formData.name.trim().length < 2) errors.push('Full Name must be at least 2 characters.');
    if (!phoneRegex.test(formData.phone)) errors.push('Phone Number must be exactly 10 digits.');
    
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) errors.push('Age must be between 16 and 100.');

    if (!formData.college || formData.college.trim().length < 2) errors.push('College Name must be at least 2 characters.');
    if (!formData.department || formData.department.trim().length < 2) errors.push('Department must be at least 2 characters.');
    if (!formData.roll_number || formData.roll_number.trim().length < 1) errors.push('Roll Number is required.');
    if (!formData.degree || formData.degree.trim().length < 2) errors.push('Degree must be at least 2 characters.');

    if (!formData.emergency_name || formData.emergency_name.trim().length < 2) errors.push('Emergency Contact Name must be at least 2 characters.');
    if (!phoneRegex.test(formData.emergency_phone)) errors.push('Emergency Contact Phone must be exactly 10 digits.');

    if (!formData.consent_wellbeing || !formData.consent_daily || !formData.consent_counselor || !formData.consent_emergency || !formData.consent_peer) {
      errors.push('You must provide all consents to use the platform.');
    }

    return errors;
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Frontend validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error("You must be logged in with Google first.");

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      // FIX 1+2: Get the current session token and send it as a Bearer token.
      // The backend extracts user identity from the verified JWT — never from the body.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please sign in again.");

      // Only send profile form data — no auth_user_id or email needed
      const profileData = { ...formData };

      const response = await fetch(`${API_URL}/api/auth/register-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save student profile in database");
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
            Registration Complete!
          </h1>
          <p className="auth-subheader" style={{ marginBottom: '1.5rem' }}>
            Welcome to TwinSync! Your profile has been successfully created.
          </p>
          <Button onClick={() => navigate('/dashboard')} color="blue" size="large" fluid style={{ padding: '1.2rem', borderRadius: '12px' }}>
            Go to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  // STEP 1: If they haven't logged in with Google yet
  if (!user) {
    return (
      <Container className="full-height" style={{ padding: '4rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <h1 className="auth-header">
            Student Registration
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

  // STEP 2: They logged in with Google, now complete the profile
  return (
    <Container className="full-height" style={{ padding: '4rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '700px' }}>
        <h1 className="auth-header">
          Complete Your Profile
        </h1>
        <p className="auth-subheader">Almost done! We just need a few more details.</p>
        
        <Message info icon style={{ marginBottom: '2rem', borderRadius: '12px' }}>
          <Icon name='google' />
          <Message.Content>
            <Message.Header>Signed in securely as</Message.Header>
            {user.email}
          </Message.Content>
        </Message>

        <Form onSubmit={handleCompleteProfile} error={!!error} size="large">
          <Header as="h4" dividing>Basic Details</Header>
          <Form.Group widths='equal'>
            <Form.Input fluid label='Full Name' name="name" placeholder='Name' required onChange={handleChange} />
            <Form.Input fluid label='Phone Number' name="phone" type='tel' placeholder='Phone' required onChange={handleChange} />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input fluid label='Age' name="age" type='number' placeholder='Age' required onChange={handleChange} />
            <Form.Select fluid label='Gender' name="gender" options={genderOptions} value={formData.gender} onChange={handleChange} />
          </Form.Group>

          <Header as="h4" dividing>Academic Details</Header>
          <Form.Group widths='equal'>
            <Form.Input fluid label='College Name' name="college" placeholder='e.g. IIT Kharagpur' required onChange={handleChange} />
            <Form.Input fluid label='Department' name="department" placeholder='e.g. Computer Science' required onChange={handleChange} />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input fluid label='Roll Number' name="roll_number" placeholder='Roll Number' required onChange={handleChange} />
            <Form.Input fluid label='Degree' name="degree" placeholder='e.g. B.Tech' required onChange={handleChange} />
          </Form.Group>

          <Header as="h4" dividing>Emergency Contact</Header>
          <Form.Group widths='equal'>
            <Form.Input fluid label='Contact Name' name="emergency_name" placeholder='Name' required onChange={handleChange} />
            <Form.Input fluid label='Contact Phone' name="emergency_phone" type='tel' placeholder='Phone' required onChange={handleChange} />
          </Form.Group>

          <Header as="h4" dividing>Explicit Consent (Required)</Header>
          <Segment secondary>
            <Form.Field>
              <Checkbox name="consent_wellbeing" label='I consent to the usage of my aggregate, anonymized data for campus-wide well-being reporting.' onChange={handleChange} />
            </Form.Field>
            <Form.Field>
              <Checkbox name="consent_daily" label='I consent to receiving personalized daily recommendations based on my check-ins.' onChange={handleChange} />
            </Form.Field>
            <Form.Field>
              <Checkbox name="consent_counselor" label='I consent to sharing context-aware data with a matched counselor during a session.' onChange={handleChange} />
            </Form.Field>
            <Form.Field>
              <Checkbox name="consent_emergency" label='I explicitly consent to automated dispatch of my condition/location to my emergency contact in severe distress scenarios.' onChange={handleChange} />
            </Form.Field>
            <Form.Field>
              <Checkbox name="consent_peer" label='I consent to participate in anonymous 1-on-1 peer direct messaging.' onChange={handleChange} />
            </Form.Field>
          </Segment>

          {error && <Message error header='Profile Setup Failed' content={error} />}

          <Button color='blue' fluid size='large' loading={loading} disabled={loading} style={{ marginTop: '2.5rem', padding: '1.2rem', borderRadius: '12px', fontSize: '1.1rem' }}>
            Complete Registration
          </Button>
        </Form>
      </div>
    </Container>
  );
}

export default StudentSignUp;
