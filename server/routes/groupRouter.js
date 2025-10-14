const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createGroup,
    getUserGroups,
    getGroupDetails,
    addMember,
    leaveGroup,
    getGroupMessages
} = require('../controller/groupController');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes pour les groupes
router.post('/', createGroup);                    // Créer un groupe
router.get('/', getUserGroups);                   // Obtenir les groupes de l'utilisateur
router.get('/:groupId', getGroupDetails);         // Obtenir les détails d'un groupe
router.post('/:groupId/members', addMember);      // Ajouter un membre
router.delete('/:groupId/leave', leaveGroup);     // Quitter un groupe

module.exports = router;