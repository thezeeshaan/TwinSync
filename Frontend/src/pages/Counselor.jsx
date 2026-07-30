import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Header, Icon, Loader, Message } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function Counselor() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    };
  };

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/counselor/sessions`, { headers });
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      setError('Failed to load sessions');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchSessions();
      setLoading(false);
    };
    load();
  }, []);

  // Request a new session
  const handleRequest = async () => {
    setRequesting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/counselor/request`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'active') {
          setSuccessMsg('Matched with a counselor!');
          navigate(`/counselor/chat/${data.session_id}`);
        } else {
          // Placed in waiting queue
          setSuccessMsg(data.message);
          await fetchSessions();
        }
      } else {
        if (data.session_id && data.status === 'active') {
          navigate(`/counselor/chat/${data.session_id}`);
        } else if (data.session_id && data.status === 'waiting') {
          await fetchSessions();
        } else {
          setError(data.error || 'Failed to find a counselor');
        }
      }
    } catch (err) {
      setError('Failed to request counseling session');
    } finally {
      setRequesting(false);
    }
  };

  // Cancel waiting session
  const handleCancel = async (sessionId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/counselor/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  // Auto-poll to detect when a counselor accepts a waiting session
  useEffect(() => {
    const waitingSession = sessions.find(s => s.status === 'waiting');
    if (!waitingSession) return;

    const interval = setInterval(async () => {
      await fetchSessions();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [sessions]);

  // Format time ago
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

  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => !['active', 'waiting'].includes(s.status));

  // Auto-redirect when a waiting session becomes active
  useEffect(() => {
    const activeSession = sessions.find(s => s.status === 'active');
    if (activeSession && !loading) {
      navigate(`/counselor/chat/${activeSession.session_id}`);
    }
  }, [sessions]);

  if (loading) {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader active inline="centered" size="large">Loading...</Loader>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container style={{ marginTop: '7em', paddingBottom: '4em', padding: '0 1rem' }}>
        {/* Header */}
        <div className="counselor-header">
          <Header as="h1" className="dashboard-welcome" style={{ marginBottom: '0.25rem' }}>
            Counselor
          </Header>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Connect with a verified counselor — completely anonymous
          </p>
        </div>

        {error && <Message error content={error} style={{ marginBottom: '1rem' }} />}
        {successMsg && <Message success content={successMsg} style={{ marginBottom: '1rem' }} />}

        {/* Waiting State Card */}
        {waitingSessions.length > 0 && (
          <div className="counselor-request-card" style={{ border: '1px solid #f59e0b', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)' }}>
            <div className="counselor-request-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', animation: 'pulse 2s infinite' }}>
              <Icon name="clock outline" size="huge" />
            </div>
            <h3>Finding a counselor...</h3>
            <p>You have been placed in the waiting queue. A counselor will pick up your session shortly.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                className="counselor-request-btn"
                style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', flex: 1, minWidth: '160px' }}
                onClick={() => handleCancel(waitingSessions[0].session_id)}
              >
                <Icon name="close" /> Cancel Request
              </button>
              <button
                className="counselor-request-btn"
                style={{ flex: 1, minWidth: '160px' }}
                onClick={() => navigate('/insights')}
              >
                <Icon name="bolt" /> Try AI Counseling
              </button>
            </div>
          </div>
        )}

        {/* Request Card */}
        {activeSessions.length === 0 && waitingSessions.length === 0 && (
          <div className="counselor-request-card">
            <div className="counselor-request-icon">
              <Icon name="heart outline" size="huge" />
            </div>
            <h3>Need someone to talk to?</h3>
            <p>You'll be randomly matched with a verified counselor. Your identity stays completely hidden throughout the conversation.</p>
            <button
              className="counselor-request-btn"
              onClick={handleRequest}
              disabled={requesting}
            >
              {requesting ? (
                <><Loader active inline size="tiny" inverted style={{ marginRight: '8px' }} /> Finding a counselor...</>
              ) : (
                <><Icon name="handshake outline" /> Request Counselor</>
              )}
            </button>
          </div>
        )}

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <Icon name="comments" style={{ color: '#22c55e' }} /> Active Session
            </h3>
            <div className="counselor-sessions-list">
              {activeSessions.map(session => (
                <div
                  key={session.session_id}
                  className="counselor-session-item active"
                  onClick={() => navigate(`/counselor/chat/${session.session_id}`)}
                >
                  <div className="counselor-session-avatar">
                    <Icon name="user md" size="large" />
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
                          : 'Session started — say hello!'}
                      </span>
                      {parseInt(session.unread_count) > 0 && (
                        <span className="community-unread-badge">{session.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Also show the request button below active session */}
            <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.6 }}>
              <small>You have an active session. Complete it before starting a new one.</small>
            </div>
          </>
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
                    <Icon name="user md" size="large" />
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
      </Container>
    </>
  );
}

export default Counselor;
