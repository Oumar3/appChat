const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { sendMessage, getMessages } = require('../controller/messageController');

// Routes relatives (car déjà montées sur /api/messages dans server.js)
router.post('/', sendMessage);
router.get('/:userId1/:userId2', authMiddleware, getMessages);

module.exports = router;