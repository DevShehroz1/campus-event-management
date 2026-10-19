const HttpError = require('../utils/httpError');

// Turns database errors (raised by Supabase/PostgreSQL) into HTTP responses.
function fromDatabaseError(err) {
    switch (err.code) {
        case '23505':
            if (/registrations/.test(err.message) || /user_id, event_id/.test(err.details || '')) {
                return new HttpError(409, 'You are already registered for this event');
            }
            return new HttpError(409, 'An account with this email already exists');
        case 'P0001':
            return new HttpError(400, err.message);
        case 'P0002':
        case '23503':
            return new HttpError(404, 'Event not found');
        case '23514':
            return new HttpError(400, `Invalid data: ${err.message}`);
        case '22P02':
            return new HttpError(400, 'Invalid value in request');
        default:
            return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request body is too large' });
    }

    const known = err instanceof HttpError ? err : fromDatabaseError(err);
    if (known) {
        return res.status(known.status).json({ error: known.message });
    }

    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
};
