const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Server-side client using the service_role key. Row Level Security blocks the public
// key completely, so this key must stay on the server and never reach the frontend.
const supabase = createClient(env.supabaseUrl || 'http://localhost', env.supabaseServiceRoleKey || 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = supabase;
