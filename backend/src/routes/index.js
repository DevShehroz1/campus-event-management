const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

router.use(authRoutes);

module.exports = router;
