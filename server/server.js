const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const socketServer = new Server(server);
const io = socketServer; // Alias pour compatibilité
const db = require('./config/db');
const cors = require("cors");
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// Import des routes et modèles
const messageRouter = require('./routes/messageRouter');
const userRouter = require('./routes/userRouter');
const groupRouter = require('./routes/groupRouter');
const Message = require('./models/messageModel');
const { group } = require('console');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("../public"));

// Route pour le favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});



// Routes
app.use('/api/messages', messageRouter);
app.use('/api/users', userRouter);
app.use('/api/groups', groupRouter);


// Socket.IO
const connectedUsers = new Map(); // Map pour stocker les utilisateurs connectés

socketServer.on('connection', (socket) => {

     // Lorsqu'un utilisateur rejoint
    socket.on('user-join', ({ userId }) => {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
    });

    // Joindre une room (groupe)
    socket.on('join-room', async ({ groupId, userId }) => {
        socket.join(groupId);
        io.to(groupId).emit('user-joined', { userId, groupId });
    });
    // Quitter une room (groupe)
    socket.on('leave-room', ({ groupId, userId }) => {
        socket.leave(groupId);
        io.to(groupId).emit('user-left', { userId, groupId });
    });

    // ===  GESTION DES MESSAGES ===
    socket.on('chat-message', async (messageData) => {
      const { senderId, receiverId, groupId, content } = messageData;

      if (!senderId || !content) {
        console.error(' Données incomplètes:', { senderId, content });
        socket.emit('message-error', { error: 'Données incomplètes' });
        return;
      }

      try {
        // Créer le message selon le type (privé ou groupe)
        let messageDoc = {
          senderId,
          content
        };

        if (groupId) {
          // Message de groupe (priorité)
          messageDoc.groupId = groupId;
        } else if (receiverId) {
          // Message privé
          messageDoc.receiverId = receiverId;
        } else {
          console.error('Aucun destinataire valide:', { receiverId, groupId });
          socket.emit('message-error', { error: 'receiverId ou groupId requis' });
          return;
        }

        const newMessage = new Message(messageDoc);
        const savedMessage = await newMessage.save();
        const populatedMessage = await savedMessage.populate('senderId');

        // === CAS 1 : Message de groupe ===
        if (groupId) {
          io.to(groupId).emit('group-message', populatedMessage);
        } 
        // === CAS 2 : Message privé ===
        else if (receiverId) {
          const receiverSocketId = connectedUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message', populatedMessage);
          }

          // Retour à l'expéditeur
          socket.emit('private-message', populatedMessage);
        }

      } catch (error) {
        console.error("Erreur lors de l'enregistrement du message :", error);
        socket.emit('message-error', { error: 'Erreur serveur' });
      }
 });


    // Déconnexion
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
        }
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));
