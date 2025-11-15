// Firebase Configuration - Use your actual project details
const firebaseConfig = {
  apiKey: "AIzaSyAgVMWh_xuP9CRptIbaS_nJ7e0j2Dp5sRY",
  authDomain: "myself-4e877.firebaseapp.com",
  projectId: "myself-4e877",
  storageBucket: "myself-4e877.appspot.com",   // ✅ fixed: must end with .appspot.com
  messagingSenderId: "603026482562",
  appId: "1:603026482562:web:9e790b4884674549ea5b9b",
  measurementId: "G-4MS84VJ031"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let currentView = 'dashboard';
let selectedConversation = null;
let isClient = false;

// DOM Elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    app: document.getElementById('app'),
    authSection: document.getElementById('authSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    forgotForm: document.getElementById('forgotForm'),
    loginBtn: document.getElementById('loginBtn'),
    signupBtn: document.getElementById('signupBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    viewContainers: document.querySelectorAll('.view-container'),
    navItems: document.querySelectorAll('.nav-item'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    fileInput: document.getElementById('fileInput'),
    fileUploadBtn: document.getElementById('fileUploadBtn'),
    projectsList: document.getElementById('projectsList'),
    messagesList: document.getElementById('messagesList'),
    conversationsList: document.getElementById('conversationsList'),
    toastContainer: document.getElementById('toastContainer')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Show loading screen initially
    setTimeout(() => {
        elements.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
        }, 500);
    }, 2000);

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData(user.uid);
            showDashboard();
        } else {
            showAuth();
        }
    });

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Authentication form listeners
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.signupBtn.addEventListener('click', handleSignup);
    document.getElementById('resetPasswordBtn').addEventListener('click', handlePasswordReset);
    document.getElementById('googleLogin').addEventListener('click', handleGoogleLogin);
    document.getElementById('phoneLogin').addEventListener('click', handlePhoneLogin);

    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
    });

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Chat functionality
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // File upload
    elements.fileUploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileUpload);

    // Project creation
    document.getElementById('createProjectBtn').addEventListener('click', showCreateProjectModal);

    // Profile updates
    document.getElementById('saveProfileBtn').addEventListener('click', updateProfile);
}

// Authentication Functions
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        await loadUserData(currentUser.uid);
        showDashboard();
        showToast('Login successful!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = result.user;
        
        // Save user data to Firestore
        await db.collection('users').doc(currentUser.uid).set({
            name: name,
            email: email,
            userType: userType,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            avatar: 'https://via.placeholder.com/150',
            bio: '',
            phone: '',
            online: true
        });

        showToast('Account created successfully!', 'success');
        showDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handlePasswordReset() {
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        
        // Check if user exists in our database
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            // Create user profile
            await db.collection('users').doc(currentUser.uid).set({
                name: currentUser.displayName,
                email: currentUser.email,
                userType: 'client', // Default to client
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                avatar: currentUser.photoURL || 'https://via.placeholder.com/150',
                bio: '',
                phone: '',
                online: true
            });
        }
        
        await loadUserData(currentUser.uid);
        showDashboard();
        showToast('Logged in with Google!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handlePhoneLogin() {
    // Phone authentication implementation
    const phoneNumber = prompt('Enter your phone number (include country code):');
    if (!phoneNumber) return;

    try {
        const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
        const code = prompt('Enter the verification code sent to your phone:');
        
        if (code) {
            const result = await confirmationResult.confirm(code);
            currentUser = result.user;
            
            // Check if user exists in our database
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (!userDoc.exists) {
                await db.collection('users').doc(currentUser.uid).set({
                    name: 'Phone User',
                    email: null,
                    userType: 'client',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    avatar: 'https://via.placeholder.com/150',
                    bio: '',
                    phone: phoneNumber,
                    online: true
                });
            }
            
            await loadUserData(currentUser.uid);
            showDashboard();
            showToast('Phone login successful!', 'success');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Dashboard Functions
async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update UI with user data
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('welcomeName').textContent = userData.name;
            document.getElementById('userRole').textContent = userData.userType;
            document.getElementById('userAvatar').src = userData.avatar;
            
            // Update profile view
            document.getElementById('profileName').textContent = userData.name;
            document.getElementById('profileRole').textContent = userData.userType;
            document.getElementById('profileImage').src = userData.avatar;
            
            // Update profile form
            document.getElementById('editName').value = userData.name;
            document.getElementById('editEmail').value = userData.email || '';
            document.getElementById('editPhone').value = userData.phone || '';
            document.getElementById('editBio').value = userData.bio || '';
            
            isClient = userData.userType === 'client';
            
            // Load dashboard data
            await loadDashboardStats();
            await loadRecentActivity();
            
            if (isClient) {
                await loadProjects();
            } else {
                await loadClientProjects();
            }
            
            // Setup real-time listeners
            setupRealTimeListeners();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

async function loadDashboardStats() {
    try {
        const userId = currentUser.uid;
        let totalProjects = 0;
        let activeProjects = 0;
        let earnings = 0;
        
        if (isClient) {
            // Client: count their projects
            const projectsSnapshot = await db.collection('projects')
                .where('clientId', '==', userId)
                .get();
            totalProjects = projectsSnapshot.size;
            
            projectsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'completed' && data.status !== 'canceled') {
                    activeProjects++;
                }
                if (data.status === 'completed') {
                    earnings += data.budget || 0;
                }
            });
        } else {
            // Freelancer: count assigned projects
            const projectsSnapshot = await db.collection('projects')
                .where('freelancerId', '==', userId)
                .get();
            totalProjects = projectsSnapshot.size;
            
            projectsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'completed' && data.status !== 'canceled') {
                    activeProjects++;
                }
                if (data.status === 'completed') {
                    earnings += data.budget || 0;
                }
            });
        }
        
        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('activeProjects').textContent = activeProjects;
        document.getElementById('earnings').textContent = `$${earnings.toFixed(2)}`;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityFeed');
        activityList.innerHTML = '';
        
        // Get recent projects and messages
        const projectsSnapshot = await db.collection('projects')
            .where(isClient ? 'clientId' : 'freelancerId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const messagesSnapshot = await db.collection('messages')
            .where('projectId', 'in', await getCurrentUserProjectIds())
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        
        const activities = [];
        
        projectsSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                type: 'project',
                title: data.title,
                description: `Project ${data.status}`,
                timestamp: data.createdAt,
                projectId: doc.id
            });
        });
        
        messagesSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                type: 'message',
                title: 'New Message',
                description: data.text ? data.text.substring(0, 50) + '...' : 'File message',
                timestamp: data.timestamp,
                projectId: data.projectId
            });
        });
        
        // Sort by timestamp
        activities.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
        
        // Display top 5 activities
        activities.slice(0, 5).forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.innerHTML = `
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
                <small>${formatTime(activity.timestamp)}</small>
            `;
            activityList.appendChild(activityElement);
        });
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function getCurrentUserProjectIds() {
    const projectIds = [];
    const projectsSnapshot = await db.collection('projects')
        .where(isClient ? 'clientId' : 'freelancerId', '==', currentUser.uid)
        .get();
    
    projectsSnapshot.forEach(doc => {
        projectIds.push(doc.id);
    });
    
    return projectIds;
}

function setupRealTimeListeners() {
    // Listen for project updates
    const projectQuery = isClient 
        ? db.collection('projects').where('clientId', '==', currentUser.uid)
        : db.collection('projects').where('freelancerId', '==', currentUser.uid);
    
    projectQuery.onSnapshot(snapshot => {
        loadDashboardStats();
        if (currentView === 'projects') {
            if (isClient) {
                loadProjects();
            } else {
                loadClientProjects();
            }
        }
    });
    
    // Listen for message updates
    db.collection('messages').where('projectId', 'in', []).onSnapshot(() => {
        // This will be updated with actual project IDs when needed
    });
}

// Project Management Functions
async function loadProjects() {
    try {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';
        
        const projectsSnapshot = await db.collection('projects')
            .where('clientId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        projectsSnapshot.forEach(doc => {
            const project = doc.data();
            const projectElement = createProjectCard(doc.id, project);
            projectsList.appendChild(projectElement);
        });
        
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

async function loadClientProjects() {
    try {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';
        
        const projectsSnapshot = await db.collection('projects')
            .where('freelancerId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        projectsSnapshot.forEach(doc => {
            const project = doc.data();
            const projectElement = createProjectCard(doc.id, project);
            projectsList.appendChild(projectElement);
        });
        
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

function createProjectCard(projectId, project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const statusClass = `status-${project.status}`;
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    
    card.innerHTML = `
        <div class="project-header">
            <h3>${project.title}</h3>
            <span class="project-status ${statusClass}">${statusText}</span>
        </div>
        <p>${project.description}</p>
        <div class="project-meta">
            <span>Budget: $${project.budget || 0}</span>
            <span>Deadline: ${formatDate(project.deadline)}</span>
        </div>
        <div class="project-actions">
            <button class="neon-btn small-btn" onclick="openProjectChat('${projectId}')">Chat</button>
            <button class="neon-btn small-btn" onclick="updateProjectStatus('${projectId}', '${project.status === 'pending' ? 'accepted' : project.status === 'accepted' ? 'in-progress' : project.status === 'in-progress' ? 'waiting-for-review' : project.status === 'waiting-for-review' ? 'completed' : 'pending'}')">Update Status</button>
        </div>
    `;
    
    return card;
}

async function showCreateProjectModal() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h3>Create New Project</h3>
        <input type="text" id="projectTitle" placeholder="Project Title" class="auth-input">
        <textarea id="projectDescription" placeholder="Project Description" class="profile-textarea"></textarea>
        <input type="number" id="projectBudget" placeholder="Budget ($)" class="auth-input">
        <input type="date" id="projectDeadline" class="auth-input">
        <input type="file" id="projectFiles" multiple class="hidden">
        <button class="file-upload-btn" onclick="document.getElementById('projectFiles').click()">📁 Upload Files</button>
        <div id="filePreviews" class="file-preview"></div>
        <div class="modal-actions">
            <button class="neon-btn" onclick="createProject()">Create Project</button>
            <button class="danger-btn" onclick="closeModal()">Cancel</button>
        </div>
    `;
    
    document.getElementById('projectFiles').addEventListener('change', handleProjectFileUpload);
    document.getElementById('modalOverlay').classList.remove('hidden');
}

async function createProject() {
    const title = document.getElementById('projectTitle').value;
    const description = document.getElementById('projectDescription').value;
    const budget = parseFloat(document.getElementById('projectBudget').value);
    const deadline = document.getElementById('projectDeadline').value;
    
    if (!title || !description) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    try {
        const projectData = {
            title: title,
            description: description,
            budget: budget,
            deadline: deadline,
            status: 'pending',
            clientId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const projectRef = await db.collection('projects').add(projectData);
        
        // Handle file uploads if any
        const fileInput = document.getElementById('projectFiles');
        if (fileInput.files.length > 0) {
            for (let file of fileInput.files) {
                await uploadProjectFile(projectRef.id, file);
            }
        }
        
        closeModal();
        showToast('Project created successfully!', 'success');
        
        if (currentView === 'projects') {
            loadProjects();
        }
        
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project', 'error');
    }
}

async function updateProjectStatus(projectId, newStatus) {
    try {
        await db.collection('projects').doc(projectId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Project status updated!', 'success');
    } catch (error) {
        console.error('Error updating project status:', error);
        showToast('Error updating project status', 'error');
    }
}

async function uploadProjectFile(projectId, file) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`projects/${projectId}/${file.name}`);
    
    try {
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // Save file reference to project
        await db.collection('projects').doc(projectId).update({
            files: firebase.firestore.FieldValue.arrayUnion({
                name: file.name,
                url: downloadURL,
                type: file.type,
                size: file.size,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
        });
        
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file', 'error');
    }
}

// Chat Functions
async function openProjectChat(projectId) {
    selectedConversation = projectId;
    switchView('messages');
    await loadConversation(projectId);
}

async function loadConversation(projectId) {
    try {
        // Load messages for this project
        const messagesSnapshot = await db.collection('messages')
            .where('projectId', '==', projectId)
            .orderBy('timestamp', 'asc')
            .get();
        
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        messagesSnapshot.forEach(doc => {
            const message = doc.data();
            const messageElement = createMessageElement(message, doc.id);
            messagesList.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
        
        // Load project info for chat header
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
            const project = projectDoc.data();
            const otherUserId = isClient ? project.freelancerId : project.clientId;
            
            if (otherUserId) {
                const userDoc = await db.collection('users').doc(otherUserId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    document.getElementById('chatUserName').textContent = userData.name;
                    document.getElementById('chatUserAvatar').src = userData.avatar;
                    document.getElementById('chatUserStatus').className = 'status-indicator';
                    document.getElementById('chatUserStatus').textContent = userData.online ? 'online' : 'offline';
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        showToast('Error loading conversation', 'error');
    }
}

function createMessageElement(message, messageId) {
    const messageElement = document.createElement('div');
    const isOwn = message.senderId === currentUser.uid;
    const messageClass = isOwn ? 'message own' : 'message other';
    
    messageElement.className = messageClass;
    
    if (message.type === 'file') {
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="file-message">
                    <span>📁 ${message.fileName}</span>
                    <a href="${message.fileUrl}" target="_blank" class="file-link">Download</a>
                </div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-content">
                ${message.text}
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    }
    
    return messageElement;
}

async function sendMessage() {
    const text = elements.messageInput.value.trim();
    
    if (!text && !elements.fileInput.files.length) {
        showToast('Please enter a message or select a file', 'error');
        return;
    }
    
    if (!selectedConversation) {
        showToast('Please select a conversation first', 'error');
        return;
    }
    
    try {
        const messageData = {
            projectId: selectedConversation,
            senderId: currentUser.uid,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text'
        };
        
        await db.collection('messages').add(messageData);
        
        // Clear input
        elements.messageInput.value = '';
        
        // If there are files to upload, upload them
        if (elements.fileInput.files.length > 0) {
            for (let file of elements.fileInput.files) {
                await uploadMessageFile(selectedConversation, file);
            }
            elements.fileInput.value = '';
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message', 'error');
    }
}

async function uploadMessageFile(projectId, file) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`messages/${projectId}/${Date.now()}_${file.name}`);
    
    try {
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        const messageData = {
            projectId: projectId,
            senderId: currentUser.uid,
            fileName: file.name,
            fileUrl: downloadURL,
            fileType: file.type,
            fileSize: file.size,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'file'
        };
        
        await db.collection('messages').add(messageData);
        
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file', 'error');
    }
}

// File Upload Functions
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        // Process files (this would typically show previews in the chat input area)
        showToast(`Selected ${files.length} file(s) for upload`, 'success');
    }
}

function handleProjectFileUpload(event) {
    const files = event.target.files;
    const filePreviews = document.getElementById('filePreviews');
    filePreviews.innerHTML = '';
    
    for (let file of files) {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        
        if (file.type.startsWith('image/')) {
            fileElement.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Preview">
                <div class="file-info">
                    <div>${file.name}</div>
                    <div>${formatFileSize(file.size)}</div>
                </div>
            `;
        } else {
            fileElement.innerHTML = `
                <div>📄</div>
                <div class="file-info">
                    <div>${file.name}</div>
                    <div>${formatFileSize(file.size)}</div>
                </div>
            `;
        }
        
        filePreviews.appendChild(fileElement);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Profile Functions
async function updateProfile() {
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const phone = document.getElementById('editPhone').value;
    const bio = document.getElementById('editBio').value;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            email: email,
            phone: phone,
            bio: bio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Profile updated successfully!', 'success');
        
        // Update UI
        document.getElementById('userName').textContent = name;
        document.getElementById('welcomeName').textContent = name;
        document.getElementById('profileName').textContent = name;
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    }
}

// Utility Functions
function showAuth() {
    elements.authSection.classList.remove('hidden');
    elements.dashboardSection.classList.add('hidden');
}

function showDashboard() {
    elements.authSection.classList.add('hidden');
    elements.dashboardSection.classList.remove('hidden');
    switchView('dashboard');
}

function switchView(view) {
    // Update active nav item
    elements.navItems.forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Show active view
    elements.viewContainers.forEach(container => {
        if (container.id === `${view}View`) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    });
    
    currentView = view;
    
    // Load specific data for the view
    if (view === 'projects') {
        if (isClient) {
            loadProjects();
        } else {
            loadClientProjects();
        }
    } else if (view === 'messages') {
        loadConversations();
    }
}

function switchAuthTab(tab) {
    // Hide all forms
    elements.tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-container').forEach(form => form.classList.remove('active'));
    
    // Show selected form
    document.getElementById(`${tab}Form`).classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

function handleLogout() {
    auth.signOut().then(() => {
        currentUser = null;
        showAuth();
        showToast('Logged out successfully!', 'success');
    }).catch(error => {
        console.error('Error logging out:', error);
        showToast('Error logging out', 'error');
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    return date.toLocaleTimeString();
}

// Initialize Recaptcha for phone auth (if needed)
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('phoneLogin', {
    'size': 'invisible',
    'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
    }
});

// Additional utility functions for the app
function loadConversations() {
    // This would load recent conversations for the user
    // Implementation depends on your specific requirements
}

// Small button style for project actions
const style = document.createElement('style');
style.textContent = `
    .small-btn {
        padding: 8px 12px !important;
        font-size: 14px !important;
        margin-right: 10px !important;
    }
    
    .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
`;
document.head.appendChild(style);

console.log('FutureFreelance Platform initialized successfully!');