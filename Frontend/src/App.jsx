import { useState } from 'react'
import { api } from './lib/api'
import { supabase } from './lib/supabaseClient'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('Not tested yet');
  const [supabaseStatus, setSupabaseStatus] = useState('Not tested yet');

  const testBackend = async () => {
    setBackendStatus('Testing...');
    const { data, error } = await api.get('/api/health');
    if (error) {
      setBackendStatus(`Error: ${error.message}`);
    } else {
      setBackendStatus(`Success: ${data.message}`);
    }
  };

  const testSupabase = async () => {
    setSupabaseStatus('Testing...');
    // A simple non-destructive call to check if Supabase is reachable
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setSupabaseStatus(`Error: ${error.message}`);
    } else {
      setSupabaseStatus(`Success: Connected to Supabase!`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>TwinSync Connection Test</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Backend Connection</h2>
        <button onClick={testBackend} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Test Backend
        </button>
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Status: {backendStatus}</p>
      </div>

      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Supabase Connection</h2>
        <button onClick={testSupabase} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Test Supabase
        </button>
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Status: {supabaseStatus}</p>
      </div>
    </div>
  )
}

export default App
