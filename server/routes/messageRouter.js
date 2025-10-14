const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { sendMessage, getMessages } = require('../controller/messageController');
const { getGroupMessages } = require('../controller/groupController');



// Routes relatives (car déjà montées sur /api/messages dans server.js)
router.post('/', sendMessage);


// Route pour les messages de groupe AVANT la route générique
router.get('/group/:groupId', authMiddleware, getGroupMessages);
// Route pour les messages privés (doit être après les routes spécifiques)
router.get('/:userId1/:userId2', authMiddleware, getMessages);

module.exports = router;