// Automated API tests. They run without Supabase: the model layer is replaced with
// in-memory fakes, so CI needs no secrets and never touches the real database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ---------- in-memory fakes for the three models ----------
const db = { users: [], events: [], registrations: [] };

function seed() {
    db.users = [
        { id: 1, name: 'System Administrator', email: 'admin@university.edu', student_id: 'ADMIN-001', role: 'admin', password_hash: bcrypt.hashSync('admin123', 4) },
        { id: 2, name: 'Ali Khan', email: 'ali@university.edu', student_id: 'CS-2026-4091', role: 'student', password_hash: bcrypt.hashSync('student123', 4) }
    ];
    db.events = [
        { id: 1, title: 'Intro to Neural Architecture', description: 'Hands-on deep learning workshop.', event_date: '2099-10-25', event_time: '10:00 AM', location: 'Science Hall', category: 'workshop', capacity: 2, organizer: 'AI Society', prerequisites: 'None', image_url: null },
        { id: 2, title: 'Old Seminar', description: 'This seminar already happened.', event_date: '2000-01-01', event_time: '09:00 AM', location: 'Hall A', category: 'seminar', capacity: 10, organizer: 'Faculty', prerequisites: 'None', image_url: null }
    ];
    db.registrations = [];
}

const withSeats = (e) => ({ ...e, seats_left: e.capacity - db.registrations.filter((r) => r.event_id === e.id).length });
const publicUser = ({ password_hash, ...u }) => u;
let nextId = 100;

const fakes = {
    'user.model.js': {
        findByEmail: async (email) => db.users.find((u) => u.email === email) || null,
        findById: async (id) => { const u = db.users.find((x) => x.id === id); return u ? publicUser(u) : null; },
        create: async ({ name, studentId, email, passwordHash }) => {
            const u = { id: nextId++, name, email, student_id: studentId, role: 'student', password_hash: passwordHash };
            db.users.push(u);
            return publicUser(u);
        }
    },
    'event.model.js': {
        list: async ({ category } = {}) => db.events.filter((e) => !category || e.category === category).map(withSeats),
        findById: async (id) => { const e = db.events.find((x) => x.id === id); return e ? withSeats(e) : null; },
        findByIds: async (ids) => db.events.filter((e) => ids.includes(e.id)).map(withSeats),
        create: async (row) => { const e = { id: nextId++, ...row }; db.events.push(e); return withSeats(e); },
        update: async (id, row) => { const e = db.events.find((x) => x.id === id); if (!e) return null; Object.assign(e, row); return withSeats(e); },
        remove: async (id) => {
            const before = db.events.length;
            db.events = db.events.filter((e) => e.id !== id);
            db.registrations = db.registrations.filter((r) => r.event_id !== id);
            return db.events.length < before;
        }
    },
    'registration.model.js': {
        exists: async (userId, eventId) => db.registrations.some((r) => r.user_id === userId && r.event_id === eventId),
        create: async (userId, eventId) => {
            const event = db.events.find((e) => e.id === eventId);
            if (withSeats(event).seats_left <= 0) throw Object.assign(new Error('Event is full'), { code: 'P0001' });
            const user = db.users.find((u) => u.id === userId);
            const r = { id: nextId++, user_id: userId, event_id: eventId, registration_date: new Date().toISOString(), user: { id: user.id, name: user.name, email: user.email } };
            db.registrations.push(r);
            return r;
        },
        list: async (userId = null) => db.registrations.filter((r) => userId === null || r.user_id === userId),
        remove: async (userId, eventId) => {
            const before = db.registrations.length;
            db.registrations = db.registrations.filter((r) => !(r.user_id === userId && r.event_id === eventId));
            return db.registrations.length < before;
        }
    }
};

// Put the fakes into Node's module cache before the app loads the real models.
for (const [file, exports] of Object.entries(fakes)) {
    const resolved = path.join(__dirname, '..', 'src', 'models', file);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

const app = require('../src/app');
const { toEvent, toUser } = require('../src/utils/mappers');
const { cleanSearch } = require('../src/controllers/events.controller');

const tokenFor = (id, role) => jwt.sign({ sub: id, role }, 'test-secret', { expiresIn: '1h' });
const ADMIN = `Bearer ${tokenFor(1, 'admin')}`;
const STUDENT = `Bearer ${tokenFor(2, 'student')}`;

const validEvent = {
    title: 'Test Workshop', description: 'A workshop created by the automated tests.', date: '2099-12-01',
    time: '10:00 AM - 12:00 PM', location: 'Room 1', category: 'workshop', capacity: 20,
    organizer: 'QA Team', prerequisites: '', image: ''
};

beforeEach(seed);

describe('general', () => {
    test('GET /api/health returns ok', async () => {
        const res = await request(app).get('/api/health');
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { status: 'ok' });
    });

    test('unknown route returns 404 JSON', async () => {
        const res = await request(app).get('/api/nothing-here');
        assert.equal(res.status, 404);
        assert.equal(res.body.error, 'Route not found');
    });

    test('invalid JSON body returns 400', async () => {
        const res = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{bad json');
        assert.equal(res.status, 400);
        assert.equal(res.body.error, 'Request body is not valid JSON');
    });
});

describe('auth', () => {
    test('signup creates a student and never accepts a role from the client', async () => {
        const res = await request(app).post('/api/signup')
            .send({ name: 'New Student', studentId: 'NS-1', email: 'New@University.edu', password: 'secret12', role: 'admin' });
        assert.equal(res.status, 201);
        assert.ok(res.body.token);
        assert.equal(res.body.user.role, 'student');
        assert.equal(res.body.user.email, 'new@university.edu');
        assert.equal(res.body.user.password_hash, undefined);
    });

    test('signup with an existing email returns 409', async () => {
        const res = await request(app).post('/api/signup')
            .send({ name: 'Ali Again', studentId: 'X', email: 'ALI@university.edu', password: 'secret12' });
        assert.equal(res.status, 409);
    });

    for (const [label, body, message] of [
        ['short name', { name: 'Al', studentId: 'x', email: 'a@b.co', password: 'secret12' }, 'Name must be at least 3 characters'],
        ['missing student id', { name: 'Alice', studentId: '', email: 'a@b.co', password: 'secret12' }, 'Student ID is required'],
        ['bad email', { name: 'Alice', studentId: 'x', email: 'nope', password: 'secret12' }, 'Enter a valid email address'],
        ['short password', { name: 'Alice', studentId: 'x', email: 'a@b.co', password: '123' }, 'Password must be at least 6 characters']
    ]) {
        test(`signup validation: ${label}`, async () => {
            const res = await request(app).post('/api/signup').send(body);
            assert.equal(res.status, 400);
            assert.equal(res.body.error, message);
        });
    }

    test('login succeeds with the right password', async () => {
        const res = await request(app).post('/api/login').send({ email: 'admin@university.edu', password: 'admin123' });
        assert.equal(res.status, 200);
        assert.equal(res.body.user.role, 'admin');
        assert.equal(jwt.verify(res.body.token, 'test-secret').role, 'admin');
    });

    test('login gives the same 401 for wrong password and unknown email', async () => {
        const wrong = await request(app).post('/api/login').send({ email: 'admin@university.edu', password: 'nope' });
        const unknown = await request(app).post('/api/login').send({ email: 'ghost@university.edu', password: 'nope' });
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.equal(wrong.body.error, unknown.body.error);
    });
});

describe('events', () => {
    test('lists events with seatsLeft in API shape', async () => {
        const res = await request(app).get('/api/events');
        assert.equal(res.status, 200);
        assert.equal(res.body.length, 2);
        assert.equal(res.body[0].seatsLeft, 2);
        assert.equal(res.body[0].date, '2099-10-25');
    });

    test('rejects an unknown category filter', async () => {
        const res = await request(app).get('/api/events?category=party');
        assert.equal(res.status, 400);
    });

    test('GET /api/events/:id returns 400 for a bad id and 404 for a missing one', async () => {
        assert.equal((await request(app).get('/api/events/abc')).status, 400);
        assert.equal((await request(app).get('/api/events/9999')).status, 404);
    });

    test('creating an event needs a token (401) and an admin (403)', async () => {
        assert.equal((await request(app).post('/api/events').send(validEvent)).status, 401);
        assert.equal((await request(app).post('/api/events').set('Authorization', 'Bearer not-a-token').send(validEvent)).status, 401);
        assert.equal((await request(app).post('/api/events').set('Authorization', STUDENT).send(validEvent)).status, 403);
    });

    test('admin can create, update and delete an event', async () => {
        const created = await request(app).post('/api/events').set('Authorization', ADMIN).send(validEvent);
        assert.equal(created.status, 201);
        assert.equal(created.body.prerequisites, 'None');

        const updated = await request(app).put(`/api/events/${created.body.id}`).set('Authorization', ADMIN)
            .send({ ...validEvent, location: 'Room 2' });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.location, 'Room 2');

        assert.equal((await request(app).delete(`/api/events/${created.body.id}`).set('Authorization', ADMIN)).status, 200);
        assert.equal((await request(app).delete(`/api/events/${created.body.id}`).set('Authorization', ADMIN)).status, 404);
    });

    for (const [label, change, message] of [
        ['negative capacity', { capacity: -5 }, 'Capacity must be a whole number between 1 and 10000'],
        ['decimal capacity', { capacity: 2.5 }, 'Capacity must be a whole number between 1 and 10000'],
        ['unknown category', { category: 'party' }, 'Category must be one of: workshop, seminar, competition, sports, conference, society'],
        ['past date', { date: '2000-01-01' }, 'Date cannot be in the past'],
        ['impossible date', { date: '2099-02-30' }, 'Date must be a valid date (YYYY-MM-DD)'],
        ['missing title', { title: '   ' }, 'Title is required'],
        ['short description', { description: 'Too short' }, 'Description must be at least 20 characters'],
        ['non-http image', { image: 'javascript:alert(1)' }, 'Image must be a valid http(s) URL']
    ]) {
        test(`event validation: ${label}`, async () => {
            const res = await request(app).post('/api/events').set('Authorization', ADMIN).send({ ...validEvent, ...change });
            assert.equal(res.status, 400);
            assert.equal(res.body.error, message);
        });
    }
});

describe('registrations', () => {
    test('student registers, sees it, and seats go down', async () => {
        const res = await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        assert.equal(res.status, 201);
        assert.equal(res.body.event.seatsLeft, 1);

        const list = await request(app).get('/api/registrations').set('Authorization', STUDENT);
        assert.equal(list.status, 200);
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].event.title, 'Intro to Neural Architecture');
    });

    test('registering twice returns 409', async () => {
        await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        const again = await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        assert.equal(again.status, 409);
    });

    test('a full event returns 400 "Event is full"', async () => {
        db.events[0].capacity = 0;
        const res = await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        assert.equal(res.status, 400);
        assert.equal(res.body.error, 'Event is full');
    });

    test('past events, admins, bad ids and missing events are rejected', async () => {
        assert.equal((await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 2 })).status, 400);
        assert.equal((await request(app).post('/api/register').set('Authorization', ADMIN).send({ eventId: 1 })).status, 400);
        assert.equal((await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 'x' })).status, 400);
        assert.equal((await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 999 })).status, 404);
        assert.equal((await request(app).post('/api/register').send({ eventId: 1 })).status, 401);
    });

    test('cancel works once, then returns 404', async () => {
        await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        assert.equal((await request(app).delete('/api/registrations/1').set('Authorization', STUDENT)).status, 200);
        assert.equal((await request(app).delete('/api/registrations/1').set('Authorization', STUDENT)).status, 404);
    });

    test('admin sees every registration, students only their own', async () => {
        db.users.push({ id: 3, name: 'Sara Ahmed', email: 'sara@university.edu', student_id: 'S', role: 'student', password_hash: 'x' });
        await request(app).post('/api/register').set('Authorization', STUDENT).send({ eventId: 1 });
        await request(app).post('/api/register').set('Authorization', `Bearer ${tokenFor(3, 'student')}`).send({ eventId: 1 });
        assert.equal((await request(app).get('/api/registrations').set('Authorization', ADMIN)).body.length, 2);
        assert.equal((await request(app).get('/api/registrations').set('Authorization', STUDENT)).body.length, 1);
    });
});

describe('CORS', () => {
    const allowedOrigin = (res) => res.headers['access-control-allow-origin'];

    test('allows a listed origin and a Vercel preview matching a wildcard entry', async () => {
        const env = require('../src/config/env');
        const original = env.isAllowedOrigin;
        const patterns = [/^https:\/\/campus-event-management-delta\.vercel\.app$/i, /^https:\/\/campus-event-management-[a-z0-9-]+-hok-s-projects\.vercel\.app$/i];
        env.isAllowedOrigin = (o) => patterns.some((p) => p.test(o));
        try {
            const live = await request(app).get('/api/health').set('Origin', 'https://campus-event-management-delta.vercel.app');
            const preview = await request(app).get('/api/health').set('Origin', 'https://campus-event-management-git-x-hok-s-projects.vercel.app');
            const other = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
            assert.equal(allowedOrigin(live), 'https://campus-event-management-delta.vercel.app');
            assert.equal(allowedOrigin(preview), 'https://campus-event-management-git-x-hok-s-projects.vercel.app');
            assert.equal(allowedOrigin(other), undefined);
        } finally {
            env.isAllowedOrigin = original;
        }
    });

    test('the Vercel entry point exports the same Express app', () => {
        assert.equal(require('../api/index.js'), app);
    });
});

describe('helpers', () => {
    test('toEvent maps database columns to the API shape', () => {
        const e = toEvent({ id: 1, title: 'T', description: 'D', event_date: '2099-01-01', event_time: '10 AM', location: 'L', category: 'sports', capacity: 5, seats_left: 3, organizer: null, prerequisites: null, image_url: null });
        assert.deepEqual(e, { id: 1, title: 'T', description: 'D', date: '2099-01-01', time: '10 AM', location: 'L', category: 'sports', capacity: 5, seatsLeft: 3, organizer: '', prerequisites: 'None', image: '' });
    });

    test('toUser never exposes the password hash', () => {
        const u = toUser({ id: 1, name: 'N', email: 'e@x.co', student_id: 'S', role: 'student', password_hash: 'secret' });
        assert.equal(u.password_hash, undefined);
        assert.equal(u.studentId, 'S');
    });

    test('cleanSearch strips characters that would change the database filter', () => {
        assert.equal(cleanSearch('ai,title.eq.x)(%*'), 'ai title eq x');
        assert.equal(cleanSearch('x'.repeat(150)).length, 100);
    });
});
