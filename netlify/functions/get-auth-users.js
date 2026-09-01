const { createClient } = require('@supabase/supabase-js');

// Netlify Function to fetch Supabase Auth Users for RBAC Assignment
exports.handler = async (event) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        users: [],
        message: 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY not configured on server',
      }),
    };
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (error) {
      console.error('Error in auth.admin.listUsers:', error.message);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, users: [], error: error.message }),
      };
    }

    const formattedUsers = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email || '',
      full_name:
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        (u.email ? u.email.split('@')[0] : 'User'),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: formattedUsers,
      }),
    };
  } catch (err) {
    console.error('get-auth-users exception:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        users: [],
        error: err.message,
      }),
    };
  }
};
