const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const socketServer = new Server(server);
const db = require('./config/db');
const cors = require("cors");
const mongoose = require('mongoose');
// Import des routes et modèles
const messageRouter = require('./routes/messageRouter');
const userRouter = require('./routes/userRouter');
const Message = require('./models/messageModel');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("../public"));

// Routes
app.use('/api/messages', messageRouter);
app.use('/api/users', userRouter);


// Socket.IO
socketServer.on('connection', (socket) => {
    console.log('Un utilisateur connecté :', socket.id);

    // L'utilisateur rejoint avec son ID
    socket.on('user-join', (userData) => {
        socket.userId = userData.userId;
        console.log("socket", socket.id, socket.userId);
        console.log("data socket",socket);
        console.log(`Utilisateur ${userData.userId} rejoint avec le socket ${socket.id}`);
    });

    // Gestion des messages
    socket.on('chat-message', async (messageData) => {
    
        // Vérifier que toutes les données requises sont présentes
        if (!messageData.senderId || !messageData.receiverId || !messageData.content) {
            console.error('Données manquantes dans le message:', messageData);
            socket.emit('message-error', { error: 'Données de message incomplètes' });
            return;
        }

        try {
            
            // Mapper les données reçues aux champs du modèle
            const newMessage = new Message({
                senderId: messageData.senderId,    // messageData.sender -> senderId dans le modèle
                receiverId: messageData.receiverId, // messageData.receiver -> receiverId dans le modèle
                content: messageData.content
            });

            console.log('Nouveau message à créer:', newMessage);

            const savedMessage = await newMessage.save();

            console.log(savedMessage.senderId);
            // Peupler senderId et receiverId avec les informations utilisateur
           

            
            // Envoyer le message au destinataire
            socket.to(messageData.receiverId).emit("message", savedMessage);
            socket.to(messageData.senderId).emit("message", savedMessage);
            
            

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du message :', error);
            socket.emit('message-error', { error: 'Échec de l\'envoi du message' });
        }
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        if (socket.userId) {
            console.log(`Utilisateur ${socket.userId} déconnecté`);
        }
        console.log('Socket déconnecté :', socket.id);
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));