require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const env = {
    port: Number(process.env.PORT) || 5000,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
};

// An origin entry may contain "*" for one URL segment, e.g. https://my-app-*-team.vercel.app
// for Vercel preview deployments.
const originPatterns = env.corsOrigins.map((entry) => new RegExp(
    `^${entry.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+')}$`,
    'i'
));
env.isAllowedOrigin = (origin) => originPatterns.some((pattern) => pattern.test(origin));

// Fail fast with a readable message instead of a confusing error on the first request.
// Tests run without real secrets, so they are allowed to skip this check.
if (!isTest) {
    const missing = [
        ['SUPABASE_URL', env.supabaseUrl],
        ['SUPABASE_SERVICE_ROLE_KEY', env.supabaseServiceRoleKey],
        ['JWT_SECRET', env.jwtSecret]
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missing.length) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and fill them in.`);
    }
}

module.exports = env;
