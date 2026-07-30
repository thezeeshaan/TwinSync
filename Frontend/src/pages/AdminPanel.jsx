import React, { useState, useEffect } from 'react';
import { Container, Header, Icon, Loader, Message } from 'semantic-ui-react';
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

      const [pendingRes, allRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/counselors/pending`, { headers }),
        fetch(`${API_URL}/api/admin/counselors/all`, { headers })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingCounselors(data.counselors || []);
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllCounselors(data.counselors || []);
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
      </Container>
    </>
  );
}

export default AdminPanel;
