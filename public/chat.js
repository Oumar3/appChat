const socket = io("http://localhost:3000");

// Variables globales
let senderUserId = null;
let senderUsername = null;
let receiverId = null;

// =============== INITIALISATION ===============
document.addEventListener('DOMContentLoaded', () => {
  // Récupérer les infos utilisateur depuis localStorage
  senderUserId = localStorage.getItem('userId');
  senderUsername = localStorage.getItem('username');
  
  // Si on est sur la page de conversation, récupérer l'ID du destinataire
  const urlParams = new URLSearchParams(window.location.search);
  receiverId = urlParams.get('userId');
  
  // Si utilisateur connecté, rejoindre sa room
  if (senderUserId) {
    socket.emit('user-join', { userId: senderUserId });
    console.log(`Utilisateur ${senderUserId} rejoint le socket`);
  }
  
  
  // Charger les messages existants si on est sur la page conversation
  if (receiverId && senderUserId) {
    console.log('Chargement des messages et titre...');
    loadExistingMessages();
  } else {
    console.warn('Manque receiverId ou senderUserId pour charger les messages');
  }
});

// =============== GESTION SOCKET.IO ===============

// Connexion établie
socket.on('connect', () => {
  console.log('Connecté au serveur Socket.IO:', socket.id);
});

// Réception d'un nouveau message
socket.on('message', (messageData) => {
  console.log('Message reçu via socket:', messageData);
  displayMessage(messageData);
});

// Gestion des erreurs
socket.on('message-error', (error) => {
  console.error('Erreur message:', error);
  alert('Erreur: ' + error.error);
});


// =============== BOUTONS LOGIN/REGISTER (userloggin.html) ===============
let login = document.getElementById("login");
if (login) {
  login.onclick = async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    if (!username || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Stocker les informations utilisateur
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user._id);
        localStorage.setItem('username', data.user.username);
        
        // Rediriger vers la sélection d'utilisateurs
        window.location.href = 'userselection.html';
      } else {
        alert(data.message || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur login:', error);
      alert('Erreur de connexion au serveur');
    }
  };
}

let register = document.getElementById("register");
if (register) {
  register.onclick = async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    if (!username || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Inscription réussie !');      
        window.location.href = 'userselection.html';
      } else {
        alert(data.message || 'Erreur d\'inscription');
      }
    } catch (error) {
      console.error('Erreur register:', error);
      alert('Erreur de connexion au serveur');
    }
  };
}

// =============== AFFICHAGE MESSAGES (conversation.html) ===============
const messages = document.getElementById("messages");

function displayMessage(messageData) {
  console.log('Affichage message:', messageData);
  
  // Récupérer le conteneur des messages
  const messagesContainer = document.getElementById("messages");
  if (!messagesContainer) {
    console.error('Conteneur messages non trouvé');
    return;
  }
  
  // Cacher le message "Aucun message" s'il existe
  const noMessagesDiv = document.getElementById('noMessages');
  if (noMessagesDiv) {
    noMessagesDiv.style.display = 'none';
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';  
  // Déterminer si c'est notre message ou celui du correspondant
  let isMyMessage = false;
  let senderName = 'Inconnu';
  
  if (messageData.senderId) {
    isMyMessage = messageData.senderId._id === senderUserId;
    senderName = messageData.senderId.username || 'Utilisateur';
  }
  
  
  const content = messageData.content || '';
  const time = new Date(messageData.createdAt || messageData.timestamp || Date.now()).toLocaleTimeString();
  
  messageDiv.innerHTML = `
    <div class="message-content">
      ${content}
    </div>
    <div class="message-time">${senderName} - ${time}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  console.log('Message affiché avec succès');
}

// =============== ENVOI DE MESSAGE (conversation.html) ===============
let send = document.getElementById("send");
if (send) {
  send.onclick = () => {
    const msgInput = document.getElementById("msg");
    const text = msgInput.value.trim();
    
    if (!text) {
      alert('Veuillez saisir un message');
      return;
    }    
    // Créer l'objet message selon le format du serveur
    const messageData = {
      senderId: senderUserId,
      receiverId: receiverId,
      content: text
    };
    
    console.log('Envoi message:', messageData);
    
    // Envoyer via socket
    socket.emit('chat-message', messageData);
    
    // Vider le champ
    msgInput.value = '';
  };
}

// Permettre l'envoi avec Entrée
const msgInput = document.getElementById("msg");
if (msgInput) {
  msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      send.onclick();
    }
  });
}

// =============== FONCTIONS UTILITAIRES ===============

// Charger les messages existants
async function loadExistingMessages() {
  try {
    const token = localStorage.getItem('token');
    const url = `/api/messages/${senderUserId}/${receiverId}`;
    console.log('URL de récupération des messages:', url);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Ajouter l'authentification si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Messages récupérés:', data);
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(message => displayMessage(message));
      } else {
        console.log('Aucun message trouvé');
      }
    } else {
      console.error('Erreur HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Détails erreur:', errorText);
    }
  } catch (error) {
    console.error('Erreur chargement messages:', error);
  }
}

// Fonction de déconnexion
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  socket.disconnect();
  window.location.href = 'userloggin.html';
}

// =============== GESTION BOUTONS NAVIGATION ===============

// Bouton de déconnexion (présent dans plusieurs pages)
const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout');
if (logoutBtn) {
  logoutBtn.onclick = () => {
    logout();
  };
}

// Bouton retour (conversation.html)
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.onclick = () => {
    window.location.href = 'userselection.html';
  };
}

// =============== LOGIQUE USERSELECTION.HTML ===============

// Vérifier l'authentification et charger les utilisateurs
if (window.location.pathname.includes('userselection.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadUsers();
  });
}

// Vérifier si l'utilisateur est connecté
function checkAuthentication() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    window.location.href = 'userloggin.html';
    return false;
  }
  return true;
}

// Charger la liste des utilisateurs
async function loadUsers() {
  if (!checkAuthentication()) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      displayUsers(data.users);
    } else {
      alert('Erreur lors du chargement des utilisateurs');
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'userloggin.html';
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur de connexion au serveur');
  }
}

// Afficher la liste des utilisateurs
function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  usersList.innerHTML = '';
  
  // Filtrer l'utilisateur actuel
  const senderUserId = localStorage.getItem('userId');
  const otherUsers = users.filter(user => user._id !== senderUserId);
  
  if (otherUsers.length === 0) {
    usersList.innerHTML = '<p>Aucun autre utilisateur disponible</p>';
    return;
  }
  
  otherUsers.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.style.cssText = `
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    userDiv.innerHTML = `
      <span>${user.username}</span>
    `;
    
    userDiv.onclick = () => {
      // Rediriger vers la page de conversation avec l'ID en paramètre URL
      window.location.href = `conversation.html?userId=${user._id}`;
    };
    
    usersList.appendChild(userDiv);
  });
}

// =============== LOGIQUE MAIN.HTML ===============

// Charger les utilisateurs pour main.html
if (window.location.pathname.includes('main.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    loadUsersForMain();
  });
}

// Charger la liste des utilisateurs pour main.html
async function loadUsersForMain() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      displayUsersForMain(data.users);
    } else {
      console.error('Erreur lors du chargement des utilisateurs');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Afficher la liste des utilisateurs pour main.html
function displayUsersForMain(users) {
  const userList = document.getElementById('userList');
  if (!userList) return;
  
  userList.innerHTML = '';
  
  if (users.length === 0) {
    userList.innerHTML = '<p>Aucun utilisateur disponible</p>';
    return;
  }
  
  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.style.cssText = `
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    userDiv.innerHTML = `
      <span>${user.username}</span>
    `;
    
    userDiv.onmouseover = () => userDiv.style.backgroundColor = '#f0f0f0';
    userDiv.onmouseout = () => userDiv.style.backgroundColor = 'white';
    
    userDiv.onclick = () => {
      // Rediriger vers la page de login pour s'authentifier d'abord
      window.location.href = 'userloggin.html';
    };
    
    userList.appendChild(userDiv);
  });
}

