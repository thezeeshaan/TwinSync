const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = {
  /**
   * Generic fetch wrapper to connect to the Express Backend
   * @param {string} endpoint - API endpoint (e.g., '/api/health')
   * @param {object} options - Fetch options (method, headers, body)
   */
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Set default headers (JSON by default)
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API Request Failed');
      }
      
      return { data, error: null };
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      return { data: null, error };
    }
  },

  // Helper method for GET requests
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // Helper method for POST requests
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
};
