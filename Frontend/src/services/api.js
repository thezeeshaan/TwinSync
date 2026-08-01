const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────────
// Named exports for Check-In & Insights features
// These functions handle auth headers automatically
// ─────────────────────────────────────────────────────────────────

import { supabase } from '../config/supabaseClient';

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Lifestyle ────────────────────────────────────────────────────

/** Check if user has a lifestyle profile */
export async function getLifestyle() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/checkin/lifestyle`, { headers });
  return res.json();
}

/** Save lifestyle form data */
export async function saveLifestyle(data) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/checkin/lifestyle`, {
    method: 'POST', headers, body: JSON.stringify(data),
  });
  return res.json();
}

// ── Check-In ─────────────────────────────────────────────────────

/** Check if already checked in today + get streak */
export async function getTodayStatus() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/checkin/today`, { headers });
  return res.json();
}

/** Send a message in the check-in chat */
export async function sendCheckinMessage(messages, lifestyle) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/checkin/chat`, {
    method: 'POST', headers, body: JSON.stringify({ messages, lifestyle }),
  });
  return res.json();
}

/** Complete the check-in and get wellness tip */
export async function completeCheckin(messages) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/checkin/complete`, {
    method: 'POST', headers, body: JSON.stringify({ messages }),
  });
  return res.json();
}

// ── Insights ─────────────────────────────────────────────────────

/** Start an Insights session */
export async function startInsights() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/start`, { method: 'POST', headers });
  return res.json();
}

/** Send a message in the Insights chat */
export async function sendInsightMessage(session_id, message, history) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/message`, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id, message, history }),
  });
  return res.json();
}

/** End the Insights session — returns summary, suggestions[] */
export async function endInsights(session_id, history, pss_scores, pss_total) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/end`, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id, history, pss_scores, pss_total }),
  });
  return res.json();
}

/** Get the active Insights session for today (if any) — returns { session_id, messages } */
export async function getActiveInsightsSession() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/active`, { headers });
  return res.json();
}

/** Get today's wellness tip from Check-In — returns { tip } */
export async function getTodayTip() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/today-tip`, { headers });
  return res.json();
}

/** Get all past (completed) Insights sessions — returns { sessions: [{id, started_at, ended_at, summary}] } */
export async function getPastInsightsSessions() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/past`, { headers });
  return res.json();
}

/** Get full transcript + summary for one past session — returns { id, started_at, ended_at, summary, messages[] } */
export async function getPastSessionDetail(sessionId) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/insights/past/${sessionId}`, { headers });
  return res.json();
}

