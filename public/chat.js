const socket = io("http://localhost:3000");

// Variables globales
let senderUserId = null;
let receiverId = null;
let currentGroupId = null;

// Variables pour les groupes
let groupCurrentGroupName = null;
let groupMembers = [];
let allUsers = [];
let userGroups = [];

// =============== UTILITAIRES GÉNÉRIQUES ===============

// Fonction pour vérifier l'authentification
function checkAuthentication() {
  if (!localStorage.getItem('token') || !localStorage.getItem('userId')) {
    window.location.href = 'userloggin.html';
    return false;
  }
  return true;
}

// Fonction générique pour les requêtes API
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  };
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
}

// Fonction pour afficher les messages d'erreur
function showMessage(message, isError = false) {
  if (isError) {
    console.error(message);
  }
  alert(message);
}

// =============== INITIALISATION ===============
document.addEventListener('DOMContentLoaded', () => {
  // Récupérer les infos utilisateur
  senderUserId = localStorage.getItem('userId');

  const urlParams = new URLSearchParams(window.location.search);
  receiverId = urlParams.get('userId');
  currentGroupId = urlParams.get('currentGroupId') || urlParams.get('groupId');
  
  // Rejoindre socket si connecté
  if (senderUserId) {
    socket.emit('user-join', { userId: senderUserId });
  }
  
  // Initialisation spécifique par page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('userselection.html')) {
    initUserSelection();
  } else if (currentPage.includes('groups.html')) {
    initGroups();
  } else if (currentPage.includes('group-conversation.html')) {
    initGroupConversation();
  } else if (currentPage.includes('conversation.html') && receiverId && senderUserId) {
    loadExistingMessages();
  } else if (currentPage.includes('main.html')) {
    initMainPage();
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

// Réception d'un message de groupe
socket.on('group-message', (messageData) => {
  console.log('Message de groupe reçu via socket:', messageData);
  displayGroupMessage(messageData);
});

// Gestion des erreurs
socket.on('message-error', (error) => {
  console.error('Erreur message:', error);
  showMessage('Erreur: ' + error.error);
});

// =============== FONCTIONS GROUPES ===============

// Rejoindre un groupe via socket
function joinGroup() {
  socket.emit('join-room', { 
    groupId: currentGroupId, 
    userId: senderUserId 
  });
}

// Quitter un groupe via socket
function leaveGroupSocket() {
  socket.emit('leave-room', { 
    groupId: currentGroupId, 
    userId: senderUserId 
  });
}

// Quitter un groupe définitivement (API)
async function leaveGroup(groupId, groupName) {
  try {
    const { response, data } = await apiRequest(`/api/groups/${groupId}/leave`, {
      method: 'DELETE'
    });
    return { success: response.ok, message: data.message };
  } catch (error) {
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}

// Charger les informations d'un groupe
async function loadGroupInfo() {
  try {
    const { response, data } = await apiRequest(`/api/groups/${currentGroupId}`);
    
    if (response.ok) {
      groupCurrentGroupName = data.group.name;
      groupMembers = data.group.members;
      
      updateGroupTitle(groupCurrentGroupName);
      localStorage.setItem('currentGroupName', groupCurrentGroupName);
    }
  } catch (error) {
    console.error('Erreur chargement info groupe:', error);
  }
}

// Mettre à jour le titre du groupe
function updateGroupTitle(groupName) {
  const groupTitleElement = document.getElementById('groupTitle');
  if (groupTitleElement) {
    groupTitleElement.textContent = `🏢 ${groupName}`;
  }
  document.title = `Groupe: ${groupName}`;
}

// Charger les messages d'un groupe
async function loadGroupMessages() {
  if (!currentGroupId) {
    console.error('ERREUR: currentGroupId est null ou undefined');
    showMessage('Impossible de charger les messages: ID de groupe manquant', true);
    return;
  }
  
  try {
    const { response, data } = await apiRequest(`/api/messages/group/${currentGroupId}`);
    
    if (response.ok && data.messages && data.messages.length > 0) {
      data.messages.forEach(message => displayGroupMessage(message));
    }
  } catch (error) {
    console.error('Erreur chargement messages groupe:', error);
  }
}

// Envoyer un message de groupe
function sendGroupMessage() {
  const msgInput = document.getElementById('msg');
  const text = msgInput ? msgInput.value.trim() : '';

  socket.emit('chat-message', {
    senderId: senderUserId,
    groupId: currentGroupId,
    content: text
  });

  msgInput.value = '';
}

// Afficher les informations du groupe (modal)
function showGroupInfo() {
  const membersList = document.getElementById('membersList');
  if (!membersList) return;
  
  membersList.innerHTML = '';

  groupMembers.forEach(member => {
    const li = document.createElement('li');
    li.textContent = member.username;
    if (member._id === senderUserId) {
      li.textContent += ' (Vous)';
      li.style.fontWeight = 'bold';
    }
    membersList.appendChild(li);
  });

  document.getElementById('groupInfoTitle').textContent = `Groupe: ${groupCurrentGroupName}`;
  document.getElementById('groupInfo').style.display = 'flex';
}

// Cacher les informations du groupe
function hideGroupInfo() {
  const groupInfoElement = document.getElementById('groupInfo');
  if (groupInfoElement) {
    groupInfoElement.style.display = 'none';
  }
}

// Confirmer avant de quitter le groupe
async function confirmLeaveGroup() {
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir quitter le groupe "${groupCurrentGroupName}" ?\n\n` +
    'Vous ne recevrez plus les messages et devrez être réinvité pour rejoindre.'
  );
  
  if (confirmation) {
    const result = await leaveGroup(currentGroupId, groupCurrentGroupName);
    if (result.success) {
      socket.emit('leave-group', { groupId: currentGroupId });
      showMessage('Vous avez quitté le groupe avec succès !');
      window.location.href = 'groups.html';
    } else {
      showMessage(result.message || 'Erreur lors de la sortie du groupe');
    }
  }
}

// Charger les utilisateurs pour la sélection de groupe
async function loadUsersForGroups() {
  try {
    const { response, data } = await apiRequest('/api/users');
    
    if (response.ok) {
      allUsers = data.users.filter(user => user._id !== senderUserId);
      displayUsersForSelection();
    }
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
  }
}

// Afficher les utilisateurs pour sélection
function displayUsersForSelection() {
  const container = document.getElementById('usersSelection');
  if (!container) return;
  
  container.innerHTML = '';

  allUsers.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-checkbox';
    userDiv.innerHTML = `
      <input type="checkbox" id="user_${user._id}" value="${user._id}">
      <label for="user_${user._id}">${user.username}</label>
    `;
    container.appendChild(userDiv);
  });
}

// Créer un nouveau groupe
async function createNewGroup() {
  const groupName = document.getElementById('groupName').value.trim();
  const selectedUsers = Array.from(document.querySelectorAll('#usersSelection input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  if (!groupName) {
    showMessage('Veuillez entrer un nom pour le groupe');
    return;
  }

  if (selectedUsers.length === 0) {
    showMessage('Veuillez sélectionner au moins un membre');
    return;
  }

  try {
    selectedUsers.push(senderUserId);

    const { response, data } = await apiRequest('/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        name: groupName,
        members: selectedUsers
      })
    });

    if (response.ok) {
      showMessage('Groupe créé avec succès !');
      hideCreateGroupForm();
      loadUserGroups();
    } else {
      showMessage(data.message || 'Erreur lors de la création du groupe');
    }
  } catch (error) {
    console.error('Erreur création groupe:', error);
    showMessage('Erreur de connexion au serveur');
  }
}

// Charger les groupes de l'utilisateur
async function loadUserGroups() {
  try {
    const { response, data } = await apiRequest('/api/groups');
    
    if (response.ok) {
      userGroups = data.groups || [];
      displayGroups();
    }
  } catch (error) {
    console.error('Erreur chargement groupes:', error);
  }
}

// Afficher les groupes
function displayGroups() {
  const container = document.getElementById('groupsList');
  if (!container) return;
  
  if (userGroups.length === 0) {
    container.innerHTML = '<div class="no-groups">Aucun groupe disponible. Créez-en un !</div>';
    return;
  }

  container.innerHTML = '';
  userGroups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-item';
    
    groupDiv.innerHTML = `
      <div class="group-header">
        <div class="group-name">${group.name}</div>
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-primary" onclick="joinGroupChat('${group._id}', '${group.name}')">
            💬 Rejoindre
          </button>
          <button class="btn btn-danger" onclick="confirmLeaveGroupFromList('${group._id}', '${group.name}')">
            🚪 Quitter
          </button>
        </div>
      </div>
      <div class="group-members">
        👥 Membres: ${group.members.map(m => m.username).join(', ')} (${group.members.length})
      </div>
    `;
    
    container.appendChild(groupDiv);
  });
}

// Rejoindre un chat de groupe
function joinGroupChat(groupId, groupName) {
  localStorage.setItem('currentGroupId', groupId);
  localStorage.setItem('currentGroupName', groupName);
  window.location.href = `group-conversation.html?groupId=${groupId}`;
}

// Confirmer avant de quitter le groupe depuis la liste
async function confirmLeaveGroupFromList(groupId, groupName) {
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir quitter le groupe "${groupName}" ?\n\n` +
    'Vous ne recevrez plus les messages et devrez être réinvité pour rejoindre.'
  );
  
  if (confirmation) {
    const result = await leaveGroup(groupId, groupName);
    if (result.success) {
      showMessage(`Vous avez quitté le groupe "${groupName}" avec succès !`);
      loadUserGroups();
    } else {
      showMessage(result.message || 'Erreur lors de la sortie du groupe');
    }
  }
}

// Afficher/Cacher le formulaire de création de groupe
function showCreateGroupForm() {
  document.getElementById('createGroupForm').style.display = 'block';
  document.getElementById('showCreateForm').style.display = 'none';
}

function hideCreateGroupForm() {
  document.getElementById('createGroupForm').style.display = 'none';
  document.getElementById('showCreateForm').style.display = 'block';
  document.getElementById('groupName').value = '';
  document.querySelectorAll('#usersSelection input[type="checkbox"]').forEach(cb => cb.checked = false);
}


// =============== LOGIN/REGISTER ===============

// Connexion utilisateur
async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const { response, data } = await apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user._id);
      localStorage.setItem('username', data.user.username);
      window.location.href = 'userselection.html';
    } else {
      showMessage(data.message);
    }
  } catch (error) {
    showMessage('Erreur de connexion');
  }
}

// Inscription utilisateur
async function handleRegister() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  
  try {
    const { response, data } = await apiRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      showMessage('Inscription réussie !');
      window.location.href = 'userselection.html';
    } else {
      showMessage(data.message);
    }
  } catch (error) {
    showMessage('Erreur de connexion');
  }
}

// Event listeners pour login/register
document.getElementById("login")?.addEventListener('click', handleLogin);
document.getElementById("register")?.addEventListener('click', handleRegister);

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
  if (!container) return;
  
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

// Charger les messages existants (conversations privées)
async function loadExistingMessages() {
  try {
    const { response, data } = await apiRequest(`/api/messages/${senderUserId}/${receiverId}`);
    
    if (response.ok) {
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

// =============== INITIALISATION DES PAGES ===============

// Initialisation page userselection.html
function initUserSelection() {
  if (checkAuthentication()) {
    loadUsers();
  }
  document.getElementById('goToGroups')?.addEventListener('click', () => {
    window.location.href = 'groups.html';
  });
  document.getElementById('goToPrivateChats')?.addEventListener('click', () => {
    document.getElementById('usersList')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// Initialisation page groups.html
function initGroups() {
  if (!checkAuthentication()) return;
  
  loadUsersForGroups();
  loadUserGroups();

  // Event listeners pour les groupes
  document.getElementById('showCreateForm')?.addEventListener('click', showCreateGroupForm);
  document.getElementById('cancelCreate')?.addEventListener('click', hideCreateGroupForm);
  document.getElementById('createGroup')?.addEventListener('click', createNewGroup);
  document.getElementById('backToSelection')?.addEventListener('click', () => {
    window.location.href = 'userselection.html';
  });
}

// Initialisation page group-conversation.html
function initGroupConversation() {
  const urlParams = new URLSearchParams(window.location.search);
  currentGroupId = urlParams.get('groupId') || localStorage.getItem('currentGroupId');
  groupCurrentGroupName = localStorage.getItem('currentGroupName');
  
  window.currentGroupId = currentGroupId;

  if (!senderUserId || !currentGroupId) {
    console.error('Informations manquantes - redirection vers groups.html');
    showMessage('Informations manquantes pour rejoindre le groupe');
    window.location.href = 'groups.html';
    return;
  }

  // Rejoindre le groupe via socket
  if (socket.connected) {
    joinGroup();
  } else {
    socket.on('connect', () => {
      joinGroup();
    });
  }

  // Mettre à jour le titre immédiatement
  if (groupCurrentGroupName) {
    updateGroupTitle(groupCurrentGroupName);
  }

  // Charger les données du groupe
  loadGroupInfo();
  loadGroupMessages();

  // Event listeners pour la conversation de groupe
  setupGroupConversationEvents();

  // Se déconnecter au moment de quitter la page
  window.addEventListener('beforeunload', () => {
    leaveGroupSocket();
  });
}

// Configuration des événements pour la page conversation de groupe
function setupGroupConversationEvents() {
  const sendButton = document.getElementById('send');
  const msgInput = document.getElementById('msg');
  
  if (sendButton && msgInput) {
    // Supprimer les anciens listeners en clonant
    const newSendButton = sendButton.cloneNode(true);
    const newMsgInput = msgInput.cloneNode(true);
    
    sendButton.parentNode.replaceChild(newSendButton, sendButton);
    msgInput.parentNode.replaceChild(newMsgInput, msgInput);
    
    // Ajouter nouveaux listeners
    newSendButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendGroupMessage();
    });
    
    newMsgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        sendGroupMessage();
      }
    });
  }

  // Autres boutons
  document.getElementById('backBtn')?.addEventListener('click', () => {
    leaveGroupSocket();
    window.location.href = 'groups.html';
  });

  document.getElementById('groupInfoBtn')?.addEventListener('click', showGroupInfo);
  document.getElementById('leaveGroupBtn')?.addEventListener('click', confirmLeaveGroup);
  
  // Modal groupe info
  const groupInfoModal = document.getElementById('groupInfo');
  if (groupInfoModal) {
    groupInfoModal.addEventListener('click', (e) => {
      if (e.target.id === 'groupInfo') {
        hideGroupInfo();
      }
    });
  }
}

// Initialisation page main.html
async function initMainPage() {
  try {
    const { response, data } = await apiRequest('/api/users');
    
    const userList = document.getElementById('userList');
    if (userList && data.users) {
      userList.innerHTML = data.users.length === 0 ? 
        '<p>Aucun utilisateur disponible</p>' : '';
        
      data.users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `<span>${user.username}</span>`;
        userDiv.onclick = () => window.location.href = 'userloggin.html';
        userList.appendChild(userDiv);
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Charger les utilisateurs pour conversations privées
async function loadUsers() {
  try {
    const { response, data } = await apiRequest('/api/users');
    
    if (response.ok) {
      displayUsers(data.users);
    } else if (response.status === 401) {
      localStorage.clear();
      window.location.href = 'userloggin.html';
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Afficher les utilisateurs pour conversations privées
function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  const otherUsers = users.filter(user => user._id !== senderUserId);
  
  usersList.innerHTML = otherUsers.length === 0 ? 
    '<p>Aucun autre utilisateur disponible</p>' : '';
  
  otherUsers.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.innerHTML = `<span>${user.username}</span>`;
    userDiv.onclick = () => window.location.href = `conversation.html?userId=${user._id}`;
    usersList.appendChild(userDiv);
  });
}

