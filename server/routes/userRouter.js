const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, logout, getAllUsers } = require('../controller/userController');

// Routes publiques (pas besoin d'authentification)
router.post('/api/users/register', register);
router.post('/api/users/login', login);

// Routes protégées
router.post('/api/users/logout', authMiddleware, logout);
router.get('/api/users', authMiddleware, getAllUsers);


module.exports = router;