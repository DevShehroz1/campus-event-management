const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../controllers/auth.controller');
const { validateSignup, validateLogin } = require('../middleware/validate');

const router = express.Router();

router.post('/signup', validateSignup, asyncHandler(auth.signup));
router.post('/login', validateLogin, asyncHandler(auth.login));

module.exports = router;
