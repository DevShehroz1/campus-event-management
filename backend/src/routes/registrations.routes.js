const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const registrations = require('../controllers/registrations.controller');
const { requireAuth } = require('../middleware/auth');
const { validateRegistration, validateIdParam } = require('../middleware/validate');

const router = express.Router();

router.post('/register', requireAuth, validateRegistration, asyncHandler(registrations.register));
router.get('/registrations', requireAuth, asyncHandler(registrations.listRegistrations));
router.delete('/registrations/:eventId', requireAuth, validateIdParam, asyncHandler(registrations.cancelRegistration));

module.exports = router;
