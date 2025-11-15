// Import Firebase services from the config file
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Get the initialized services from the global window object (or import them differently if preferred)
const auth = getAuth(window.firebaseApp);
const db = getFirestore(window.firebaseApp);
const storage = getStorage(window.firebaseApp);

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
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
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
        const result = await signInWithEmailAndPassword(auth, email, password);
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
        const result = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = result.user;
        
        // Save user data to Firestore
        await addDoc(collection(db, 'users'), {
            name: name,
            email: email,
            userType: userType,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
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
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset email sent!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        
        // Check if user exists in our database
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // Create user profile
            await addDoc(collection(db, 'users'), {
                name: currentUser.displayName,
                email: currentUser.email,
                userType: 'client', // Default to client
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                avatar: currentUser.photoURL || 'https://via.placeholder.com/150',
                bio: '',
                phone: '',
                online: true
            });
        } else {
            // User already exists, just get their ID
            const userDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                lastLogin: serverTimestamp(),
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
        // Note: For phone auth to work properly, you need to set up reCAPTCHA
        // This is a simplified version and might not work without proper reCAPTCHA setup
        // For a full implementation, you'd need to use the Firebase UI library or implement reCAPTCHA manually
        showToast('Phone authentication requires reCAPTCHA setup. Please implement it.', 'warning');
        // const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        // const code = prompt('Enter the verification code sent to your phone:');
        
        // if (code) {
        //     const result = await confirmationResult.confirm(code);
        //     currentUser = result.user;
            
        //     // Check if user exists in our database
        //     const userDoc = await db.collection('users').doc(currentUser.uid).get();
        //     if (!userDoc.exists) {
        //         await db.collection('users').doc(currentUser.uid).set({
        //             name: 'Phone User',
        //             email: null,
        //             userType: 'client',
        //             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        //             lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        //             avatar: 'https://via.placeholder.com/150',
        //             bio: '',
        //             phone: phoneNumber,
        //             online: true
        //         });
        //     }
            
        //     await loadUserData(currentUser.uid);
        //     showDashboard();
        //     showToast('Phone login successful!', 'success');
        // }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Dashboard Functions
async function loadUserData(userId) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('__name__', '==', userId)); // Query by document ID
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
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
            const projectsRef = collection(db, 'projects');
            const q = query(projectsRef, where('clientId', '==', userId));
            const querySnapshot = await getDocs(q);
            totalProjects = querySnapshot.size;
            
            querySnapshot.forEach(doc => {
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
            const projectsRef = collection(db, 'projects');
            const q = query(projectsRef, where('freelancerId', '==', userId));
            const querySnapshot = await getDocs(q);
            totalProjects = querySnapshot.size;
            
            querySnapshot.forEach(doc => {
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
        const userId = currentUser.uid;
        const projectsRef = collection(db, 'projects');
        const projectQuery = isClient 
            ? query(projectsRef, where('clientId', '==', userId), orderBy('createdAt', 'desc'), limit(5))
            : query(projectsRef, where('freelancerId', '==', userId), orderBy('createdAt', 'desc'), limit(5));
        
        const projectsSnapshot = await getDocs(projectQuery);
        
        // For messages, we need to get project IDs first
        const projectIds = [];
        projectsSnapshot.forEach(doc => {
            projectIds.push(doc.id);
        });

        let messagesSnapshot = { docs: [] }; // Initialize as empty
        if (projectIds.length > 0) {
            const messagesRef = collection(db, 'messages');
            const messageQuery = query(messagesRef, where('projectId', 'in', projectIds), orderBy('timestamp', 'desc'), limit(5));
            messagesSnapshot = await getDocs(messageQuery);
        }
        
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
        activities.sort((a, b) => b.timestamp.toDate - a.timestamp.toDate);
        
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

function setupRealTimeListeners() {
    // Listen for project updates
    const userId = currentUser.uid;
    const projectsRef = collection(db, 'projects');
    const projectQuery = isClient 
        ? query(projectsRef, where('clientId', '==', userId))
        : query(projectsRef, where('freelancerId', '==', userId));
    
    onSnapshot(projectQuery, () => {
        loadDashboardStats();
        if (currentView === 'projects') {
            if (isClient) {
                loadProjects();
            } else {
                loadClientProjects();
            }
        }
    });
    
    // Listen for message updates (this would need to be updated based on selected conversation)
    // For now, we'll focus on the main project updates
}

// Project Management Functions
async function loadProjects() {
    try {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';
        
        const userId = currentUser.uid;
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('clientId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
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
        
        const userId = currentUser.uid;
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('freelancerId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
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
    const statusText = project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Unknown';
    
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const projectRef = await addDoc(collection(db, 'projects'), projectData);
        
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
        await updateDoc(doc(db, 'projects', projectId), {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        showToast('Project status updated!', 'success');
    } catch (error) {
        console.error('Error updating project status:', error);
        showToast('Error updating project status', 'error');
    }
}

async function uploadProjectFile(projectId, file) {
    const fileRef = storageRef(storage, `projects/${projectId}/${file.name}`);
    
    try {
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Save file reference to project
        // Note: Firestore doesn't have a direct arrayUnion equivalent in the modular SDK without a transaction
        // For simplicity, we'll fetch the current project and update it
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        const projectData = projectDoc.data();
        const currentFiles = projectData.files || [];
        currentFiles.push({
            name: file.name,
            url: downloadURL,
            type: file.type,
            size: file.size,
            uploadedAt: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'projects', projectId), {
            files: currentFiles
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
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('projectId', '==', projectId), orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const message = doc.data();
            const messageElement = createMessageElement(message, doc.id);
            messagesList.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
        
        // Load project info for chat header
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
            const project = projectDoc.data();
            const otherUserId = isClient ? project.freelancerId : project.clientId;
            
            if (otherUserId) {
                const userRef = collection(db, 'users');
                const userQuery = query(userRef, where('__name__', '==', otherUserId)); // Query by document ID
                const userSnapshot = await getDocs(userQuery);
                
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
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
            timestamp: serverTimestamp(),
            type: 'text'
        };
        
        await addDoc(collection(db, 'messages'), messageData);
        
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
    const fileRef = storageRef(storage, `messages/${projectId}/${Date.now()}_${file.name}`);
    
    try {
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        const messageData = {
            projectId: projectId,
            senderId: currentUser.uid,
            fileName: file.name,
            fileUrl: downloadURL,
            fileType: file.type,
            fileSize: file.size,
            timestamp: serverTimestamp(),
            type: 'file'
        };
        
        await addDoc(collection(db, 'messages'), messageData);
        
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
        // Find the user document by email (or you could store the doc ID in session)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email)); // Assuming email is unique and used as identifier
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                name: name,
                email: email,
                phone: phone,
                bio: bio,
                updatedAt: serverTimestamp()
            });
            
            showToast('Profile updated successfully!', 'success');
            
            // Update UI
            document.getElementById('userName').textContent = name;
            document.getElementById('welcomeName').textContent = name;
            document.getElementById('profileName').textContent = name;
        } else {
            showToast('User profile not found', 'error');
        }
        
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

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        showAuth();
        showToast('Logged out successfully!', 'success');
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Error logging out', 'error');
    }
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
    // Handle both Timestamp objects (from Firestore) and plain Date objects
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'Invalid Date';
    }
    return date.toLocaleTimeString();
}

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

console.log('FutureFreelance Platform initialized successfully with modular Firebase SDK!');
