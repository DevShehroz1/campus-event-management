const express = require('express');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./events.routes');
const registrationRoutes = require('./registrations.routes');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

router.use(authRoutes);
router.use('/events', eventRoutes);
router.use(registrationRoutes);

module.exports = router;
