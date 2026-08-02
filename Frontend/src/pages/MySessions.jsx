import React from 'react';
import { Container } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import CounselorDashboard from '../components/CounselorDashboard';

function MySessions() {
  return (
    <>
      <Navbar />
      <Container style={{ marginTop: '7em', paddingBottom: '4em', padding: '0 1rem' }}>
        <CounselorDashboard />
      </Container>
    </>
  );
}

export default MySessions;
