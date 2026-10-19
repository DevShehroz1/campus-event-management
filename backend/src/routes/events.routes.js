const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const events = require('../controllers/events.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateIdParam, validateEvent, validateEventQuery } = require('../middleware/validate');

const router = express.Router();

router.get('/', validateEventQuery, asyncHandler(events.listEvents));
router.get('/:id', validateIdParam, asyncHandler(events.getEvent));
router.post('/', requireAuth, requireAdmin, validateEvent(), asyncHandler(events.createEvent));
router.put('/:id', requireAuth, requireAdmin, validateIdParam, validateEvent({ isUpdate: true }), asyncHandler(events.updateEvent));
router.delete('/:id', requireAuth, requireAdmin, validateIdParam, asyncHandler(events.deleteEvent));

module.exports = router;
