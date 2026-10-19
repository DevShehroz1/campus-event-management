const Event = require('../models/event.model');
const HttpError = require('../utils/httpError');
const { toEvent, toEventRow } = require('../utils/mappers');

// Characters that have a meaning in PostgREST filter syntax are removed so user
// input can only ever be a plain search term.
function cleanSearch(value) {
    return String(value || '').replace(/[,()%*\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

async function listEvents(req, res) {
    const rows = await Event.list({
        search: cleanSearch(req.query.search),
        category: req.query.category || ''
    });
    res.json(rows.map(toEvent));
}

async function getEvent(req, res) {
    const row = await Event.findById(Number(req.params.id));
    if (!row) throw new HttpError(404, 'Event not found');
    res.json(toEvent(row));
}

async function createEvent(req, res) {
    const row = await Event.create(toEventRow(req.body));
    res.status(201).json(toEvent(row));
}

async function updateEvent(req, res) {
    const row = await Event.update(Number(req.params.id), toEventRow(req.body));
    if (!row) throw new HttpError(404, 'Event not found');
    res.json(toEvent(row));
}

async function deleteEvent(req, res) {
    const deleted = await Event.remove(Number(req.params.id));
    if (!deleted) throw new HttpError(404, 'Event not found');
    res.json({ message: 'Event deleted' });
}

module.exports = { cleanSearch, listEvents, getEvent, createEvent, updateEvent, deleteEvent };
