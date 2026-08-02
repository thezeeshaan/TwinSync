import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Icon, Loader, Modal, Button } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

// ──────────────────────────────────────────────────────────
// HARDCODED DATA
// ──────────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
  { text: "There is hope, even when your brain tells you there isn't.", author: "John Green" },
  { text: "Self-care is not self-indulgence, it is self-preservation.", author: "Audre Lorde" },
  { text: "You are not your illness. You have an individual story to tell.", author: "Julian Seifter" },
  { text: "Recovery is not one and done. It is a lifelong journey.", author: "Unknown" },
  { text: "Mental health is not a destination, but a process.", author: "Noam Shpancer" },
  { text: "It's okay to not be okay — as long as you are not giving up.", author: "Karen Salmansohn" },
  { text: "Healing takes time, and asking for help is a courageous step.", author: "Mariska Hargitay" },
  { text: "The strongest people are those who win battles we know nothing about.", author: "Unknown" },
  { text: "You are allowed to be both a masterpiece and a work in progress.", author: "Sophia Bush" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
  { text: "Be gentle with yourself. You're doing the best you can.", author: "Unknown" },
];

const WELLNESS_TIPS = [
  { icon: "tint", title: "Stay Hydrated", tip: "Drink at least 8 glasses of water today. Dehydration can affect your mood and concentration." },
  { icon: "moon", title: "Prioritize Sleep", tip: "Aim for 7-9 hours of sleep. A consistent sleep schedule improves mental clarity and emotional resilience." },
  { icon: "heartbeat", title: "Move Your Body", tip: "Even a 10-minute walk can boost your mood. Physical activity releases endorphins that help fight stress." },
  { icon: "leaf", title: "Practice Deep Breathing", tip: "Try the 4-7-8 technique: inhale for 4s, hold for 7s, exhale for 8s. Repeat 3 times to calm your mind." },
  { icon: "book", title: "Journal Your Thoughts", tip: "Spend 5 minutes writing down what you're grateful for. Gratitude journaling is proven to improve well-being." },
  { icon: "users", title: "Connect With Someone", tip: "Reach out to a friend or peer today. Social connection is one of the strongest protectors of mental health." },
];

const ONBOARDING_STEPS = [
  { icon: "heart", title: "Welcome to TwinSync!", description: "TwinSync is your safe, anonymous mental health companion on campus. Everything you share here stays private." },
  { icon: "check circle", title: "📋 Check-In", description: "Start each day with a quick check-in. Answer a daily wellness question, build your streak, and get personalized recommendations." },
  { icon: "lightbulb", title: "🧠 Insights", description: "Have a guided conversation with our AI counselor. It asks thoughtful questions and provides a personalized assessment of your well-being." },
  { icon: "user md", title: "🩺 Counselor", description: "Need professional help? Get matched anonymously with a verified counselor for a private 1-on-1 text session. Your identity is never revealed." },
  { icon: "comments", title: "💬 Community", description: "Connect with peers anonymously through direct messages. Everyone uses auto-generated aliases — no real names, no judgments." },
  { icon: "shield", title: "Your Privacy Matters", description: "No profile photos. No real names in chats. Your data is never sold. You control your consent settings at all times." },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

function Dashboard() {
  const { user, profile, role, verificationStatus } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const quote = getDailyQuote();

  // Check if user has seen the guide before (Removed auto popup)
  // useEffect(() => {
  //   const guideKey = `twinsync_guide_seen_${user?.id}`;
  //   const hasSeen = localStorage.getItem(guideKey);
  //   if (!hasSeen && role !== 'counselor') {
  //     setShowGuide(true);
  //   }
  // }, [user, role]);

  const dismissGuide = () => {
    const guideKey = `twinsync_guide_seen_${user?.id}`;
    localStorage.setItem(guideKey, 'true');
    setShowGuide(false);
    setGuideStep(0);
  };

  // Fetch dashboard data
  useEffect(() => {

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        };

        const [coursesRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/courses`, { headers }),
          fetch(`${API_URL}/api/dashboard/events`, { headers })
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses || []);
        }
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  const formatEventDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ──── COUNSELOR VIEWS ────
  if (role === 'counselor' && verificationStatus !== 'verified') {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', paddingBottom: '4em' }}>
          <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 2rem auto'
            }}>
              <Icon name="clock" size="large" style={{ color: 'white', margin: 0 }} />
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Application Under Review</h1>
            <div style={{
              padding: '1.5rem', borderRadius: '12px', border: '1px solid #f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.08)', textAlign: 'left', marginBottom: '1.5rem'
            }}>
              <strong>Pending Administrator Approval</strong>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                Thank you for registering as a counselor on TwinSync. Your profile is currently being verified.
                You will receive access once your account is approved. This usually takes 24–48 hours.
              </p>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Signed in as: <strong>{user?.email}</strong>
            </p>
          </div>
        </Container>
      </>
    );
  }

  // ──── STUDENT DASHBOARD ────
  if (loading) {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader active inline="centered" size="large">Loading Dashboard...</Loader>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">

        {/* ═══════ HERO / MOTIVATIONAL QUOTE ═══════ */}
        <section className="dash-hero">
          <div className="dash-hero-content">
            <h1 className="dash-hero-greeting">Welcome back, {profile?.name || 'there'}! 👋</h1>
            <blockquote className="dash-hero-quote">
              <p>"{quote.text}"</p>
              <cite>— {quote.author}</cite>
            </blockquote>
          </div>
        </section>

        {/* ═══════ FEATURE SUMMARY CARDS ═══════ */}
        <section className="dash-section">
          <h2 className="dash-section-title"><Icon name="th" /> Your Pillars</h2>
          <div className="dash-pillars-grid">
            <div className="dash-pillar-card checkin" onClick={() => navigate('/checkin')}>
              <div className="dash-pillar-icon"><Icon name="check circle" size="big" /></div>
              <h3>Check-In</h3>
              <p>Track your daily mood and build a wellness streak.</p>
            </div>
            <div className="dash-pillar-card insights" onClick={() => navigate('/insights')}>
              <div className="dash-pillar-icon"><Icon name="lightbulb" size="big" /></div>
              <h3>Insights</h3>
              <p>Get a personalized AI-driven assessment session.</p>
            </div>
            {role !== 'counselor' && (
              <div className="dash-pillar-card counselor" onClick={() => navigate('/counselor')}>
                <div className="dash-pillar-icon"><Icon name="user md" size="big" /></div>
                <h3>Counselor</h3>
                <p>Connect anonymously with a verified professional.</p>
              </div>
            )}
            {role === 'counselor' && (
              <div className="dash-pillar-card counselor" onClick={() => navigate('/my-sessions')}>
                <div className="dash-pillar-icon" style={{ color: '#22c55e' }}><Icon name="comments" size="big" /></div>
                <h3>My Sessions</h3>
                <p>Manage your counseling sessions and availability.</p>
              </div>
            )}
            {role !== 'counselor' && (
              <div className="dash-pillar-card community" onClick={() => navigate('/community')}>
                <div className="dash-pillar-icon"><Icon name="comments" size="big" /></div>
                <h3>Community</h3>
                <p>Chat anonymously with peers who understand.</p>
              </div>
            )}
            <div className="dash-pillar-card guide" onClick={() => { setShowGuide(true); setGuideStep(0); }}>
              <div className="dash-pillar-icon" style={{ color: '#ec4899' }}><Icon name="compass" size="big" /></div>
              <h3>Platform Guide</h3>
              <p>Learn how to use TwinSync safely.</p>
            </div>
          </div>
        </section>

        {/* ═══════ DAILY RECOMMENDATIONS ═══════ */}
        <section className="dash-section">
          <h2 className="dash-section-title"><Icon name="star" /> Daily Wellness Tips</h2>
          <div className="dash-proto-notice">
            <Icon name="info circle" /> These are prototype recommendations. Personalized AI-driven tips will replace them once the Check-In pipeline is live.
          </div>
          <div className="dash-tips-grid">
            {WELLNESS_TIPS.map((tip, i) => (
              <div key={i} className="dash-tip-card">
                <div className="dash-tip-icon"><Icon name={tip.icon} size="large" /></div>
                <h4>{tip.title}</h4>
                <p>{tip.tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ MENTAL HEALTH COURSES ═══════ */}
        <section className="dash-section">
          <h2 className="dash-section-title"><Icon name="book" /> Mental Health Courses</h2>
          {courses.length === 0 ? (
            <div className="dash-empty">
              <Icon name="folder open outline" size="huge" style={{ opacity: 0.3 }} />
              <p>No courses available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="dash-courses-grid">
              {courses.map(c => (
                <a key={c.id} href={c.content_url} target="_blank" rel="noopener noreferrer" className="dash-course-card">
                  {c.thumbnail_url && (
                    <div className="dash-course-thumb" style={{ backgroundImage: `url(${c.thumbnail_url})` }} />
                  )}
                  <div className="dash-course-body">
                    <h4>{c.title}</h4>
                    {c.description && <p>{c.description}</p>}
                    <span className="dash-course-link">View Course →</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ═══════ CAMPUS EVENTS ═══════ */}
        <section className="dash-section">
          <h2 className="dash-section-title"><Icon name="calendar alternate" /> Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="dash-empty">
              <Icon name="calendar times outline" size="huge" style={{ opacity: 0.3 }} />
              <p>No upcoming events. Stay tuned!</p>
            </div>
          ) : (
            <div className="dash-events-list">
              {events.map(e => (
                <div key={e.id} className="dash-event-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedEvent(e)}>
                  <div className="dash-event-date-badge">
                    <span className="dash-event-day">{new Date(e.event_date).getDate()}</span>
                    <span className="dash-event-month">{new Date(e.event_date).toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div className="dash-event-info">
                    <h4>{e.title}</h4>
                    <span className="dash-course-link" style={{ color: '#3b82f6' }}>View Details →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="dash-footer">
          <div className="dash-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Help</a>
            <a href="#">Contact</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(true); setGuideStep(0); }}>
              <Icon name="question circle" /> Platform Guide
            </a>
          </div>
          <p className="dash-footer-copy">© {new Date().getFullYear()} TwinSync. Built with care for campus mental health.</p>
        </footer>
      </div>

      {/* ═══════ EVENT DETAILS MODAL ═══════ */}
      {selectedEvent && (
        <Modal
          className="dark-modal"
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          size="small"
          style={{ borderRadius: '16px' }}
        >
          <Modal.Header style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', borderRadius: '16px 16px 0 0', padding: '1.5rem 2rem'
          }}>
            <Icon name="calendar check outline" /> {selectedEvent.title}
          </Modal.Header>
          <Modal.Content style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <Icon name="clock outline" style={{ color: '#3b82f6' }} /> 
                  <strong>{formatEventDate(selectedEvent.event_date)}</strong>
                </div>
                {selectedEvent.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    <Icon name="map marker alternate" style={{ color: '#ef4444' }} /> 
                    <strong>{selectedEvent.location}</strong>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>About this event</h4>
                <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedEvent.description || 'No additional details provided.'}
                </p>
              </div>
            </div>
          </Modal.Content>
          <Modal.Actions style={{ padding: '1.25rem 2rem' }}>
            <Button color="blue" onClick={() => setSelectedEvent(null)}>Close</Button>
          </Modal.Actions>
        </Modal>
      )}

      {/* ═══════ ONBOARDING GUIDE MODAL ═══════ */}
      <Modal
        className="dark-modal"
        open={showGuide}
        size="small"
        closeOnDimmerClick={false}
        style={{ borderRadius: '16px' }}
      >
        <Modal.Header style={{ 
          background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
          color: 'white', borderRadius: '16px 16px 0 0', padding: '1.5rem 2rem'
        }}>
          <Icon name={ONBOARDING_STEPS[guideStep]?.icon} /> {ONBOARDING_STEPS[guideStep]?.title}
          <span style={{ float: 'right', fontSize: '0.85rem', opacity: 0.8 }}>
            {guideStep + 1} / {ONBOARDING_STEPS.length}
          </span>
        </Modal.Header>
        <Modal.Content style={{ padding: '2rem', minHeight: '120px' }}>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            {ONBOARDING_STEPS[guideStep]?.description}
          </p>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1.5rem' }}>
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: i === guideStep ? '#0d9488' : 'var(--panel-border)',
                transition: 'background-color 0.3s'
              }} />
            ))}
          </div>
        </Modal.Content>
        <Modal.Actions style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Button basic onClick={dismissGuide}>Skip Guide</Button>
          <div>
            {guideStep > 0 && (
              <Button basic onClick={() => setGuideStep(s => s - 1)} style={{ marginRight: '0.5rem' }}>
                <Icon name="arrow left" /> Back
              </Button>
            )}
            {guideStep < ONBOARDING_STEPS.length - 1 ? (
              <Button color="teal" onClick={() => setGuideStep(s => s + 1)}>
                Next <Icon name="arrow right" />
              </Button>
            ) : (
              <Button color="teal" onClick={dismissGuide}>
                <Icon name="check" /> Get Started!
              </Button>
            )}
          </div>
        </Modal.Actions>
      </Modal>
    </>
  );
}

export default Dashboard;
