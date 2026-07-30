import React from 'react';
import { Container, Header, Segment, Icon, Message } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, profile, role } = useAuth();

  // FIX Bug 3: Counselors who are pending verification should NOT see the regular dashboard.
  if (role === 'counselor') {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', paddingBottom: '4em' }}>
          <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 2rem auto'
            }}>
              <Icon name="clock" size="large" style={{ color: 'white', margin: 0 }} />
            </div>
            <Header as="h1" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Application Under Review
            </Header>
            <Message warning style={{ borderRadius: '12px', textAlign: 'left' }}>
              <Message.Header>Pending Administrator Approval</Message.Header>
              <p style={{ marginTop: '0.5rem' }}>
                Thank you for registering as a counselor on TwinSync. Your profile is currently being verified by an administrator.
                You will receive access to the counselor dashboard once your account is approved. This usually takes 24–48 hours.
              </p>
            </Message>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
              Signed in as: <strong>{user?.email}</strong>
            </p>
          </div>
        </Container>
      </>
    );
  }

  // Regular student dashboard
  return (
    <>
      <Navbar />
      <Container style={{ marginTop: '7em', paddingBottom: '4em' }}>
        <Header as="h1" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Welcome back, {profile?.name || user?.email}! 👋
        </Header>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Ready for your daily check-in?
        </p>

        {/* Placeholder for the 4 pillar content */}
        <Segment padded="very" textAlign="center" style={{ minHeight: '300px', borderRadius: '12px' }}>
          <Header as="h3" color="grey">
            Dashboard Content Coming Soon
          </Header>
          <p>Use the navigation bar above to access Check In, Insights, Counselor, and Community.</p>
        </Segment>
      </Container>
    </>
  );
}

export default Dashboard;
