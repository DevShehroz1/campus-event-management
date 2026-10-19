const HttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/token');

function requireAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return next(new HttpError(401, 'Please sign in to continue'));
    }
    try {
        const payload = verifyToken(token);
        req.user = { id: Number(payload.sub), role: payload.role };
        return next();
    } catch (_) {
        return next(new HttpError(401, 'Your session has expired. Please sign in again'));
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return next(new HttpError(403, 'Only administrators can do this'));
    }
    return next();
}

module.exports = { requireAuth, requireAdmin };
