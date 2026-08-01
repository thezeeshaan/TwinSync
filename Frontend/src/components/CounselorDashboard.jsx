import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Icon, Loader, Message } from 'semantic-ui-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function CounselorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [waitingSessions, setWaitingSessions] = useState([]);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      // Load profile (for availability status)
      const profRes = await fetch(`${API_URL}/api/counselor/profile`, { headers });
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData.profile);
      }

      // Load active/past sessions
      const sessRes = await fetch(`${API_URL}/api/counselor/sessions`, { headers });
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData.sessions || []);
      }

      // Load waiting sessions queue
      const waitingRes = await fetch(`${API_URL}/api/counselor/waiting`, { headers });
      if (waitingRes.ok) {
        const waitingData = await waitingRes.json();
        setWaitingSessions(waitingData.waiting || []);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-poll waiting sessions every 5 seconds
    const interval = setInterval(async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/counselor/waiting`, { headers });
        if (res.ok) {
          const data = await res.json();
          setWaitingSessions(data.waiting || []);
        }
      } catch (e) {
        // silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/counselor/availability`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_available: !profile.is_available })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({ ...profile, is_available: data.is_available });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptSession = async (sessionId) => {
    if (!profile?.is_available) {
      alert("You must be set to 'Available' to accept sessions.");
      return;
    }
    
    setAcceptingId(sessionId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/counselor/sessions/${sessionId}/accept`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/counselor/chat/${data.session_id}`);
      } else {
        setError(data.error || 'Failed to accept session');
        await loadData(); // Reload queue, someone else might have picked it up
      }
    } catch (err) {
      setError('Failed to accept session');
    } finally {
      setAcceptingId(null);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <Loader active inline="centered" style={{ marginTop: '2rem' }} />;
  }

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status !== 'active');

  return (
    <div>
      <Header as="h1" className="dashboard-welcome" style={{ marginBottom: '0.25rem' }}>
        Counselor Dashboard
      </Header>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Manage your availability and counseling sessions.
      </p>

      {error && <Message error content={error} />}

      {/* Availability Toggle Card */}
      <div className="counselor-dashboard-card">
        <div className="counselor-toggle-row">
          <div>
            <div className="counselor-toggle-label">
              Availability Status
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
              {profile?.is_available 
                ? 'You are currently receiving session requests.' 
                : 'You are offline. Toggle to receive requests.'}
            </p>
          </div>
          <button 
            className={`counselor-toggle-switch ${profile?.is_available ? 'active' : ''}`}
            onClick={handleToggleAvailability}
            disabled={toggling}
          />
        </div>
      </div>

      {/* Waiting Queue */}
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', marginTop: '2rem' }}>
        <Icon name="clock outline" style={{ color: '#f59e0b' }} /> Waiting Queue ({waitingSessions.length})
      </h3>
      {waitingSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px dashed var(--panel-border)' }}>
          No students are currently waiting for a session.
        </div>
      ) : (
        <div className="counselor-sessions-list">
          {waitingSessions.map(session => (
            <div
              key={session.session_id}
              className="counselor-session-item"
              style={{ borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="counselor-session-avatar" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Icon name="user outline" size="large" />
                </div>
                <div>
                  <div className="community-alias">Anonymous Student</div>
                  <div className="community-time" style={{ color: '#f59e0b' }}>
                    Waiting since: {timeAgo(session.started_at)}
                  </div>
                </div>
              </div>
              <button
                className="admin-action-btn approve"
                onClick={() => handleAcceptSession(session.session_id)}
                disabled={acceptingId === session.session_id || !profile?.is_available}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {acceptingId === session.session_id ? <Loader active inline size="mini" /> : <><Icon name="handshake" /> Accept</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Sessions */}
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
        <Icon name="comments" style={{ color: '#22c55e' }} /> Active Sessions ({activeSessions.length})
      </h3>
      {activeSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px dashed var(--panel-border)' }}>
          No active sessions right now.
        </div>
      ) : (
        <div className="counselor-sessions-list">
          {activeSessions.map(session => (
            <div
              key={session.session_id}
              className="counselor-session-item active"
              onClick={() => navigate(`/counselor/chat/${session.session_id}`)}
            >
              <div className="counselor-session-avatar">
                <Icon name="user" size="large" />
                <span className="community-online-dot" />
              </div>
              <div className="community-item-content">
                <div className="community-item-top">
                  <span className="community-alias">{session.peer_label}</span>
                  <span className="community-time">{timeAgo(session.last_message_at || session.started_at)}</span>
                </div>
                <div className="community-item-bottom">
                  <span className="community-preview">
                    {session.last_message
                      ? (session.last_message.length > 50
                          ? session.last_message.substring(0, 50) + '...'
                          : session.last_message)
                      : 'Student is waiting...'}
                  </span>
                  {parseInt(session.unread_count) > 0 && (
                    <span className="community-unread-badge">{session.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <>
          <h3 style={{ color: 'var(--text-primary)', margin: '2rem 0 1rem' }}>
            <Icon name="history" /> Past Sessions
          </h3>
          <div className="counselor-sessions-list">
            {pastSessions.map(session => (
              <div
                key={session.session_id}
                className="counselor-session-item past"
                onClick={() => navigate(`/counselor/chat/${session.session_id}`)}
              >
                <div className="counselor-session-avatar past">
                  <Icon name="user" size="large" />
                </div>
                <div className="community-item-content">
                  <div className="community-item-top">
                    <span className="community-alias">{session.peer_label}</span>
                    <span className="counselor-status-badge completed">Completed</span>
                  </div>
                  <div className="community-item-bottom">
                    <span className="community-preview">
                      {session.last_message || 'No messages'}
                    </span>
                    <span className="community-time">{timeAgo(session.ended_at || session.started_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CounselorDashboard;
