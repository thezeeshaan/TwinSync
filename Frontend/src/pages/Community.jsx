import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Header, Input, Icon, Loader, Message } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('conversations'); // 'conversations' or 'peers'
  const [conversations, setConversations] = useState([]);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    };
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/community/conversations`, { headers });
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      setError('Failed to load conversations');
    }
  };

  // Fetch peers
  const fetchPeers = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/community/peers`, { headers });
      const data = await res.json();
      if (res.ok) {
        setPeers(data.peers || []);
      }
    } catch (err) {
      setError('Failed to load peers');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchConversations();
      await fetchPeers();
      setLoading(false);
    };
    loadData();
  }, []);

  // Start or open a conversation with a peer
  const openChat = async (peerId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/community/conversations/${peerId}`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/community/chat/${data.conversation_id}`);
      } else {
        setError(data.error || 'Failed to start conversation');
      }
    } catch (err) {
      setError('Failed to start conversation');
    }
  };

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

  // Filtered peers by search
  const filteredPeers = peers.filter(p =>
    p.anonymous_alias.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered conversations by search
  const filteredConversations = conversations.filter(c =>
    c.peer_alias.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader active inline="centered" size="large">Loading Community...</Loader>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container style={{ marginTop: '7em', paddingBottom: '4em', padding: '0 1rem' }}>
        {/* Header */}
        <div className="community-header">
          <Header as="h1" className="dashboard-welcome" style={{ marginBottom: '0.25rem' }}>
            Community
          </Header>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Anonymous peer support — your identity is always hidden
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="community-tabs">
          <button
            className={`community-tab ${view === 'conversations' ? 'active' : ''}`}
            onClick={() => setView('conversations')}
          >
            <Icon name="comments" /> Chats
            {conversations.some(c => parseInt(c.unread_count) > 0) && (
              <span className="community-tab-badge" />
            )}
          </button>
          <button
            className={`community-tab ${view === 'peers' ? 'active' : ''}`}
            onClick={() => setView('peers')}
          >
            <Icon name="users" /> Peers ({peers.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Input
            icon="search"
            placeholder={view === 'conversations' ? 'Search chats...' : 'Search peers...'}
            fluid
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="community-search"
          />
        </div>

        {error && <Message error content={error} style={{ marginBottom: '1rem' }} />}

        {/* Conversations View */}
        {view === 'conversations' && (
          <div className="community-list">
            {filteredConversations.length === 0 ? (
              <div className="community-empty">
                <Icon name="comments outline" size="huge" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No conversations yet</p>
                <button className="community-start-btn" onClick={() => setView('peers')}>
                  Find peers to chat with
                </button>
              </div>
            ) : (
              filteredConversations.map(convo => (
                <div
                  key={convo.conversation_id}
                  className="community-item"
                  onClick={() => navigate(`/community/chat/${convo.conversation_id}`)}
                >
                  <div className="community-avatar">
                    <Icon name="user secret" size="large" />
                    {convo.peer_is_online && <span className="community-online-dot" />}
                  </div>
                  <div className="community-item-content">
                    <div className="community-item-top">
                      <span className="community-alias">{convo.peer_alias}</span>
                      <span className="community-time">{timeAgo(convo.last_message_at)}</span>
                    </div>
                    <div className="community-item-bottom">
                      <span className="community-preview">
                        {convo.last_message
                          ? (convo.last_message.length > 50
                              ? convo.last_message.substring(0, 50) + '...'
                              : convo.last_message)
                          : 'No messages yet'}
                      </span>
                      {parseInt(convo.unread_count) > 0 && (
                        <span className="community-unread-badge">{convo.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Peers View */}
        {view === 'peers' && (
          <div className="community-list">
            {filteredPeers.length === 0 ? (
              <div className="community-empty">
                <Icon name="users" size="huge" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No peers found in your institute</p>
              </div>
            ) : (
              filteredPeers.map(peer => (
                <div
                  key={peer.id}
                  className="community-item"
                  onClick={() => openChat(peer.id)}
                >
                  <div className="community-avatar">
                    <Icon name="user secret" size="large" />
                    {peer.is_online && <span className="community-online-dot" />}
                  </div>
                  <div className="community-item-content">
                    <div className="community-item-top">
                      <span className="community-alias">{peer.anonymous_alias}</span>
                      <span className={`community-status ${peer.is_online ? 'online' : 'offline'}`}>
                        {peer.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="community-item-bottom">
                      <span className="community-preview" style={{ opacity: 0.6 }}>
                        Tap to start anonymous chat
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Container>
    </>
  );
}

export default Community;
