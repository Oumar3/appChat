const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, logout, getAllUsers } = require('../controller/userController');

// Routes publiques (pas besoin d'authentification)
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.post('/logout', authMiddleware, logout);
router.get('/', getAllUsers);


module.exports = router;