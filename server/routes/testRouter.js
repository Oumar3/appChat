const express = require('express');
const router = express.Router();
const Message = require('../models/messageModel');

// Route HTTP pour envoyer un message (pour tests avec Postman)
router.post('/send-message', async (req, res) => {
    try {
        console.log('Message HTTP reçu:', req.body);
        
        const { sender, receiver, content } = req.body;
        
        // Validation
        if (!sender || !receiver || !content) {
            return res.status(400).json({ 
                error: 'Données manquantes', 
                required: ['sender', 'receiver', 'content'] 
            });
        }
        
        // Créer le message en base
        const newMessage = new Message({
            senderId: sender,
            receiverId: receiver,
            content: content
        });
        
        const savedMessage = await newMessage.save();
        
        // Peupler les données utilisateur
        const populatedMessage = await Message.findById(savedMessage._id)
            .populate('senderId', 'username')
            .populate('receiverId', 'username');
        
        // Récupérer l'instance Socket.IO depuis app
        const socketServer = req.app.get('socketServer');
        const connectedUsers = req.app.get('connectedUsers');
        
        if (socketServer && connectedUsers) {
            // Envoyer via Socket.IO si le destinataire est connecté
            const receiverSocketId = connectedUsers.get(receiver);
            if (receiverSocketId) {
                socketServer.to(receiverSocketId).emit('chat message', populatedMessage);
            }
        }
        
        res.status(201).json({
            message: 'Message envoyé avec succès',
            data: populatedMessage,
            receiverConnected: !!connectedUsers?.get(receiver)
        });
        
    } catch (error) {
        console.error('Erreur HTTP message:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;