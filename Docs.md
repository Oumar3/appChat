### Learning socket.io with nodejs and react js


#### What is socket.io ?


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

