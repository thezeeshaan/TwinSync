import React from 'react';
import { Menu, Container, Button, Icon } from 'semantic-ui-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Menu fixed="top" inverted color="teal" size="large" borderless style={{ borderBottom: '2px solid var(--primary-color)' }}>
      <Container>
        {/* Left: Logo */}
        <Menu.Item as={Link} to="/dashboard" header style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          <Icon name="heartbeat" size="large" style={{ marginRight: '10px' }} />
          TwinSync
        </Menu.Item>

        {/* Center: 4 Pillars */}
        <Menu.Item as={Link} to="/checkin" active={location.pathname === '/checkin'} name="Check In" />
        <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" />
        <Menu.Item as={Link} to="/counselor" active={location.pathname === '/counselor'} name="Counselor" />
        <Menu.Item as={Link} to="/community" active={location.pathname === '/community'} name="Community" />

        {/* Right: User Profile & Actions */}
        <Menu.Menu position="right">
          <Menu.Item>
            <span style={{ fontWeight: '600', marginRight: '5px' }}>{profile?.name || 'User'}</span>
            <span style={{ opacity: 0.8, fontSize: '0.9em' }}>({profile?.phone || 'No Phone'})</span>
          </Menu.Item>
          <Menu.Item>
            <Button inverted color="red" onClick={handleLogout} size="small">
              Log Out
            </Button>
          </Menu.Item>
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

export default Navbar;
