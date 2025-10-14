const socket = io("http://localhost:3000");

// Variables globales
let senderUserId = null;
let senderUsername = null;
let receiverId = null;
let currentGroupId = null;

// =============== INITIALISATION ===============
document.addEventListener('DOMContentLoaded', () => {
  // Récupérer les infos utilisateur
  senderUserId = localStorage.getItem('userId');
  senderUsername = localStorage.getItem('username');

  //https://monapp.com/chat.html?roomId=12345&userId=6789 donne une partie de l'URL après le ?

  const urlParams = new URLSearchParams(window.location.search);
  receiverId = urlParams.get('userId');
  currentGroupId = urlParams.get('currentGroupId') || urlParams.get('groupId');
  
  // Rejoindre socket si connecté
  if (senderUserId) {
    socket.emit('user-join', { userId: senderUserId });
  }
  
  // Charger messages pour conversations privées uniquement
  if (receiverId && senderUserId) {
    loadExistingMessages();
  }
});

// =============== GESTION SOCKET.IO ===============

// Connexion établie
socket.on('connect', () => {
  console.log('Connecté au serveur Socket.IO:', socket.id);
});

// Réception d'un message privé (retour à l'expéditeur)
socket.on('private-message', (messageData) => {
  console.log('Message privé reçu via socket:', messageData);
  displayMessage(messageData);
});

// // Réception d'un message (destinataire)
// socket.on('message', (messageData) => {
//   console.log('Message reçu via socket:', messageData);
//   displayMessage(messageData);
// });

// Réception d'un message de groupe
socket.on('group-message', (messageData) => {
  console.log('Message de groupe reçu via socket:', messageData);
  displayGroupMessage(messageData);
});

// Gestion des erreurs
socket.on('message-error', (error) => {
  console.error('Erreur message:', error);
  alert('Erreur: ' + error.error);
});

// Événements de groupe
socket.on('user-joined', (data) => {
  console.log(`Utilisateur rejoint le groupe:`, data);
});

socket.on('user-left', (data) => {
  console.log(`Utilisateur quitté le groupe:`, data);
});

// =============== FONCTIONS GROUPES ===============
// Fonction globale pour quitter un groupe
async function leaveGroup(groupId, groupName) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/groups/${groupId}/leave`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return { success: response.ok, message: data.message };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}


// =============== LOGIN/REGISTER ===============
document.getElementById("login")?.addEventListener('click', async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  
  if (!username || !password) return alert('Remplissez tous les champs');
  
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user._id);
      localStorage.setItem('username', data.user.username);
      window.location.href = 'userselection.html';
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert('Erreur de connexion');
  }
});

document.getElementById("register")?.addEventListener('click', async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  
  if (!username || !password) return alert('Remplissez tous les champs');
  
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
      alert(data.message);
    }
  } catch (error) {
    alert('Erreur de connexion');
  }
});

// =============== AFFICHAGE MESSAGES ===============
function displayMessage(messageData) {
  const container = document.getElementById("messages");
  if (!container) return;
  
  document.getElementById('noMessages')?.style.setProperty('display', 'none');
  
  const messageDiv = document.createElement('div');
  const isOwn = messageData.senderId?._id === senderUserId;
  const senderName = messageData.senderId?.username || 'Utilisateur';
  const time = new Date(messageData.createdAt || Date.now()).toLocaleTimeString();
  
  messageDiv.className = isOwn ? 'message sent' : 'message received';
  messageDiv.innerHTML = `
    <div class="message-content">${messageData.content}</div>
    <div class="message-time">${senderName} - ${time}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function displayGroupMessage(messageData) {
  const container = document.getElementById('messages');
  if (!container) return displayMessage(messageData);
  
  document.getElementById('noMessages')?.style.setProperty('display', 'none');
  
  const messageDiv = document.createElement('div');
  const isOwn = messageData.senderId?._id === senderUserId;
  const senderName = messageData.senderId?.username || 'Utilisateur';
  const time = new Date(messageData.createdAt || Date.now()).toLocaleTimeString();
  
  messageDiv.className = `group-message ${isOwn ? 'own' : 'other'}`;
  messageDiv.innerHTML = `
    ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
    <div class="message-content">${messageData.content}</div>
    <div class="message-time">${time}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// =============== ENVOI DE MESSAGE ===============
// Event listener pour les messages privés uniquement
document.getElementById("send")?.addEventListener('click', () => {
  if (window.location.pathname.includes('group-conversation.html')) {
    return; // Laisser group-conversation.html gérer
  }
  
  const msgInput = document.getElementById("msg");
  const text = msgInput.value.trim();
  
  if (!text) return;
  
  socket.emit('chat-message', {
    senderId: senderUserId,
    receiverId: receiverId,
    content: text
  });
  
  msgInput.value = '';
});

document.getElementById("msg")?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !window.location.pathname.includes('group-conversation.html')) {
    document.getElementById("send")?.click();
  }
});

// =============== FONCTIONS UTILITAIRES ===============

async function loadExistingMessages() {
  try {
    const response = await fetch(`/api/messages/${senderUserId}/${receiverId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      data.messages?.forEach(message => displayMessage(message));
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

// =============== NAVIGATION ===============
document.querySelector('#logoutBtn, #logout')?.addEventListener('click', logout);
document.getElementById('backBtn')?.addEventListener('click', () => {
  window.location.href = 'userselection.html';
});

// =============== USERSELECTION ===============
if (location.pathname.includes('userselection.html')) {
    if (checkAuthentication()){
      loadUsers();
    }
    document.getElementById('goToGroups')?.addEventListener('click', () => {
      location.href = 'groups.html';
    });
    document.getElementById('goToPrivateChats')?.addEventListener('click', () => {
      document.getElementById('usersList')?.scrollIntoView({ behavior: 'smooth' });
    });
}

function checkAuthentication() {
  if (!localStorage.getItem('token') || !localStorage.getItem('userId')) {
    location.href = 'userloggin.html';
    return false;
  }
  return true;
}

async function loadUsers() {
  try {
    const response = await fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      displayUsers(data.users);
    } else if (response.status === 401) {
      localStorage.clear();
      location.href = 'userloggin.html';
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  const currentUserId = localStorage.getItem('userId');
  const otherUsers = users.filter(user => user._id !== currentUserId);
  
  usersList.innerHTML = otherUsers.length === 0 ? 
    '<p>Aucun autre utilisateur disponible</p>' : '';
  
  otherUsers.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.innerHTML = `<span>${user.username}</span>`;
    userDiv.onclick = () => location.href = `conversation.html?userId=${user._id}`;
    usersList.appendChild(userDiv);
  });
}

// =============== MAIN.HTML ===============
if (location.pathname.includes('main.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      const userList = document.getElementById('userList');
      if (userList && data.users) {
        userList.innerHTML = data.users.length === 0 ? 
          '<p>Aucun utilisateur disponible</p>' : '';
          
        data.users.forEach(user => {
          const userDiv = document.createElement('div');
          userDiv.className = 'user-item';
          userDiv.innerHTML = `<span>${user.username}</span>`;
          userDiv.onclick = () => location.href = 'userloggin.html';
          userList.appendChild(userDiv);
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  });
}

