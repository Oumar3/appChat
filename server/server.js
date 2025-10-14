const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const socketServer = new Server(server);
const db = require('./config/db');
const cors = require("cors");
const { ObjectId } = require('mongodb');
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


// server side et client side
/**
 * Dans le server side on fait la connexon du server socket avec le Server.on("Event",callback function(socket){}))
 * socket.connected: verifie si le server est connecté
 * socket.id: id du socket
 * socket.on("Event",callback function(data){}): ecoute un evenement
 * Dans le client side on fait la connexion du client socket avec le io("url",option) et socket.on("Event",callback function(data){}): ecoute un evenement
 *
 * le best pratics socket.on("connect", () => {
  // ...
});

socket.on("data", () => {  });

Tree of events:
- broadcast a tous les utilisateurs connectes sauf l'envoyeur
- envoi d'un message a un utilisateur specifique
- envoi un message a tous les utilisateurs connectes dans une salle
- envoi un message a tous les utilisateurs connectes dans une salle sauf l'envoyeur
- envoi un message a tous les utilisateurs connectes dans une salle sauf l'envoyeur et un utilisateur specifique
 * 
 * Dans le client side on fait la connexion du client socket avec le io("url",option) et socket.on("Event",callback function(data){}): ecoute un evenement
 */


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
                //faire un object model id
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                content: messageData.content
            });
            console.log(typeof newMessage.senderId);
            console.log("new message", newMessage);
            const savedMessage = await newMessage.save();
            console.log("saved message", savedMessage);
            const populatedMessage = await savedMessage.populate('senderId');

            console.log(`Message sauvegardé de ${messageData.senderId} à ${messageData.receiverId}`);
            console.log('Message populé:', populatedMessage);

            // Envoi du message au destinataire (s'il est connecté)
            socketServer.to(messageData.receiverId).emit("message", populatedMessage);
            
            // Envoi du message à l'expéditeur (confirmation)
            socket.emit("message", populatedMessage);
            
            console.log('Messages envoyés via Socket.IO');

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
