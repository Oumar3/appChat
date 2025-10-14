const jwt = require('jsonwebtoken');

const generateToken = (userId, username) => {
    const secret = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    return jwt.sign({ id: userId, username: username }, secret, { expiresIn });
};

const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
};

module.exports = { generateToken, verifyToken };