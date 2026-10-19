const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', asyncHandler(auth.signup));
router.post('/login', asyncHandler(auth.login));

module.exports = router;
