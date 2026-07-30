import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon, Loader } from 'semantic-ui-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function CommunityChat() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peerAlias, setPeerAlias] = useState('Anonymous Peer');
  const [peerOnline, setPeerOnline] = useState(false);
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

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages + conversation metadata
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();

        // Fetch messages
        const msgRes = await fetch(
          `${API_URL}/api/community/conversations/${conversationId}/messages`,
          { headers }
        );
        const msgData = await msgRes.json();
        if (msgRes.ok) {
          setMessages(msgData.messages || []);
        }

        // Fetch conversation list to get peer alias
        const convRes = await fetch(`${API_URL}/api/community/conversations`, { headers });
        const convData = await convRes.json();
        if (convRes.ok) {
          const thisConvo = convData.conversations?.find(c => c.conversation_id === conversationId);
          if (thisConvo) {
            setPeerAlias(thisConvo.peer_alias);
            setPeerOnline(thisConvo.peer_is_online);
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMsg = payload.new;
        // Avoid duplicates (message we just sent)
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send message
  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/api/community/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: trimmed })
        }
      );
      const data = await res.json();
      if (res.ok) {
        // Add the message immediately (Realtime will also fire but we deduplicate)
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

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format message time
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date separator
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const getDateForMessage = (msg, index) => {
    if (index === 0) return formatDate(msg.created_at);
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    const currDate = new Date(msg.created_at).toDateString();
    if (prevDate !== currDate) return formatDate(msg.created_at);
    return null;
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate('/community')}>
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
      {/* Chat Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/community')}>
          <Icon name="arrow left" />
        </button>
        <div className="chat-header-info">
          <Icon name="user secret" style={{ marginRight: '8px', opacity: 0.8 }} />
          <span className="chat-peer-name">{peerAlias}</span>
          <span className={`chat-status-dot ${peerOnline ? 'online' : ''}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="lock" size="huge" style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>This conversation is end-to-end anonymous</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Say hi to get started!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const dateLabel = getDateForMessage(msg, index);
            const isMine = msg.sender_id === user?.id;

            return (
              <React.Fragment key={msg.id}>
                {dateLabel && (
                  <div className="chat-date-separator">
                    <span>{dateLabel}</span>
                  </div>
                )}
                <div className={`chat-bubble-row ${isMine ? 'sent' : 'received'}`}>
                  <div className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>
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
    </div>
  );
}

export default CommunityChat;
