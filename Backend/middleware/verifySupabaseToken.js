const { createClient } = require('@supabase/supabase-js');

// Use the service role key so we can verify tokens server-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware that verifies the Supabase JWT from the Authorization header.
 * On success, sets req.authUser to the verified user object.
 * Rejects with 401 if no token, invalid token, or expired token.
 */
const verifySupabaseToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Attach verified user to request — controllers must use THIS, not req.body/req.query
    req.authUser = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(500).json({ error: 'Token verification failed.' });
  }
};

module.exports = { verifySupabaseToken };
