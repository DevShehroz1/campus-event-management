const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const HttpError = require('../utils/httpError');
const { signToken } = require('../utils/token');
const { toUser } = require('../utils/mappers');

const SALT_ROUNDS = 10;

async function signup(req, res) {
    const name = String(req.body.name || '').trim();
    const studentId = String(req.body.studentId || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (await User.findByEmail(email)) {
        throw new HttpError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    // Role is always "student" here; admins are created directly in the database.
    const user = await User.create({ name, studentId, email, passwordHash });

    res.status(201).json({ token: signToken(user), user: toUser(user) });
}

async function login(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findByEmail(email);
    const ok = user && await bcrypt.compare(password, user.password_hash);
    // Same message for unknown email and wrong password, so accounts can't be discovered.
    if (!ok) throw new HttpError(401, 'Incorrect email or password');

    res.json({ token: signToken(user), user: toUser(user) });
}

module.exports = { signup, login };
