const express = require('express');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./events.routes');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

router.use(authRoutes);
router.use('/events', eventRoutes);

module.exports = router;
