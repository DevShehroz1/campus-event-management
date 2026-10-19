const Event = require('../models/event.model');
const Registration = require('../models/registration.model');
const HttpError = require('../utils/httpError');
const { todayISO } = require('../utils/dates');
const { toRegistration } = require('../utils/mappers');

async function register(req, res) {
    const eventId = Number(req.body.eventId);

    if (req.user.role === 'admin') {
        throw new HttpError(400, "Administrators can't register for events");
    }
    const event = await Event.findById(eventId);
    if (!event) throw new HttpError(404, 'Event not found');
    if (event.event_date < todayISO()) {
        throw new HttpError(400, 'This event has already taken place');
    }

    // Checked first so a student who is already in a full event hears the right reason.
    if (await Registration.exists(req.user.id, eventId)) {
        throw new HttpError(409, 'You are already registered for this event');
    }

    // The database still enforces both rules, which keeps simultaneous requests correct.
    const row = await Registration.create(req.user.id, eventId);
    const updatedEvent = await Event.findById(eventId);
    res.status(201).json(toRegistration(row, updatedEvent));
}

async function listRegistrations(req, res) {
    const rows = await Registration.list(req.user.role === 'admin' ? null : req.user.id);
    const events = await Event.findByIds([...new Set(rows.map((r) => r.event_id))]);
    const byId = new Map(events.map((e) => [e.id, e]));

    res.json(
        rows
            .filter((r) => byId.has(r.event_id))
            .map((r) => toRegistration(r, byId.get(r.event_id)))
    );
}

async function cancelRegistration(req, res) {
    const removed = await Registration.remove(req.user.id, Number(req.params.eventId));
    if (!removed) throw new HttpError(404, 'You are not registered for this event');
    res.json({ message: 'Registration cancelled' });
}

module.exports = { register, listRegistrations, cancelRegistration };
