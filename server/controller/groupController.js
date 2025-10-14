const Group = require('../models/groupeModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const mongoose = require('mongoose');

// Créer un nouveau groupe
exports.createGroup = async (req, res) => {
    const { name, members } = req.body;
    
    try {
        // Vérifier que le nom n'existe pas déjà
        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ message: 'Un groupe avec ce nom existe déjà' });
        }

        // Vérifier que tous les membres existent
        const validMembers = await User.find({ '_id': { $in: members } });
        if (validMembers.length !== members.length) {
            return res.status(400).json({ message: 'Certains membres n\'existent pas' });
        }

        // Créer le groupe
        const newGroup = new Group({
            name,
            members
        });

        await newGroup.save();
        
        // Populer avec les détails des membres
        const populatedGroup = await Group.findById(newGroup._id).populate('members', 'username');
        
        res.status(201).json({ 
            message: 'Groupe créé avec succès',
            group: populatedGroup 
        });
    } catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Obtenir tous les groupes d'un utilisateur
exports.getUserGroups = async (req, res) => {
    try {
        const userId = req.user.id; // Obtenu du middleware d'auth
        
        const groups = await Group.find({ 
            members: userId 
        }).populate('members', 'username');
        
        res.status(200).json({ groups });
    } catch (err) {
        console.error('Get user groups error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Obtenir les détails d'un groupe spécifique
exports.getGroupDetails = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    try {
        const group = await Group.findById(groupId).populate('members', 'username');
        
        if (!group) {
            return res.status(404).json({ message: 'Groupe non trouvé' });
        }

        // Vérifier que l'utilisateur est membre du groupe
        const isMember = group.members.some(member => member._id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ message: 'Vous n\'êtes pas membre de ce groupe' });
        }

        res.status(200).json({ group });
    } catch (err) {
        console.error('Get group details error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Ajouter un membre au groupe
exports.addMember = async (req, res) => {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const currentUserId = req.user.id;
    
    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Groupe non trouvé' });
        }

        // Vérifier que l'utilisateur actuel est membre du groupe
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'Vous n\'êtes pas membre de ce groupe' });
        }

        // Vérifier que le nouveau membre existe
        const newMember = await User.findById(newMemberId);
        if (!newMember) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier que le membre n'est pas déjà dans le groupe
        if (group.members.includes(newMemberId)) {
            return res.status(400).json({ message: 'L\'utilisateur est déjà membre du groupe' });
        }

        // Ajouter le membre
        group.members.push(newMemberId);
        await group.save();

        const updatedGroup = await Group.findById(groupId).populate('members', 'username');
        res.status(200).json({ 
            message: 'Membre ajouté avec succès',
            group: updatedGroup 
        });
    } catch (err) {
        console.error('Add member error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Quitter un groupe
exports.leaveGroup = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Groupe non trouvé' });
        }

        // Vérifier que l'utilisateur est membre du groupe
        if (!group.members.includes(userId)) {
            return res.status(403).json({ message: 'Vous n\'êtes pas membre de ce groupe' });
        }

        // Retirer l'utilisateur du groupe
        group.members = group.members.filter(memberId => memberId.toString() !== userId);
        
        // Si plus de membres, supprimer le groupe
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.status(200).json({ message: 'Groupe supprimé car aucun membre restant' });
        }

        await group.save();
        res.status(200).json({ message: 'Vous avez quitté le groupe avec succès' });
    } catch (err) {
        console.error('Leave group error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Obtenir les messages d'un groupe
exports.getGroupMessages = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    console.log('=== GET GROUP MESSAGES ===');
    console.log('GroupId:', groupId);
    console.log('UserId:', userId);
    
    try {
        // Vérifier la validité de l'ObjectId
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            console.log('ID de groupe invalide:', groupId);
            return res.status(400).json({ message: 'ID de groupe invalide' });
        }

        // Vérifier que l'utilisateur est membre du groupe
        console.log('Recherche du groupe...');
        const group = await Group.findById(groupId);
        if (!group) {
            console.log('Groupe non trouvé');
            return res.status(404).json({ message: 'Groupe non trouvé' });
        }

        const memberIds = group.members.map(id => id.toString());
        if (!memberIds.includes(userId.toString())) {
            return res.status(403).json({ message: 'Vous n\'êtes pas membre de ce groupe' });
        }

        const messages = await Message.find({ groupId })
            .populate('senderId', 'username')
            .sort({ createdAt: 1 });

        res.status(200).json({ messages });
    } catch (err) {
        console.error('Get group messages error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};