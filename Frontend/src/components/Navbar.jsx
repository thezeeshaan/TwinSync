import React, { useState, useEffect } from 'react';
import { Menu, Container, Button, Icon } from 'semantic-ui-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  // MOBILE NAVBAR
  if (isMobile) {
    return (
      <>
        <Menu fixed="top" inverted color="teal" size="large" borderless style={{ borderBottom: '2px solid var(--primary-color)' }}>
          <Container style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Menu.Item as={Link} to="/dashboard" header style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', border: 'none' }}>
              <Icon name="heartbeat" size="large" style={{ marginRight: '10px' }} />
              TwinSync
            </Menu.Item>
            <Menu.Item onClick={toggleMobileMenu} style={{ border: 'none' }}>
              <Icon name={mobileMenuOpen ? "close" : "sidebar"} size="large" />
            </Menu.Item>
          </Container>
        </Menu>

        {mobileMenuOpen && (
          <div style={{
            position: 'fixed', top: '54px', left: 0, width: '100%', backgroundColor: '#0d9488', zIndex: 1000,
            display: 'flex', flexDirection: 'column', borderBottom: '2px solid var(--primary-color)',
            boxShadow: '0 10px 15px rgba(0,0,0,0.2)'
          }}>
            <Menu inverted color="teal" vertical fluid borderless style={{ margin: 0, borderRadius: 0 }}>
              <Menu.Item as={Link} to="/dashboard" active={location.pathname === '/dashboard'} name="Check In" onClick={toggleMobileMenu} />
              <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" onClick={toggleMobileMenu} />
              <Menu.Item as={Link} to="/counselor" active={location.pathname === '/counselor'} name="Counselor" onClick={toggleMobileMenu} />
              <Menu.Item as={Link} to="/community" active={location.pathname === '/community'} name="Community" onClick={toggleMobileMenu} />
              <Menu.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <span style={{ fontWeight: '600', marginRight: '5px' }}>{profile?.name || 'User'}</span>
                  </span>
                  <Button inverted color="red" onClick={handleLogout} size="small">
                    Log Out
                  </Button>
                </div>
              </Menu.Item>
            </Menu>
          </div>
        )}
      </>
    );
  }

  // DESKTOP NAVBAR
  return (
    <Menu fixed="top" inverted color="teal" size="large" borderless style={{ borderBottom: '2px solid var(--primary-color)' }}>
      <Container>
        {/* Left: Logo */}
        <Menu.Item as={Link} to="/dashboard" header style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          <Icon name="heartbeat" size="large" style={{ marginRight: '10px' }} />
          TwinSync
        </Menu.Item>

        {/* Center: 4 Pillars */}
        <Menu.Item as={Link} to="/dashboard" active={location.pathname === '/dashboard'} name="Check In" />
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
