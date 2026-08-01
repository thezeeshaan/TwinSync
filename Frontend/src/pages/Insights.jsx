import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LifestyleModal from '../components/LifestyleModal';
import { getLifestyle, startInsights, sendInsightMessage, endInsights, getActiveInsightsSession, getPastInsightsSessions, getPastSessionDetail } from '../services/api';

/* ── Typing dots ── */
function TypingDots() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 0' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:7, height:7, borderRadius:'50%',
          background:'rgba(139,92,246,0.75)', display:'inline-block',
          animation:`in-bounce 1.2s ease-in-out ${i*0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

function AIBubble({ content, isTyping }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
      <div style={{
        width:32, height:32, borderRadius:'50%', flexShrink:0,
        background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:15, boxShadow:'0 3px 10px rgba(99,102,241,0.45)',
        border:'2px solid rgba(255,255,255,0.1)',
      }}>🧠</div>
      <div style={{
        maxWidth:'72%', padding:'10px 14px',
        background:'rgba(255,255,255,0.08)',
        backdropFilter:'blur(10px)',
        border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:'16px 16px 16px 3px',
        color:'#f5f3ff',
        boxShadow:'0 2px 12px rgba(0,0,0,0.25)',
        lineHeight:1.6, fontSize:'0.9rem',
        animation:'in-pop 0.22s ease',
      }}>
        {isTyping ? <TypingDots /> : content}
      </div>
    </div>
  );
}

function UserBubble({ content }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div style={{
        maxWidth:'72%', padding:'10px 14px',
        background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
        borderRadius:'16px 16px 3px 16px',
        color:'#fff',
        boxShadow:'0 3px 14px rgba(139,92,246,0.45)',
        lineHeight:1.6, fontSize:'0.9rem',
        animation:'in-pop 0.18s ease',
      }}>
        {content}
      </div>
    </div>
  );
}

/* ── Summary card with bullet suggestions — no risk color shown to student ── */
function SummaryCard({ summary, suggestions }) {
  return (
    <div style={{
      borderRadius:16, overflow:'hidden',
      boxShadow:'0 6px 28px rgba(99,102,241,0.4)',
      animation:'in-pop 0.35s ease', marginTop:4,
    }}>
      {/* Summary */}
      <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'14px 16px' }}>
        <div style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.65)', marginBottom:6, fontWeight:700 }}>
          📋 SESSION SUMMARY
        </div>
        <p style={{ color:'#fff', margin:0, lineHeight:1.65, fontSize:'0.88rem' }}>{summary}</p>
      </div>

      {/* Bullet-point suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div style={{ background:'rgba(99,102,241,0.15)', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'14px 16px' }}>
          <div style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.6)', marginBottom:10, fontWeight:700 }}>
            💡 SUGGESTED NEXT STEPS
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{
                  flexShrink:0, width:22, height:22, borderRadius:'50%',
                  background:'rgba(139,92,246,0.35)',
                  border:'1px solid rgba(139,92,246,0.5)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.7rem', fontWeight:700, color:'#c4b5fd',
                }}>{i + 1}</div>
                <div style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.85rem', lineHeight:1.55, paddingTop:2 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ Insights ═══════════════════════════════════ */
export default function Insights() {
  const [showModal, setShowModal]       = useState(false);
  const [lifestyle, setLifestyle]       = useState(null);
  const [sessionId, setSessionId]       = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [distressFlag, setDistressFlag] = useState(false);
  const [summary, setSummary]           = useState(null);
  const [suggestions, setSuggestions]   = useState([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [pssScores, setPssScores]       = useState(null);
  const [pssTotal, setPssTotal]         = useState(null);
  const [showEndButton, setShowEndButton] = useState(false);
  // Tabs
  const [activeTab, setActiveTab]         = useState('current'); // 'current' | 'past'
  // Past sessions
  const [pastSessions, setPastSessions]   = useState([]);
  const [expandedId, setExpandedId]       = useState(null);   // which session is open
  const [sessionDetail, setSessionDetail] = useState({});     // { [id]: { messages, summary } }
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── On mount: check lifestyle, then load past sessions in background ──
  useEffect(() => {
    (async () => {
      try {
        const res = await getLifestyle();
        if (res?.exists === false) setShowModal(true);
        else if (res?.exists === true) setLifestyle(res.data);
      } catch (e) { console.error(e); }
      setPageLoading(false);
      // Load past sessions list in background
      try {
        const past = await getPastInsightsSessions();
        if (past?.sessions) setPastSessions(past.sessions);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  // ── Begin or resume session when lifestyle is ready ──
  useEffect(() => {
    if (lifestyle && !sessionId && !pageLoading) beginSession();
  }, [lifestyle, sessionId, pageLoading]);

  const beginSession = async () => {
    setLoading(true);
    try {
      // First: check if there's an active session today in DB
      const active = await getActiveInsightsSession();
      if (active?.session_id && active.messages.length > 0) {
        // Resume existing session — restore showEndButton based on message count
        const userTurnCount = active.messages.filter(m => m.role === 'user').length;
        setSessionId(active.session_id);
        setMessages(active.messages);
        setShowEndButton(userTurnCount > 18); // Phase 4 starts at turn 19
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 150);
        return;
      }

      // No active session — start a fresh one, reset all session state
      setShowEndButton(false);
      setPssScores(null);
      setPssTotal(null);
      setSummary(null);
      setSuggestions([]);
      const res = await startInsights();
      setSessionId(res.session_id);
      setMessages([{ role:'ai', content:res.reply }]);
    } catch (e) { console.error(e); }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleLifestyleComplete = (data) => { setLifestyle(data); setShowModal(false); };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const updated = [...messages, { role:'user', content:input }];
    setMessages(updated); setInput(''); setLoading(true);
    try {
      const res = await sendInsightMessage(sessionId, input, updated);
      setMessages(m => [...m, { role:'ai', content:res.reply }]);
      if (res.pss_scores) setPssScores(res.pss_scores);
      if (res.pss_total != null) setPssTotal(res.pss_total);
      if (res.distress_score >= 5) setDistressFlag(true);
      // Server unlocks End button when Phase 4 starts (turn 19+)
      if (res.show_end_button) setShowEndButton(true);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // End session → also refresh past sessions list
  const doEnd = async (hist, scores, total) => {
    setLoading(true);
    try {
      const res = await endInsights(sessionId, hist || messages, scores || pssScores, total ?? pssTotal);
      setSummary(res.summary);
      setSuggestions(res.suggestions || []);
      // Refresh past sessions list after ending
      try {
        const past = await getPastInsightsSessions();
        if (past?.sessions) setPastSessions(past.sessions);
      } catch (_) {}
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Expand a past session — lazy load its full transcript
  const toggleSession = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!sessionDetail[id]) {
      try {
        const detail = await getPastSessionDetail(id);
        setSessionDetail(prev => ({ ...prev, [id]: detail }));
      } catch (e) { console.error(e); }
    }
  };

  // End button: only visible when server unlocks it (Phase 4 start), hidden after session ends
  const canEnd = showEndButton && !summary;

  const css = `
    @keyframes in-pop    { from{opacity:0;transform:scale(0.92) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes in-bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }
    @keyframes in-float  { 0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)} }
    .in-chat::-webkit-scrollbar { width:4px; }
    .in-chat::-webkit-scrollbar-track { background:transparent; }
    .in-chat::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.25); border-radius:4px; }
  `;

  if (pageLoading) return (
    <>
      <Navbar /><style>{css}</style>
      <div style={{ height:'calc(100vh - 56px)', marginTop:56, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(139,92,246,0.2)', borderTopColor:'#8b5cf6', animation:'in-bounce 0.7s linear infinite' }} />
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
        minHeight:'calc(100vh - 56px)', marginTop:56,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'24px 16px',
        position:'relative',
        background:'radial-gradient(ellipse 80% 60% at 15% 25%, rgba(99,102,241,0.2) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 85% 75%, rgba(139,92,246,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 55% 45%, rgba(16,185,129,0.07) 0%, transparent 60%)',
      }}>

        {/* Floating blobs */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'10%', right:'8%', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', animation:'in-float 8s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'10%', left:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 70%)', animation:'in-float 10s ease-in-out 2s infinite' }} />
          <div style={{ position:'absolute', top:'50%', right:'3%', width:170, height:170, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)', animation:'in-float 12s ease-in-out 1s infinite' }} />
          {[[12,30],[78,15],[25,70],[88,60],[50,10],[65,85]].map(([x,y],i) => (
            <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:3, height:3, borderRadius:'50%', background:`rgba(${i%2?'139,92,246':'14,165,233'},0.45)`, animation:`in-float ${6+i}s ease-in-out ${i*0.7}s infinite` }} />
          ))}
        </div>

        {/* ── Phone-frame chat container ── */}
        <div style={{
          width:'100%', maxWidth:440,
          height:'calc(100vh - 120px)', maxHeight:760,
          display:'flex', flexDirection:'column',
          borderRadius:28,
          background:'rgba(8,10,24,0.85)',
          backdropFilter:'blur(28px)',
          border:'1.5px solid rgba(255,255,255,0.09)',
          boxShadow:'0 0 0 1px rgba(99,102,241,0.2), 0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(139,92,246,0.18)',
          overflow:'hidden',
          position:'relative', zIndex:1,
        }}>

          {/* ── Header ── */}
          <div style={{
            flexShrink:0,
            background:'linear-gradient(180deg, rgba(99,102,241,0.2) 0%, transparent 100%)',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            padding:'16px 18px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, boxShadow:'0 4px 14px rgba(99,102,241,0.55)',
                border:'2px solid rgba(255,255,255,0.12)',
              }}>🧠</div>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#f5f3ff', letterSpacing:'0.01em' }}>
                  Insights
                </div>
                <div style={{ fontSize:'0.72rem', color:'#22c55e', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, background:'#22c55e', borderRadius:'50%', display:'inline-block', boxShadow:'0 0 6px #22c55e' }} />
                  Private &amp; Confidential
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {distressFlag && !summary && (
                <div style={{
                  background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.35)',
                  borderRadius:30, padding:'4px 11px',
                  color:'#fbbf24', fontSize:'0.73rem', fontWeight:600,
                }}>💛 Need help?</div>
              )}
              {/* End button — only after server unlocks Phase 4 */}
              {canEnd && (
                <button
                  onClick={() => doEnd(null, null, null)}
                  disabled={loading}
                  style={{
                    padding:'5px 14px', borderRadius:30,
                    border:'1px solid rgba(255,255,255,0.15)',
                    background:'rgba(255,255,255,0.07)',
                    color:'rgba(255,255,255,0.65)', cursor:loading?'not-allowed':'pointer',
                    fontWeight:600, fontSize:'0.75rem', transition:'all 0.2s',
                  }}
                >
                  End &amp; Summarise
                </button>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{
            flexShrink:0, display:'flex',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(0,0,0,0.18)',
          }}>
            {['current','past'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex:1, padding:'10px 0',
                  border:'none', cursor:'pointer',
                  background:'transparent',
                  color: activeTab===tab ? '#a78bfa' : 'rgba(255,255,255,0.38)',
                  fontWeight: activeTab===tab ? 700 : 500,
                  fontSize:'0.82rem',
                  borderBottom: activeTab===tab ? '2px solid #8b5cf6' : '2px solid transparent',
                  transition:'all 0.2s',
                  letterSpacing:'0.02em',
                }}
              >
                {tab === 'current' ? '💬 Current Session' : `🕘 Past Sessions${pastSessions.length ? ` (${pastSessions.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* ── Tab: Current Session ── */}

          {activeTab === 'current' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
              {/* Messages — scrollable */}
              <div className="in-chat" style={{
                flex:1, overflowY:'auto', padding:'16px 14px',
                display:'flex', flexDirection:'column', gap:10,
                minHeight:0,
              }}>
                {messages.map((m,i) => (
                  m.role==='user'
                    ? <UserBubble key={i} content={m.content} />
                    : <AIBubble   key={i} content={m.content} />
                ))}
                {loading && <AIBubble isTyping />}
                {summary && <SummaryCard summary={summary} suggestions={suggestions} />}
                <div ref={bottomRef} />
              </div>

              {/* Input footer — hidden when session is complete */}
              {!summary && (
                <div style={{
                  flexShrink:0,
                  borderTop:'1px solid rgba(255,255,255,0.06)',
                  padding:'10px 14px 14px',
                  background:'rgba(0,0,0,0.25)',
                }}>
                  <div style={{
                    display:'flex', gap:8, alignItems:'center',
                    background:'rgba(255,255,255,0.06)',
                    border:'1px solid rgba(255,255,255,0.09)',
                    borderRadius:30, padding:'6px 6px 6px 16px',
                  }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Share what's on your mind…"
                      disabled={loading}
                      style={{
                        flex:1, border:'none', outline:'none',
                        background:'transparent', color:'#f5f3ff',
                        fontSize:'0.88rem', caretColor:'#8b5cf6',
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      style={{
                        width:38, height:38, borderRadius:'50%', border:'none',
                        background: input.trim() && !loading
                          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                          : 'rgba(255,255,255,0.06)',
                        color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.2)',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        fontSize:17, display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.2s',
                        boxShadow: input.trim() && !loading ? '0 3px 12px rgba(139,92,246,0.5)' : 'none',
                      }}
                    >➤</button>
                  </div>
                </div>
              )}

              {/* Done footer */}
              {summary && (
                <div style={{
                  flexShrink:0, padding:'10px 14px 16px', textAlign:'center',
                  borderTop:'1px solid rgba(255,255,255,0.06)',
                  color:'rgba(255,255,255,0.35)', fontSize:'0.76rem',
                }}>
                  ✨ Session complete — take care of yourself today.
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="in-chat" style={{
              flex:1, overflowY:'auto', padding:'14px',
              display:'flex', flexDirection:'column', gap:10,
              minHeight:0,
            }}>
              {pastSessions.length === 0 ? (
                <div style={{ textAlign:'center', marginTop:60, color:'rgba(255,255,255,0.3)', fontSize:'0.85rem' }}>
                  <div style={{ fontSize:38, marginBottom:12 }}>🕘</div>
                  No past sessions yet.
                  <br/>
                  <span style={{ fontSize:'0.78rem' }}>Complete a session to see it here.</span>
                </div>
              ) : pastSessions.map(session => {
                const isOpen  = expandedId === session.id;
                const detail  = sessionDetail[session.id];
                const dateStr = new Date(session.ended_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
                const timeStr = new Date(session.ended_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
                return (
                  <div key={session.id} style={{
                    borderRadius:16, flexShrink:0,
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    overflow:'hidden',
                    transition:'border-color 0.2s',
                    ...(isOpen ? { borderColor:'rgba(139,92,246,0.4)' } : {}),
                  }}>
                    {/* Session header — click to expand */}
                    <button
                      onClick={() => toggleSession(session.id)}
                      style={{
                        width:'100%', padding:'12px 14px',
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        background:'transparent', border:'none', cursor:'pointer', textAlign:'left',
                      }}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'#e0d7ff', fontWeight:600, fontSize:'0.88rem' }}>📅 {dateStr}</div>
                        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.73rem', marginTop:2 }}>Ended at {timeStr}</div>
                        {!isOpen && session.summary && (
                          <div style={{
                            marginTop:6, color:'rgba(255,255,255,0.55)', fontSize:'0.78rem',
                            lineHeight:1.4,
                            display:'-webkit-box', WebkitLineClamp:2,
                            WebkitBoxOrient:'vertical', overflow:'hidden',
                          }}>
                            {session.summary}
                          </div>
                        )}
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.9rem', marginLeft:8, flexShrink:0 }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* Expanded: scrollable transcript + summary */}
                    {isOpen && (
                      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                        {!detail ? (
                          <div style={{ textAlign:'center', padding:'16px 0', color:'rgba(255,255,255,0.3)', fontSize:'0.8rem' }}>Loading…</div>
                        ) : (
                          <>
                            {/* Scrollable transcript */}
                            <div className="in-chat" style={{
                              maxHeight:320, overflowY:'auto',
                              padding:'10px 14px',
                              display:'flex', flexDirection:'column', gap:8,
                            }}>
                              {detail.messages?.map((m, i) => (
                                m.role === 'user'
                                  ? <UserBubble key={i} content={m.content} />
                                  : <AIBubble   key={i} content={m.content} />
                              ))}
                            </div>
                            {/* Summary card */}
                            {detail.summary && (
                              <div style={{ padding:'0 14px 14px' }}>
                                <SummaryCard summary={detail.summary} suggestions={[]} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}


        </div>
      </div>
    </>
  );
}
