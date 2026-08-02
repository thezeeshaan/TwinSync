import React, { useState, useEffect } from 'react';
import { Container, Header, Icon, Loader, Message, Modal, Button } from 'semantic-ui-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

function AdminPanel() {
  const { user, role } = useAuth();
  const [pendingCounselors, setPendingCounselors] = useState([]);
  const [allCounselors, setAllCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Promote Admin state
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Courses & Events state
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', content_url: '', thumbnail_url: '' });
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', location: '' });
  const [courseLoading, setCourseLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  // Modals state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

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
    setError(null);
    try {
      const headers = await getAuthHeaders();

      const [pendingRes, allRes, coursesRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/counselors/pending`, { headers }),
        fetch(`${API_URL}/api/admin/counselors/all`, { headers }),
        fetch(`${API_URL}/api/dashboard/courses`, { headers }),
        fetch(`${API_URL}/api/dashboard/events`, { headers })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingCounselors(data.counselors || []);
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllCounselors(data.counselors || []);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyCounselor = async (counselorId, action) => {
    setActionLoading(counselorId);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/counselors/${counselorId}/verify`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        await loadData();
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to update counselor status');
    } finally {
      setActionLoading(null);
    }
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'verified') return 'admin-badge verified';
    if (status === 'rejected') return 'admin-badge rejected';
    return 'admin-badge pending';
  };

  const handlePromoteAdmin = async () => {
    setShowConfirm(false);
    setPromoteLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/promote`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ email: promoteEmail.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setPromoteEmail('');
      } else {
        setError(data.error || 'Promotion failed');
      }
    } catch (err) {
      setError('Failed to promote user.');
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleAddCourse = async () => {
    setCourseLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const method = editingCourseId ? 'PUT' : 'POST';
      const endpoint = editingCourseId ? `${API_URL}/api/admin/courses/${editingCourseId}` : `${API_URL}/api/admin/courses`;
      
      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(courseForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setCourseForm({ title: '', description: '', content_url: '', thumbnail_url: '' });
        setEditingCourseId(null);
        await loadData();
      } else {
        setError(data.error || 'Failed to save course');
      }
    } catch (err) {
      setError('Failed to save course');
    } finally {
      setCourseLoading(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/courses/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        await loadData();
      } else {
        setError(data.error || 'Failed to delete course');
      }
    } catch (err) {
      setError('Failed to delete course');
    }
  };

  const handleAddEvent = async () => {
    setEventLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const method = editingEventId ? 'PUT' : 'POST';
      const endpoint = editingEventId ? `${API_URL}/api/admin/events/${editingEventId}` : `${API_URL}/api/admin/events`;

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(eventForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setEventForm({ title: '', description: '', event_date: '', location: '' });
        setEditingEventId(null);
        await loadData();
      } else {
        setError(data.error || 'Failed to save event');
      }
    } catch (err) {
      setError('Failed to save event');
    } finally {
      setEventLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/events/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        await loadData();
      } else {
        setError(data.error || 'Failed to delete event');
      }
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  if (role !== 'admin') {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', textAlign: 'center', padding: '4rem 1rem' }}>
          <Icon name="lock" size="huge" style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <Header as="h2">Access Denied</Header>
          <p style={{ color: 'var(--text-secondary)' }}>Only Campus Admins can access this panel.</p>
        </Container>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: '7em', textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader active inline="centered" size="large">Loading Admin Panel...</Loader>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container style={{ marginTop: '7em', paddingBottom: '4em', padding: '0 1rem' }}>
        {/* Header */}
        <Header as="h1" className="dashboard-welcome" style={{ marginBottom: '0.25rem' }}>
          <Icon name="shield" style={{ color: '#f59e0b' }} /> Admin Panel
        </Header>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Review and verify counselor applications.
        </p>

        {error && <Message error content={error} style={{ marginBottom: '1rem' }} onDismiss={() => setError(null)} />}
        {successMsg && <Message success content={successMsg} style={{ marginBottom: '1rem' }} onDismiss={() => setSuccessMsg(null)} />}

        {/* ========== COUNSELOR VERIFICATION ========== */}
        <div className="admin-section">
            {/* Pending Applications */}
            {pendingCounselors.length > 0 && (
              <>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  <Icon name="clock" style={{ color: '#f59e0b' }} /> Pending Applications ({pendingCounselors.length})
                </h3>
                <div className="admin-cards">
                  {pendingCounselors.map(c => (
                    <div key={c.id} className="admin-counselor-card pending">
                      <div className="admin-card-header">
                        <div className="admin-card-avatar">
                          <Icon name="user md" size="large" />
                        </div>
                        <div className="admin-card-info">
                          <h4>{c.name}</h4>
                          <span className="admin-card-designation">{c.designation}</span>
                        </div>
                        <span className={getStatusBadgeClass(c.verification_status)}>
                          {c.verification_status}
                        </span>
                      </div>

                      <div className="admin-card-details">
                        <div className="admin-detail-row">
                          <Icon name="mail" /> <span>{c.email}</span>
                        </div>
                        <div className="admin-detail-row">
                          <Icon name="phone" /> <span>{c.phone}</span>
                        </div>
                        <div className="admin-detail-row">
                          <Icon name="building" /> <span>{c.institute_name || 'N/A'}</span>
                        </div>
                        <div className="admin-detail-row">
                          <Icon name="venus mars" /> <span>{c.gender?.replace('_', ' ')}</span>
                        </div>
                        <div className="admin-detail-row">
                          <Icon name="calendar" /> <span>Applied: {formatDate(c.created_at)}</span>
                        </div>
                        {c.is_staff && (
                          <div className="admin-detail-row">
                            <Icon name="id badge" /> <span>College Staff Member</span>
                          </div>
                        )}
                      </div>

                      {c.description && (
                        <div className="admin-card-bio">
                          <strong>Bio:</strong> {c.description}
                        </div>
                      )}

                      <div className="admin-card-actions">
                        <button
                          className="admin-action-btn approve"
                          onClick={() => handleVerifyCounselor(c.id, 'verified')}
                          disabled={actionLoading === c.id}
                        >
                          <Icon name="check" /> Approve
                        </button>
                        <button
                          className="admin-action-btn reject"
                          onClick={() => handleVerifyCounselor(c.id, 'rejected')}
                          disabled={actionLoading === c.id}
                        >
                          <Icon name="close" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {pendingCounselors.length === 0 && (
              <div className="admin-empty">
                <Icon name="check circle outline" size="huge" style={{ color: '#22c55e', opacity: 0.5 }} />
                <p>No pending counselor applications</p>
              </div>
            )}

            {/* All Counselors Overview */}
            <h3 style={{ color: 'var(--text-primary)', margin: '2rem 0 1rem' }}>
              <Icon name="list" /> All Counselors ({allCounselors.length})
            </h3>
            {allCounselors.length === 0 ? (
              <div className="admin-empty">
                <p>No counselors registered yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Institute</th>
                      <th>Status</th>
                      <th>Available</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCounselors.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.designation}</td>
                        <td>{c.institute_name || '—'}</td>
                        <td><span className={getStatusBadgeClass(c.verification_status)}>{c.verification_status}</span></td>
                        <td>{c.is_available ? '🟢 Online' : '⚫ Offline'}</td>
                        <td>{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========== PROMOTE ADMIN ========== */}
          <div className="admin-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <Icon name="user plus" style={{ color: '#8b5cf6' }} /> Promote Student to Admin
            </h3>
            
            <div 
              onClick={() => setShowPromoteModal(true)}
              style={plusCardStyle('#8b5cf6')}
            >
              <Icon name="plus" /> Promote a Student
            </div>

            <Modal className="dark-modal" open={showPromoteModal} onClose={() => setShowPromoteModal(false)} size="tiny" style={{ borderRadius: '12px' }}>
              <Modal.Header>Promote Student to Admin</Modal.Header>
              <Modal.Content>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Enter the email of a registered student to promote them to Campus Admin.
                </p>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
                {showConfirm && (
                  <div style={{
                    marginTop: '1.5rem', padding: '1rem', borderRadius: '8px',
                    border: '1px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)'
                  }}>
                    <p style={{ margin: 0, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      <Icon name="warning sign" style={{ color: '#f59e0b' }} />
                      Are you sure? This action cannot be undone from the admin panel.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="admin-action-btn approve" onClick={() => {
                        handlePromoteAdmin().then(() => {
                          setShowPromoteModal(false);
                        });
                      }}>
                        <Icon name="check" /> Yes, Promote
                      </button>
                      <button className="admin-action-btn reject" onClick={() => setShowConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Modal.Content>
              <Modal.Actions>
                <Button onClick={() => {
                  setShowPromoteModal(false);
                  setShowConfirm(false);
                  setPromoteEmail('');
                }}>Cancel</Button>
                {!showConfirm && (
                  <Button color="violet" disabled={!promoteEmail.includes('@') || promoteLoading} onClick={() => setShowConfirm(true)}>
                    {promoteLoading ? <Loader active inline size="tiny" /> : 'Promote'}
                  </Button>
                )}
              </Modal.Actions>
            </Modal>
          </div>

          {/* ========== MANAGE COURSES ========== */}
          <div className="admin-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <Icon name="book" style={{ color: '#0d9488' }} /> Manage Mental Health Courses
            </h3>

            <div 
              onClick={() => {
                setEditingCourseId(null);
                setCourseForm({ title: '', description: '', content_url: '', thumbnail_url: '' });
                setShowCourseModal(true);
              }}
              style={plusCardStyle('#0d9488')}
            >
              <Icon name="plus" /> Add New Course
            </div>

            <Modal className="dark-modal" open={showCourseModal} onClose={() => setShowCourseModal(false)} size="small" style={{ borderRadius: '12px' }}>
              <Modal.Header>{editingCourseId ? 'Edit Mental Health Course' : 'Add Mental Health Course'}</Modal.Header>
              <Modal.Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text" placeholder="Course Title *" value={courseForm.title}
                    onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text" placeholder="Description (optional)" value={courseForm.description}
                    onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="url" placeholder="Content URL * (link to course material)" value={courseForm.content_url}
                    onChange={e => setCourseForm({ ...courseForm, content_url: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="url" placeholder="Thumbnail URL (optional)" value={courseForm.thumbnail_url}
                    onChange={e => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </Modal.Content>
              <Modal.Actions>
                <Button onClick={() => setShowCourseModal(false)}>Cancel</Button>
                <Button color="teal" disabled={!courseForm.title || !courseForm.content_url || courseLoading} onClick={() => {
                  handleAddCourse().then(() => setShowCourseModal(false));
                }}>
                  {courseLoading ? <Loader active inline size="tiny" /> : (editingCourseId ? 'Save Changes' : 'Add Course')}
                </Button>
              </Modal.Actions>
            </Modal>

            {/* Existing Courses List */}
            {courses.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No courses added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {courses.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: 'var(--panel-bg)', border: '1px solid var(--panel-border)'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.title}</strong>
                      {c.description && <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="admin-action-btn" style={{ background: '#3b82f6', color: 'white', minWidth: 'auto', padding: '0.4rem 0.75rem' }} 
                        onClick={() => {
                          setEditingCourseId(c.id);
                          setCourseForm({ title: c.title, description: c.description || '', content_url: c.content_url, thumbnail_url: c.thumbnail_url || '' });
                          setShowCourseModal(true);
                        }}>
                        <Icon name="edit" />
                      </button>
                      <button className="admin-action-btn reject" onClick={() => handleDeleteCourse(c.id)} style={{ minWidth: 'auto', padding: '0.4rem 0.75rem' }}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========== MANAGE EVENTS ========== */}
          <div className="admin-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <Icon name="calendar alternate" style={{ color: '#3b82f6' }} /> Manage Campus Events
            </h3>

            <div 
              onClick={() => {
                setEditingEventId(null);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                setEventForm({ title: '', description: '', event_date: tomorrow.toISOString().slice(0, 16), location: '' });
                setShowEventModal(true);
              }}
              style={plusCardStyle('#3b82f6')}
            >
              <Icon name="plus" /> Add New Event
            </div>

            <Modal className="dark-modal" open={showEventModal} onClose={() => setShowEventModal(false)} size="small" style={{ borderRadius: '12px' }}>
              <Modal.Header>{editingEventId ? 'Edit Campus Event' : 'Add Campus Event'}</Modal.Header>
              <Modal.Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text" placeholder="Event Title *" value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text" placeholder="Description (optional)" value={eventForm.description}
                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="datetime-local" value={eventForm.event_date}
                    onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text" placeholder="Location (optional)" value={eventForm.location}
                    onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </Modal.Content>
              <Modal.Actions>
                <Button onClick={() => setShowEventModal(false)}>Cancel</Button>
                <Button color="blue" disabled={!eventForm.title || !eventForm.event_date || eventLoading} onClick={() => {
                  handleAddEvent().then(() => setShowEventModal(false));
                }}>
                  {eventLoading ? <Loader active inline size="tiny" /> : (editingEventId ? 'Save Changes' : 'Add Event')}
                </Button>
              </Modal.Actions>
            </Modal>

            {/* Existing Events List */}
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No events added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {events.map(e => (
                  <div key={e.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: 'var(--panel-bg)', border: '1px solid var(--panel-border)'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{e.title}</strong>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {e.location && ` • ${e.location}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="admin-action-btn" style={{ background: '#3b82f6', color: 'white', minWidth: 'auto', padding: '0.4rem 0.75rem' }} 
                        onClick={() => {
                          setEditingEventId(e.id);
                          // Format date for datetime-local input
                          const dateObj = new Date(e.event_date);
                          dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                          const formattedDate = dateObj.toISOString().slice(0, 16);
                          setEventForm({ title: e.title, description: e.description || '', event_date: formattedDate, location: e.location || '' });
                          setShowEventModal(true);
                        }}>
                        <Icon name="edit" />
                      </button>
                      <button className="admin-action-btn reject" onClick={() => handleDeleteEvent(e.id)} style={{ minWidth: 'auto', padding: '0.4rem 0.75rem' }}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </Container>
    </>
  );
}

// Shared inline input style
const inputStyle = {
  padding: '0.7rem 1rem', borderRadius: '8px',
  border: '1px solid var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--input-text)',
  fontSize: '0.95rem', outline: 'none'
};

export default AdminPanel;

const plusCardStyle = (color) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  padding: '1.25rem', borderRadius: '12px', cursor: 'pointer',
  background: `rgba(${hexToRgb(color)}, 0.08)`, 
  border: `2px dashed ${color}`,
  color: color, fontWeight: 'bold', marginBottom: '1.5rem',
  transition: 'background 0.2s'
});

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}
