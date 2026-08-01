import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LifestyleModal from '../components/LifestyleModal';
import { getLifestyle, getTodayStatus, sendCheckinMessage, completeCheckin, getTodayTip } from '../services/api';

const QUICK_REPLIES = [
  ['😊 Great', '😐 Okay', '😔 Rough', '✍️ Let me explain'],
  ['😊 Good', '😐 Average', '😔 Terrible', '✍️ Let me explain'],
  ['Very manageable', 'Somewhat', 'Barely', 'Not at all'],
  ['Yes, normally', 'Skipped a meal', 'Not really'],
  ['Yes, was active', 'A little', 'No, not today'],
];

/* ── localStorage helpers (keyed by date + userId) ── */
function getTodayKey(userId) {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `checkin_msgs_${userId}_${d}`;
}
function loadMessages(userId) {
  try { return JSON.parse(localStorage.getItem(getTodayKey(userId)) || 'null'); }
  catch { return null; }
}
function saveMessages(userId, msgs) {
  try { localStorage.setItem(getTodayKey(userId), JSON.stringify(msgs)); }
  catch {}
}
function clearMessages(userId) {
  try { localStorage.removeItem(getTodayKey(userId)); }
  catch {}
}

/* ── Animated typing dots ── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'rgba(14,165,233,0.7)', display: 'inline-block',
          animation: `ci-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

function AIBubble({ content, isTyping }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, boxShadow: '0 3px 10px rgba(14,165,233,0.4)',
      }}>🤖</div>
      <div style={{
        maxWidth: '72%', padding: '10px 14px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px 16px 16px 3px',
        color: '#f0f9ff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        lineHeight: 1.6, fontSize: '0.9rem',
        animation: 'ci-pop 0.2s ease',
      }}>
        {isTyping ? <TypingDots /> : content}
      </div>
    </div>
  );
}

function UserBubble({ content }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '72%', padding: '10px 14px',
        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        borderRadius: '16px 16px 3px 16px',
        color: '#fff',
        boxShadow: '0 3px 14px rgba(99,102,241,0.45)',
        lineHeight: 1.6, fontSize: '0.9rem',
        animation: 'ci-pop 0.18s ease',
      }}>
        {content}
      </div>
    </div>
  );
}

function AdviceCard({ text, streak }) {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 6px 28px rgba(99,102,241,0.4)',
      animation: 'ci-pop 0.35s ease', marginTop: 4,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        padding: '12px 16px',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          💡 YOUR WELLNESS TIP
        </div>
        <p style={{ color: '#fff', margin: 0, lineHeight: 1.65, fontSize: '0.9rem' }}>{text}</p>
        {streak > 0 && (
          <div style={{
            marginTop: 10, display: 'inline-flex', gap: 6, alignItems: 'center',
            background: 'rgba(255,255,255,0.18)', borderRadius: 30,
            padding: '4px 12px', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
          }}>
            🔥 {streak}-day streak!
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Done Screen — shown when already checked in today ── */
function DoneScreen({ streak, todayTip }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
      {/* Done badge */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f0f9ff', marginBottom: 6 }}>
          All done for today!
        </div>
        {streak > 0 && (
          <div style={{
            display: 'inline-flex', gap: 6, alignItems: 'center',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
            borderRadius: 30, padding: '5px 16px',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            boxShadow: '0 3px 10px rgba(245,158,11,0.4)',
          }}>
            🔥 {streak}-day streak!
          </div>
        )}
      </div>

      {/* Today's wellness tip */}
      {todayTip && (
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 6px 28px rgba(99,102,241,0.35)',
          animation: 'ci-pop 0.35s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 700 }}>
              💡 YOUR WELLNESS TIP FOR TODAY
            </div>
            <p style={{ color: '#fff', margin: 0, lineHeight: 1.65, fontSize: '0.88rem' }}>{todayTip}</p>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
        Come back tomorrow to keep going 👋
      </div>
    </div>
  );
}

/* ══ CheckIn ════════════════════════════════════ */
export default function CheckIn() {
  const [showModal, setShowModal]         = useState(false);
  const [lifestyle, setLifestyle]         = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [chatStarted, setChatStarted]     = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streak, setStreak]               = useState(0);
  const [adviceCard, setAdviceCard]       = useState(null);
  const [pageLoading, setPageLoading]     = useState(true);
  const [todayTip, setTodayTip]           = useState(null);
  const [userId, setUserId]               = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── On mount: load lifestyle, today status, and userId ──
  useEffect(() => {
    (async () => {
      try {
        const lifestyleRes = await getLifestyle();
        if (lifestyleRes?.exists === false) {
          setShowModal(true);
        } else if (lifestyleRes?.exists === true) {
          setLifestyle(lifestyleRes.data);
        }

        const todayRes = await getTodayStatus();
        if (todayRes) {
          const alreadyDone = todayRes.checkedInToday || false;
          setCheckedInToday(alreadyDone);
          setStreak(todayRes.streak || 0);
          // Store userId for localStorage key (returned from getTodayStatus)
          if (todayRes.userId) setUserId(todayRes.userId);

          // If already done, fetch today's tip
          if (alreadyDone) {
            try {
              const tipRes = await getTodayTip();
              setTodayTip(tipRes?.tip || null);
            } catch {}
          }
        }
      } catch (e) { console.error(e); }
      setPageLoading(false);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Start or resume chat ──
  const startChat = async (ld, uid) => {
    setChatStarted(true);

    // Check localStorage for today's saved messages
    const savedMsgs = uid ? loadMessages(uid) : null;
    if (savedMsgs && savedMsgs.length > 0) {
      // Resume from where they left off — no new AI call needed
      setMessages(savedMsgs);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    // Fresh start — ask AI for the opening message
    setLoading(true);
    try {
      const res = await sendCheckinMessage([], ld || lifestyle);
      const initialMsgs = [{ role: 'ai', content: res.reply }];
      setMessages(initialMsgs);
      if (uid) saveMessages(uid, initialMsgs);
      setTimeout(() => inputRef.current?.focus(), 150);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lifestyle && !chatStarted && !checkedInToday && !pageLoading) {
      startChat(lifestyle, userId);
    }
  }, [lifestyle, chatStarted, checkedInToday, pageLoading, userId]);

  const handleLifestyleComplete = (data) => {
    setLifestyle(data); setShowModal(false); startChat(data, userId);
  };

  const sendMessage = async (text) => {
    if (!text?.trim() || loading) return;
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    if (userId) saveMessages(userId, updated);
    setInput('');
    setLoading(true);

    try {
      const res = await sendCheckinMessage(updated, lifestyle);

      if (res.isComplete) {
        const done = await completeCheckin(updated);
        const withReply = [...updated, { role: 'ai', content: res.reply }];
        setMessages(withReply);
        setAdviceCard(done.advice);
        setStreak(done.streak || streak);
        // Clear localStorage — check-in is complete, no need to resume
        if (userId) clearMessages(userId);
      } else {
        const withReply = [...updated, { role: 'ai', content: res.reply }];
        setMessages(withReply);
        if (userId) saveMessages(userId, withReply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const userCount    = messages.filter(m => m.role === 'user').length;
  const currentChips = !adviceCard && userCount < 5 ? QUICK_REPLIES[userCount] : [];

  const css = `
    @keyframes ci-pop    { from{opacity:0;transform:scale(0.92) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes ci-bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }
    @keyframes ci-float  { 0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)} }
    .ci-chip:hover { background: rgba(14,165,233,0.25) !important; }
    .ci-chat-area::-webkit-scrollbar { width: 4px; }
    .ci-chat-area::-webkit-scrollbar-track { background: transparent; }
    .ci-chat-area::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 4px; }
  `;

  if (pageLoading) return (
    <>
      <Navbar /><style>{css}</style>
      <div style={{ height:'calc(100vh - 56px)', marginTop:56, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid rgba(14,165,233,0.2)',borderTopColor:'#0ea5e9',animation:'ci-bounce 0.7s linear infinite' }} />
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <style>{css}</style>
      {showModal && <LifestyleModal onComplete={handleLifestyleComplete} />}

      {/* ── Outer decorative background ── */}
      <div style={{
        minHeight: 'calc(100vh - 56px)', marginTop: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(14,165,233,0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 60%)',
      }}>

        {/* Floating decorative blobs */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'8%', left:'5%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', animation:'ci-float 7s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'12%', right:'6%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', animation:'ci-float 9s ease-in-out 2s infinite' }} />
          <div style={{ position:'absolute', top:'55%', left:'2%', width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)', animation:'ci-float 11s ease-in-out 1s infinite' }} />
        </div>

        {/* ── Phone-frame chat container ── */}
        <div style={{
          width: '100%', maxWidth: 440,
          height: 'calc(100vh - 120px)', maxHeight: 760,
          display: 'flex', flexDirection: 'column',
          borderRadius: 28,
          background: 'rgba(10,15,30,0.82)',
          backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 0 1px rgba(14,165,233,0.15), 0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(99,102,241,0.15)',
          overflow: 'hidden',
          position: 'relative', zIndex: 1,
        }}>

          {/* ── Header ── */}
          <div style={{
            flexShrink: 0,
            background: 'linear-gradient(180deg, rgba(14,165,233,0.18) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, boxShadow:'0 4px 14px rgba(14,165,233,0.5)',
                border:'2px solid rgba(255,255,255,0.15)',
              }}>🤖</div>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#f0f9ff', letterSpacing:'0.01em' }}>
                  Daily Check-In
                </div>
                <div style={{ fontSize:'0.72rem', color:'#22c55e', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, background:'#22c55e', borderRadius:'50%', display:'inline-block', boxShadow:'0 0 6px #22c55e' }} />
                  TwinSync AI
                </div>
              </div>
            </div>
            <div style={{
              background:'linear-gradient(135deg,#f59e0b,#d97706)',
              color:'#fff', padding:'5px 14px', borderRadius:30,
              fontWeight:700, fontSize:'0.78rem',
              boxShadow:'0 3px 10px rgba(245,158,11,0.4)',
            }}>
              🔥 {streak} Streak
            </div>
          </div>

          {/* ── Already done: show tip + streak ── */}
          {checkedInToday && <DoneScreen streak={streak} todayTip={todayTip} />}

          {/* ── Initializing state (lifestyle loaded but chat not started) ── */}
          {!checkedInToday && !chatStarted && !showModal && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid rgba(14,165,233,0.2)', borderTopColor:'#0ea5e9', animation:'ci-bounce 0.7s linear infinite' }} />
            </div>
          )}

          {/* ── Messages ── */}
          {!checkedInToday && chatStarted && (
            <div className="ci-chat-area" style={{
              flex:1, overflowY:'auto', padding:'16px 14px',
              display:'flex', flexDirection:'column', gap:10,
            }}>
              {messages.map((m, i) => (
                m.role === 'user'
                  ? <UserBubble key={i} content={m.content} />
                  : <AIBubble   key={i} content={m.content} />
              ))}
              {loading && <AIBubble isTyping />}
              {adviceCard && <AdviceCard text={adviceCard} streak={streak} />}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ── Input footer — only show when chat is active ── */}
          {!checkedInToday && !adviceCard && chatStarted && (
            <div style={{
              flexShrink:0,
              borderTop:'1px solid rgba(255,255,255,0.07)',
              padding:'10px 14px 14px',
              background:'rgba(0,0,0,0.2)',
            }}>
              {/* Quick chips */}
              {currentChips.length > 0 && !loading && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                  {currentChips.map(chip => (
                    <button key={chip} className="ci-chip" onClick={() => sendMessage(chip)} style={{
                      padding:'5px 13px', borderRadius:30, fontSize:'0.78rem', fontWeight:600,
                      border:'1px solid rgba(14,165,233,0.4)',
                      background:'rgba(14,165,233,0.1)',
                      color:'#7dd3fc', cursor:'pointer', transition:'all 0.15s',
                    }}>
                      {chip}
                    </button>
                  ))}
                </div>
              )}
              {/* Text input */}
              <div style={{
                display:'flex', gap:8, alignItems:'center',
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:30, padding:'6px 6px 6px 16px',
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder="Type your reply…"
                  disabled={loading}
                  style={{
                    flex:1, border:'none', outline:'none',
                    background:'transparent', color:'#f0f9ff',
                    fontSize:'0.88rem', caretColor:'#0ea5e9',
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  style={{
                    width:38, height:38, borderRadius:'50%', border:'none',
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg,#0ea5e9,#6366f1)'
                      : 'rgba(255,255,255,0.06)',
                    color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.25)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    fontSize:17, display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.2s',
                    boxShadow: input.trim() && !loading ? '0 3px 12px rgba(99,102,241,0.45)' : 'none',
                  }}
                >➤</button>
              </div>
            </div>
          )}

          {/* Advice done footer */}
          {adviceCard && (
            <div style={{
              flexShrink:0, padding:'10px 14px 16px', textAlign:'center',
              borderTop:'1px solid rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.4)', fontSize:'0.78rem',
            }}>
              ✨ Check-in complete — see you tomorrow!
            </div>
          )}
        </div>
      </div>
    </>
  );
}
