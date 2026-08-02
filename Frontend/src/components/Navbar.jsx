import React, { useState, useEffect } from 'react';
import { Menu, Container, Button, Icon, Dropdown } from 'semantic-ui-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { profile, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    // Auto-toggle counselor to inactive on logout
    if (role === 'counselor') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          await fetch(`${API_URL}/api/counselor/availability`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ is_available: false })
          });
        }
      } catch (e) {
        console.error("Auto-toggle off failed:", e);
      }
    }

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
              {role !== 'counselor' && (
                <>
                  <Menu.Item as={Link} to="/dashboard" active={location.pathname === '/dashboard'} name="Check In" onClick={toggleMobileMenu} />
                  <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" onClick={toggleMobileMenu} />
                  <Menu.Item as={Link} to="/counselor" active={location.pathname === '/counselor'} name="Counselor" onClick={toggleMobileMenu} />
                  <Menu.Item as={Link} to="/community" active={location.pathname === '/community'} name="Community" onClick={toggleMobileMenu} />
                </>
              )}
              {role === 'counselor' && (
                <>
                  <Menu.Item as={Link} to="/checkin" active={location.pathname === '/checkin'} name="Check In" onClick={toggleMobileMenu} />
                  <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" onClick={toggleMobileMenu} />
                  <Menu.Item as={Link} to="/my-sessions" active={location.pathname === '/my-sessions'} name="My Sessions" onClick={toggleMobileMenu} />
                </>
              )}
              {role === 'admin' && (
                <Menu.Item as={Link} to="/admin" active={location.pathname === '/admin'} onClick={toggleMobileMenu}>
                  <Icon name="shield" /> Admin
                </Menu.Item>
              )}
              <Menu.Item>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nav-avatar small">
                    {(profile?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span>
                    <div style={{ fontWeight: '600' }}>{profile?.name || 'User'}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{profile?.phone || 'No Phone'}</div>
                  </span>
                </div>
              </Menu.Item>
              <Menu.Item onClick={toggleTheme}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} /> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Menu.Item>
              <Menu.Item onClick={handleLogout}>
                <span style={{ color: '#fca5a5', fontWeight: '600' }}>
                  <Icon name="sign-out" /> Log Out
                </span>
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

        {/* Center: 4 Pillars (Students only) */}
        {role !== 'counselor' && (
          <>
            <Menu.Item as={Link} to="/checkin" active={location.pathname === '/checkin'} name="Check In" />
            <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" />
            <Menu.Item as={Link} to="/counselor" active={location.pathname === '/counselor'} name="Counselor" />
            <Menu.Item as={Link} to="/community" active={location.pathname === '/community'} name="Community" />
          </>
        )}
        {role === 'counselor' && (
          <>
            <Menu.Item as={Link} to="/checkin" active={location.pathname === '/checkin'} name="Check In" />
            <Menu.Item as={Link} to="/insights" active={location.pathname === '/insights'} name="Insights" />
            <Menu.Item as={Link} to="/my-sessions" active={location.pathname === '/my-sessions'} name="My Sessions" />
          </>
        )}
        {role === 'admin' && (
          <Menu.Item as={Link} to="/admin" active={location.pathname === '/admin'}>
            <Icon name="shield" /> Admin
          </Menu.Item>
        )}

        {/* Right: User Profile Dropdown */}
        <Menu.Menu position="right">
          <Menu.Item style={{ paddingRight: 0 }}>
            <Dropdown
              trigger={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nav-avatar">
                    {(profile?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: '600' }}>{profile?.name || 'User'}</span>
                  <Icon name="angle down" style={{ margin: 0, opacity: 0.7 }} />
                </div>
              }
              icon={null}
              pointing="top right"
              className="premium-nav-dropdown"
            >
              <Dropdown.Menu>
                <Dropdown.Header>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {profile?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {profile?.phone || 'No Phone'}
                  </div>
                </Dropdown.Header>
                
                <Dropdown.Divider />
                
                <Dropdown.Item style={{ padding: '0.5rem 1.1rem' }}>
                  <div className={`nav-role-badge ${role || 'student'}`}>
                    {role === 'student' ? 'Student' : role === 'admin' ? 'Administrator' : 'Counselor'}
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Divider />
                
                <Dropdown.Item onClick={toggleTheme}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} color={theme === 'dark' ? 'yellow' : 'grey'} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </span>
                </Dropdown.Item>

                <Dropdown.Divider />

                <Dropdown.Item onClick={handleLogout} className="logout-item">
                  <Icon name="sign-out" color="red" />
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>Log Out</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Menu.Item>
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

export default Navbar;
