const supabase = require('../utils/supabaseServerClient'); 

const authMiddleware = async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Auth Middleware (SupabaseClient): Entered for path ${req.path}`);

  const authHeader = req.header('Authorization');
  if (!authHeader) {
    console.log("Auth Middleware: No Authorization header");
    return res.status(401).json({ error: 'No authentication token, access denied (header missing)' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer' || !tokenParts[1]) {
    console.log("Auth Middleware: Malformed token");
    return res.status(401).json({ error: 'Malformed token, access denied' });
  }
  const token = tokenParts[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase auth.getUser error:', error.message);
      let status = 401;
      if (error.message.includes('invalid JWT') || error.message.includes('JWT expired')) {
        status = 401;
      } else if (error.status) { 
        status = error.status;
      }
      return res.status(status).json({ error: `Authentication failed: ${error.message}` });
    }

    if (!user) {
      // This case should ideally be covered by the error above, but as a safeguard:
      console.error('Supabase auth.getUser: No user returned despite no error.');
      return res.status(401).json({ error: 'Authentication failed: Invalid token or user not found' });
    }

    req.user = user; 
    console.log(`Auth Middleware: User ${user.id} authenticated.`);
    next();

  } catch (err) {
    console.error('Unexpected error in auth middleware:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = authMiddleware;