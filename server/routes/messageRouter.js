const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { sendMessage, getMessages } = require('../controller/messageController');

router.post('/api/messages', authMiddleware, sendMessage);
router.get('/api/messages/:userId1/:userId2', authMiddleware, getMessages);

module.exports = router;