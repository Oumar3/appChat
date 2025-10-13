const jwt = require('jsonwebtoken');

const generateToken = (userId, username) => {
    return jwt.sign({ id: userId, username: username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

module.exports = { generateToken, verifyToken };