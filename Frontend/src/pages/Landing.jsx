import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Grid } from 'semantic-ui-react';
import { User, ShieldCheck, ArrowRight } from 'lucide-react';

function Landing() {
  return (
    <div className="full-height" style={{ padding: '4rem 0' }}>
      <Container>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="hero-title">TwinSync</h1>
          <p className="hero-subtitle">
            Your campus mental well-being companion. Safe, anonymous, and supportive.
          </p>
        </div>

        <Grid stackable columns={2} style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Grid.Column>
            <Link to="/signup/student" className="role-card student-card">
              <div className="icon-wrapper">
                <User size={40} />
              </div>
              <h3>I am a Student</h3>
              <p>Join to track your well-being, get anonymous AI insights, connect with peers, and access professional counseling.</p>
              <div className="action-btn">
                Sign Up as Student <ArrowRight size={20} />
              </div>
            </Link>
          </Grid.Column>

          <Grid.Column>
            <Link to="/signup/counselor" className="role-card counselor-card">
              <div className="icon-wrapper">
                <ShieldCheck size={40} />
              </div>
              <h3>I am a Counselor</h3>
              <p>Join to provide 1-on-1 anonymous text-based counseling to students seeking professional support.</p>
              <div className="action-btn">
                Sign Up as Counselor <ArrowRight size={20} />
              </div>
            </Link>
          </Grid.Column>
        </Grid>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary-blue)', fontWeight: '700', textDecoration: 'none' }}>
              Log In Here
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

export default Landing;
