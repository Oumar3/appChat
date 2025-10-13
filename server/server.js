const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const socketServer = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
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

    // Lorsqu'un utilisateur rejoint
    socket.on('user-join', (userData) => {
        if (!userData?.userId) return;
        socket.userId = userData.userId;
        socket.join(socket.userId);
        console.log(`Utilisateur ${userData.userId} rejoint avec le socket ${socket.id}`);
    });

    // Gestion des messages
    socket.on('chat-message', async (messageData) => {
        if (!messageData.senderId || !messageData.receiverId || !messageData.content) {
            socket.emit('message-error', { error: 'Données de message incomplètes' });
            return;
        }

        try {
            // Création du message
            const newMessage = new Message({
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                content: messageData.content
            });

            const savedMessage = await newMessage.save();
            const populatedMessage = await savedMessage.populate('senderId');

            console.log(`Message sauvegardé de ${messageData.senderId} à ${messageData.receiverId}`);

            // Envoi du message aux deux utilisateurs connectés
            socketServer.to(messageData.receiverId).emit("message", populatedMessage);
            socketServer.to(messageData.senderId).emit("message", populatedMessage);

        } catch (error) {
            console.error("Erreur lors de l'enregistrement du message :", error);
            socket.emit('message-error', { error: 'Échec de l\'envoi du message' });
        }
    });

    // Déconnexion
    socket.on('disconnect', () => {
        if (socket.userId) {
            console.log(`Utilisateur ${socket.userId} déconnecté`);
        }
        console.log('Socket déconnecté :', socket.id);
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));
