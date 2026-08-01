import React, { useState } from 'react';
import { saveLifestyle } from '../services/api';

// Pill button — highlighted when selected
const PillBtn = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.5rem 1.1rem',
      margin: '0.25rem',
      borderRadius: '999px',
      border: `2px solid ${selected ? '#0ea5e9' : '#cbd5e1'}`,
      background: selected ? '#0ea5e9' : 'transparent',
      color: selected ? '#fff' : 'var(--text-primary)',
      cursor: 'pointer',
      fontWeight: selected ? '600' : '400',
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

function LifestyleModal({ onComplete }) {
  const [form, setForm] = useState({
    dietary_pref: null,
    meals_per_day: null,
    uses_smoking: null,
    uses_tobacco: null,
    uses_alcohol: null,
    sleep_hours: null,
    sleep_quality: null,
    activity_type: [],  // multi-select
    activity_freq: null,
  });
  const [loading, setLoading] = useState(false);

  // Single-select
  const select = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Multi-select for activity_type
  const toggleActivity = (val) => {
    setForm(f => {
      const current = f.activity_type;
      return {
        ...f,
        activity_type: current.includes(val)
          ? current.filter(v => v !== val)
          : [...current, val],
      };
    });
  };

  // Enable Continue only when all fields are answered
  const isComplete = (
    form.dietary_pref && form.meals_per_day &&
    form.uses_smoking !== null && form.uses_tobacco !== null && form.uses_alcohol !== null &&
    form.sleep_hours && form.sleep_quality &&
    form.activity_type.length > 0 && form.activity_freq
  );

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      await saveLifestyle(form);
      onComplete(form); // tell parent: lifestyle filled, open chat
    } catch (e) {
      console.error('saveLifestyle error:', e);
    }
    setLoading(false);
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{
        fontWeight: '600', marginBottom: '0.5rem',
        color: 'var(--text-secondary)', fontSize: '0.85rem',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1rem' }}>
        {children}
      </div>
    </div>
  );

  return (
    // Backdrop
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      {/* Modal card */}
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '20px',
        padding: '2rem', maxWidth: '520px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👋 Quick Setup</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Takes 30 seconds — helps us personalize your experience
        </p>

        <Section title="Diet Preference">
          {['🌿 Vegetarian', '🥩 Non-Veg', '🌱 Vegan', '🍳 Eggetarian'].map(v => (
            <PillBtn key={v} label={v} selected={form.dietary_pref === v} onClick={() => select('dietary_pref', v)} />
          ))}
        </Section>

        <Section title="Meals per Day">
          {['1', '2', '3', '4+'].map(v => (
            <PillBtn key={v} label={v} selected={form.meals_per_day === v} onClick={() => select('meals_per_day', v)} />
          ))}
        </Section>

        <Section title="Smoking?">
          {['Yes', 'No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_smoking === (v === 'Yes')} onClick={() => select('uses_smoking', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Tobacco use?">
          {['Yes', 'No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_tobacco === (v === 'Yes')} onClick={() => select('uses_tobacco', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Alcohol use?">
          {['Yes', 'No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_alcohol === (v === 'Yes')} onClick={() => select('uses_alcohol', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Sleep (hours/night)">
          {['Less than 5', '5–6 hrs', '6–7 hrs', '7–8 hrs', '8+ hrs'].map(v => (
            <PillBtn key={v} label={v} selected={form.sleep_hours === v} onClick={() => select('sleep_hours', v)} />
          ))}
        </Section>

        <Section title="Sleep Quality">
          {['😴 Poor', '😐 Okay', '😊 Good'].map(v => (
            <PillBtn key={v} label={v} selected={form.sleep_quality === v} onClick={() => select('sleep_quality', v)} />
          ))}
        </Section>

        <Section title="Physical Activity (select all that apply)">
          {['🏋️ Gym', '⚽ Sports', '🚶 Walking', '🧘 Yoga / Meditation', '🚴 Cycling', '❌ None'].map(v => (
            <PillBtn key={v} label={v} selected={form.activity_type.includes(v)} onClick={() => toggleActivity(v)} />
          ))}
        </Section>

        <Section title="How Often?">
          {['Daily', '3–4x / week', '1–2x / week', 'Rarely'].map(v => (
            <PillBtn key={v} label={v} selected={form.activity_freq === v} onClick={() => select('activity_freq', v)} />
          ))}
        </Section>

        <button
          onClick={handleSubmit}
          disabled={!isComplete || loading}
          style={{
            width: '100%', padding: '0.9rem',
            background: isComplete ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : '#cbd5e1',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '1rem', fontWeight: '700',
            cursor: isComplete ? 'pointer' : 'not-allowed',
            marginTop: '0.5rem', transition: 'all 0.2s',
          }}
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

export default LifestyleModal;
