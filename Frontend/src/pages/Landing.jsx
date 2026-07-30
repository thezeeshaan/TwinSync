import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Grid } from 'semantic-ui-react';
import { User, ShieldCheck, ArrowRight } from 'lucide-react';

function Landing() {
  return (
    <div className="full-height" style={{ padding: '4rem 0', background: 'var(--bg-gradient)' }}>
      <Container>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="hero-title">TwinSync</h1>
          <p className="hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Your campus mental well-being companion. Safe, anonymous, and supportive.
          </p>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <h2 style={{ textAlign: 'center', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '800' }}>
            Join TwinSync Today
          </h2>

          <Grid stackable columns={2}>
            <Grid.Column>
              <Link to="/signup/student" className="role-card student-card" style={{ display: 'block', textDecoration: 'none' }}>
                <div className="icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <User size={48} />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#3b82f6' }}>I am a Student</h3>
                <p style={{ minHeight: '60px' }}>Join to track your well-being, get anonymous AI insights, connect with peers, and access professional counseling.</p>
                <div className="action-btn" style={{ background: '#3b82f6', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                  Sign Up as Student <ArrowRight size={20} />
                </div>
              </Link>
            </Grid.Column>

            <Grid.Column>
              <Link to="/signup/counselor" className="role-card counselor-card" style={{ display: 'block', textDecoration: 'none' }}>
                <div className="icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <ShieldCheck size={48} />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#f59e0b' }}>I am a Counselor</h3>
                <p style={{ minHeight: '60px' }}>Join to provide 1-on-1 anonymous text-based counseling to students seeking professional support.</p>
                <div className="action-btn" style={{ background: '#f59e0b', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                  Sign Up as Counselor <ArrowRight size={20} />
                </div>
              </Link>
            </Grid.Column>
          </Grid>

          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <User size={24} /> Already have an account? <ShieldCheck size={24} />
            </h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Students and Counselors use the same unified login portal.
            </p>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--primary-color)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: 'none', transition: 'transform 0.2s' }}>
              Go to Unified Login <ArrowRight size={20} />
            </Link>
          </div>

        </div>
      </Container>
    </div>
  );
}

export default Landing;
