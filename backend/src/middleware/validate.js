const HttpError = require('../utils/httpError');
const { isValidISODate, todayISO } = require('../utils/dates');

const CATEGORIES = ['workshop', 'seminar', 'competition', 'sports', 'conference', 'society'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (value) => (typeof value === 'string' ? value.trim() : '');

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function isPositiveInt(value) {
    return /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= Number.MAX_SAFE_INTEGER;
}

// Each validator returns the first problem it finds, worded for the person filling in the form.
function check(rules) {
    return (req, res, next) => {
        for (const rule of rules) {
            const message = rule(req);
            if (message) return next(new HttpError(400, message));
        }
        return next();
    };
}

const validateSignup = check([
    (req) => str(req.body.name).length < 3 && 'Name must be at least 3 characters',
    (req) => str(req.body.name).length > 100 && 'Name must be 100 characters or fewer',
    (req) => !str(req.body.studentId) && 'Student ID is required',
    (req) => str(req.body.studentId).length > 50 && 'Student ID must be 50 characters or fewer',
    (req) => !EMAIL_RE.test(str(req.body.email)) && 'Enter a valid email address',
    (req) => (typeof req.body.password !== 'string' || req.body.password.length < 6) && 'Password must be at least 6 characters',
    (req) => req.body.password.length > 128 && 'Password must be 128 characters or fewer'
]);

const validateLogin = check([
    (req) => !str(req.body.email) && 'Email is required',
    (req) => (typeof req.body.password !== 'string' || !req.body.password) && 'Password is required'
]);

const validateIdParam = check([
    (req) => !isPositiveInt(req.params.id ?? req.params.eventId) && 'Invalid event id'
]);

const validateRegistration = check([
    (req) => !isPositiveInt(req.body.eventId) && 'Invalid event id'
]);

const validateEventQuery = check([
    (req) => req.query.category && !CATEGORIES.includes(req.query.category) && `Category must be one of: ${CATEGORIES.join(', ')}`
]);

function validateEvent({ isUpdate = false } = {}) {
    const required = (field, label, max = 200) => (req) => {
        const value = str(req.body[field]);
        if (!value) return `${label} is required`;
        if (value.length > max) return `${label} must be ${max} characters or fewer`;
        return false;
    };
    return check([
        (req) => (!req.body || typeof req.body !== 'object') && 'Request body is missing',
        required('title', 'Title', 120),
        required('description', 'Description', 2000),
        (req) => str(req.body.description).length < 20 && 'Description must be at least 20 characters',
        (req) => !isValidISODate(req.body.date) && 'Date must be a valid date (YYYY-MM-DD)',
        (req) => !isUpdate && req.body.date < todayISO() && 'Date cannot be in the past',
        required('time', 'Time', 60),
        required('location', 'Location'),
        required('organizer', 'Organizer'),
        (req) => !CATEGORIES.includes(req.body.category) && `Category must be one of: ${CATEGORIES.join(', ')}`,
        (req) => (!Number.isInteger(req.body.capacity) || req.body.capacity < 1 || req.body.capacity > 10000)
            && 'Capacity must be a whole number between 1 and 10000',
        (req) => str(req.body.prerequisites).length > 200 && 'Prerequisites must be 200 characters or fewer',
        (req) => req.body.image && (!isHttpUrl(req.body.image) || req.body.image.length > 1000) && 'Image must be a valid http(s) URL',
        // Normalise the body once it is valid, so controllers get clean values.
        (req) => {
            for (const key of ['title', 'description', 'time', 'location', 'organizer', 'prerequisites', 'image']) {
                req.body[key] = str(req.body[key]);
            }
            if (!req.body.prerequisites) req.body.prerequisites = 'None';
            return false;
        }
    ]);
}

module.exports = {
    CATEGORIES,
    validateSignup,
    validateLogin,
    validateIdParam,
    validateRegistration,
    validateEventQuery,
    validateEvent
};
