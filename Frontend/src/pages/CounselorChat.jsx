import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon, Loader } from 'semantic-ui-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function CounselorChat() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myRole, setMyRole] = useState('student');
  const [sessionStatus, setSessionStatus] = useState('active');
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_URL}/api/counselor/sessions/${sessionId}/messages`,
          { headers }
        );
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages || []);
          setMyRole(data.my_role || 'student');
        }

        // Get session status
        const sessRes = await fetch(`${API_URL}/api/counselor/sessions`, { headers });
        const sessData = await sessRes.json();
        if (sessRes.ok) {
          const thisSession = sessData.sessions?.find(s => s.session_id === sessionId);
          if (thisSession) {
            setSessionStatus(thisSession.status);
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`counselor-chat-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'counselor_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const newMsg = payload.new;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Send message
  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/api/counselor/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: trimmed })
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setNewMessage('');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  // End session
  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this session?')) return;

    setEnding(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/api/counselor/sessions/${sessionId}/end`,
        { method: 'POST', headers }
      );
      if (res.ok) {
        setSessionStatus('completed');
      }
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setEnding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getDateForMessage = (msg, index) => {
    if (index === 0) return formatDate(msg.created_at);
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    const currDate = new Date(msg.created_at).toDateString();
    if (prevDate !== currDate) return formatDate(msg.created_at);
    return null;
  };

  const peerLabel = myRole === 'student' ? 'Counselor' : 'Student';
  const isActive = sessionStatus === 'active';

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-header counselor-chat-header">
          <button className="chat-back-btn" onClick={() => navigate(myRole === 'counselor' ? '/dashboard' : '/counselor')}>
            <Icon name="arrow left" />
          </button>
          <div className="chat-header-info">
            <span className="chat-peer-name">Loading...</span>
          </div>
        </div>
        <div className="chat-messages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader active inline="centered" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header counselor-chat-header">
        <button className="chat-back-btn" onClick={() => navigate(myRole === 'counselor' ? '/dashboard' : '/counselor')}>
          <Icon name="arrow left" />
        </button>
        <div className="chat-header-info">
          <Icon name="user md" style={{ marginRight: '8px', opacity: 0.8 }} />
          <span className="chat-peer-name">{peerLabel}</span>
          {isActive && <span className="chat-status-dot online" />}
        </div>
        {isActive && (
          <button
            className="counselor-end-btn"
            onClick={handleEndSession}
            disabled={ending}
          >
            <Icon name="stop" /> End
          </button>
        )}
      </div>

      {/* Session ended banner */}
      {!isActive && (
        <div className="counselor-ended-banner">
          <Icon name="check circle" /> This session has ended
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="shield" size="huge" style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>This is an anonymous counseling session</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Your identity is completely hidden</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const dateLabel = getDateForMessage(msg, index);
            const isMine = msg.sender_role === myRole;

            return (
              <React.Fragment key={msg.id}>
                {dateLabel && (
                  <div className="chat-date-separator">
                    <span>{dateLabel}</span>
                  </div>
                )}
                <div className={`chat-bubble-row ${isMine ? 'sent' : 'received'}`}>
                  <div className={`chat-bubble ${isMine ? 'sent' : 'received'} counselor-bubble`}>
                    <p className="chat-bubble-text">{msg.content}</p>
                    <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {isActive ? (
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            autoFocus
          />
          <button
            className={`chat-send-btn ${newMessage.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Icon name="send" />
          </button>
        </div>
      ) : (
        <div className="chat-input-bar" style={{ justifyContent: 'center', padding: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This session has ended. Messages are read-only.
          </span>
        </div>
      )}
    </div>
  );
}

export default CounselorChat;
