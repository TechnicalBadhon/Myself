// script.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const createProjectModal = document.getElementById('createProjectModal');
    const closeModal = document.querySelectorAll('.close');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const createProjectForm = document.getElementById('createProjectForm');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const createProjectBtn = document.getElementById('createProjectBtn');
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.querySelector('.message-input');
    const chatMessages = document.querySelector('.chat-messages');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const filesInput = document.getElementById('files');
    const fileList = document.getElementById('fileList');

    // Open Modals
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    signupBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
    });

    // Close Modals
    closeModal.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            signupModal.style.display = 'none';
            createProjectModal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (event.target === signupModal) {
            signupModal.style.display = 'none';
        }
        if (event.target === createProjectModal) {
            createProjectModal.style.display = 'none';
        }
    });

    // Switch between login and signup modals
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        signupModal.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupModal.style.display = 'none';
        loginModal.style.display = 'block';
    });

    // Form Submissions
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // In a real app, you would send this to a server
        console.log('Login attempt:', { email, password });
        
        // For demo purposes, just close the modal
        loginModal.style.display = 'none';
        alert('Login successful! (This is a demo)');
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // In a real app, you would send this to a server
        console.log('Signup attempt:', { name, email, password });
        
        // For demo purposes, just close the modal
        signupModal.style.display = 'none';
        alert('Account created successfully! (This is a demo)');
    });

    createProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const budget = document.getElementById('budget').value;
        const deadline = document.getElementById('deadline').value;
        const category = document.getElementById('category').value;
        
        // In a real app, you would send this to a server
        console.log('Project creation attempt:', { title, description, budget, deadline, category });
        
        // For demo purposes, just close the modal
        createProjectModal.style.display = 'none';
        alert('Project created successfully! (This is a demo)');
    });

    // Create Project Button
    createProjectBtn.addEventListener('click', () => {
        createProjectModal.style.display = 'block';
    });

    // File Upload Handling
    filesInput.addEventListener('change', function() {
        fileList.innerHTML = '';
        const files = Array.from(this.files);
        
        if (files.length > 5) {
            alert('You can only upload up to 5 files');
            this.value = '';
            return;
        }
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <span>${(file.size / 1024).toFixed(1)} KB</span>
            `;
            fileList.appendChild(fileItem);
        });
    });

    // Send Message Functionality
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', 'sent');
            messageElement.innerHTML = `
                ${messageText}
                <div class="message-time">${getCurrentTime()}</div>
            `;
            chatMessages.appendChild(messageElement);
            messageInput.value = '';
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Simulate response after delay
            setTimeout(simulateResponse, 1000);
        }
    }

    function simulateResponse() {
        const responses = [
            "Thanks for your message! I'll look into it right away.",
            "I've received your message and will get back to you soon.",
            "Got it! I'll start working on this immediately.",
            "Understood. I'll send you an update by tomorrow."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'received');
        messageElement.innerHTML = `
            ${randomResponse}
            <div class="message-time">${getCurrentTime()}</div>
        `;
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getCurrentTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2, '0') + ':' + 
               now.getMinutes().toString().padStart(2, '0');
    }

    // Dashboard Tab Switching
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show the selected tab content
            const tabId = item.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Project Card Interactions
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const messageBtn = card.querySelector('.btn-outline');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                // Switch to messages tab
                sidebarItems.forEach(i => i.classList.remove('active'));
                document.querySelector('[data-tab="messages"]').classList.add('active');
                
                // Show messages tab content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById('messages').classList.add('active');
            });
        }
    });
});