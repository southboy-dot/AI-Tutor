// Theme detection and toggle
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

// Configuration
const GEMINI_API_KEY = ''; // Replace with your actual Gemini API key
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Application state
const appState = {
    currentScreen: 'welcome',
    selectedSubject: null,
    subjectDetails: {
        'math-primary': {
            name: 'Primary Mathematics',
            level: 'Primary',
            topics: [
                'Basic Addition and Subtraction',
                'Multiplication Tables',
                'Division Basics',
                'Fractions Introduction',
                'Measurement Units',
                'Basic Geometry'
            ],
            progress: 0
        },
        'math-secondary': {
            name: 'Secondary Mathematics',
            level: 'Secondary',
            topics: [
                'Algebra Fundamentals',
                'Linear Equations',
                'Quadratic Equations',
                'Coordinate Geometry',
                'Trigonometry Basics',
                'Statistics and Probability'
            ],
            progress: 0
        },
        'science-primary': {
            name: 'Primary Science',
            level: 'Primary',
            topics: [
                'Living Things',
                'Plants and Animals',
                'Human Body',
                'Water and Air',
                'Light and Sound',
                'Earth and Space'
            ],
            progress: 0
        },
        'science-secondary': {
            name: 'Secondary Science',
            level: 'Secondary',
            topics: [
                'Physics: Forces and Motion',
                'Chemistry: Elements and Compounds',
                'Biology: Cells and Life Processes',
                'Ecology and Environment',
                'Energy and Electricity',
                'Scientific Method and Experiments'
            ],
            progress: 0
        }
    },
    conversation: [],
    activeTutor: null
};

// Screen navigation 
function showScreen(screenId) {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('aiTutorScreen').classList.add('hidden');
    document.getElementById('realTutorScreen').classList.add('hidden');

    document.getElementById(screenId + 'Screen').classList.remove('hidden');
    appState.currentScreen = screenId;
}

// Set subject
function setSubject(subjectId) {
    appState.selectedSubject = subjectId;
    const subjectInfo = appState.subjectDetails[subjectId];

    // Update UI to show selected subject
    document.getElementById('currentSubject').textContent = subjectInfo.name;
    document.getElementById('realTutorSubject').textContent = subjectInfo.name;

    // Update progress bar
    updateProgress(subjectInfo.progress);
}

// Update progress bar
function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = `${percentage}%`;
    document.getElementById('progressPercentage').textContent = `${percentage}%`;
}

// Generate initial lesson content
async function generateInitialLesson(subjectId) {
    const subject = appState.subjectDetails[subjectId];

    // Show loading indicator
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('sessionContent').innerHTML = '';

    try {
        // Call the backend API
        const response = await fetch(`${API_BASE_URL}/tutor/lesson`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject.name,
                level: subject.level,
                topics: subject.topics
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to generate lesson');
        }

        // Display the lesson content with Markdown parsing
        document.getElementById('sessionContent').innerHTML = marked.parse(data.content);

        // Update progress
        updateProgress(10); // Starting progress at 10%
        appState.subjectDetails[subjectId].progress = 10;

    } catch (error) {
        const errorMessage = error.message || 'Could not generate lesson';
        console.error("Error:", error); // Log full error for debugging
        document.getElementById('sessionContent').innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4">
                <p>Error: ${errorMessage}</p>
            </div>`;
    } finally {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// Ask question to AI tutor
async function askQuestion(question) {
    if (!question.trim() || !appState.selectedSubject) return;

    const subject = appState.subjectDetails[appState.selectedSubject];

    // Show loading indicator
    document.getElementById('loadingIndicator').classList.remove('hidden');

    // Store current content and append user question
    const currentContent = document.getElementById('sessionContent').innerHTML;
    document.getElementById('sessionContent').innerHTML = currentContent + 
        `<div class="mt-4 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-30 rounded-lg">
            <p class="font-medium">Your question:</p>
            <p>${question}</p>
        </div>`;

    try {
        // Call the backend API
        const response = await fetch(`${API_BASE_URL}/tutor/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: question,
                subject: subject.name,
                level: subject.level
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to get answer'); // Improved error message
        }

        // Display the answer with Markdown parsing
        document.getElementById('sessionContent').innerHTML += 
            `<div class="mt-2 tutor-response">${marked.parse(data.content)}</div>`;

        // Update progress (increment by 5% for each question asked)
        const newProgress = Math.min(subject.progress + 5, 100);
        updateProgress(newProgress);
        appState.subjectDetails[appState.selectedSubject].progress = newProgress;

        // Scroll to bottom
        const contentContainer = document.querySelector('.content-container');
        contentContainer.scrollTop = contentContainer.scrollHeight;

    } catch (error) {
        const errorMessage = error.message || 'Could not process your question';
        console.error("Error:", error); // Log full error for debugging
        document.getElementById('sessionContent').innerHTML += `
            <div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 mt-2">
                <p>Error: ${errorMessage}</p>
            </div>`;
    } finally {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// Start new topic in the current subject
async function startNewTopic() {
    if (!appState.selectedSubject) return;

    const subject = appState.subjectDetails[appState.selectedSubject];
    const progress = subject.progress;

    // Calculate which topic to show based on progress
    const topicIndex = Math.min(Math.floor(progress / 16), subject.topics.length - 1);
    const topic = subject.topics[topicIndex];

    // Show loading indicator
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('sessionContent').innerHTML = '';

    try {
        // Call the backend API
        const response = await fetch(`${API_BASE_URL}/tutor/topic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject.name,
                level: subject.level,
                topic: topic
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load new topic');
        }

        // Display the topic content with Markdown parsing
        document.getElementById('sessionContent').innerHTML = marked.parse(data.content);

        // Update progress (increment by 10% for each new topic)
        const newProgress = Math.min(subject.progress + 10, 100);
        updateProgress(newProgress);
        appState.subjectDetails[appState.selectedSubject].progress = newProgress;

    } catch (error) {
        const errorMessage = error.message || 'Could not load new topic';
        console.error("Error:", error); // Log full error for debugging
        document.getElementById('sessionContent').innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4">
                <p>Error: ${errorMessage}</p>
            </div>`;
    } finally {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// Show real tutor chat interface
function showRealTutorChat() {
    document.getElementById('tutorList').classList.add('hidden');
    document.getElementById('realTutorChat').classList.remove('hidden');
}

// Show section
function showSection(sectionId) {
    // Hide all sections first
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('aiTutorScreen').classList.add('hidden');
    document.getElementById('realTutorScreen').classList.add('hidden');
    document.getElementById('aboutSection').classList.add('hidden');
    document.getElementById('servicesSection').classList.add('hidden');
    document.getElementById('teamSection').classList.add('hidden');

    // Show requested section
    document.getElementById(sectionId).classList.remove('hidden');

    // Update navigation active states
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'text-primary');
        item.classList.add('text-gray-700', 'dark:text-gray-300');
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active', 'bg-gray-100', 'dark:bg-gray-700');
    });

    // Highlight active nav item
    const navItems = document.querySelectorAll(`[data-target="${sectionId}"]`);
    navItems.forEach(item => {
        if (item.classList.contains('nav-item')) {
            item.classList.add('active', 'text-primary');
            item.classList.remove('text-gray-700', 'dark:text-gray-300');
        } else if (item.classList.contains('mobile-nav-item')) {
            item.classList.add('active', 'bg-gray-100', 'dark:bg-gray-700');
        }
    });

    // Close mobile menu when item selected
    document.getElementById('mobileMenu').classList.add('hidden');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    document.getElementById('mobileMenuButton').addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.toggle('hidden');
    });

    // Navigation items
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.getAttribute('data-target');
            showSection(targetSection);
        });
    });

    // Navigation buttons
    document.getElementById('aiTutorBtn').addEventListener('click', () => {
        showSection('aiTutorScreen');
        if (appState.selectedSubject) {
            generateInitialLesson(appState.selectedSubject);
        }
    });

    document.getElementById('realTutorBtn').addEventListener('click', () => {
        showSection('realTutorScreen');
    });

    document.getElementById('backToWelcome').addEventListener('click', () => {
        showSection('welcomeScreen');
    });

    document.getElementById('backToWelcomeFromReal').addEventListener('click', () => {
        showSection('welcomeScreen');
    });

    // Subject selection
    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setSubject(btn.dataset.subject);

            // If on the AI tutor screen, generate initial lesson
            if (appState.currentScreen === 'aiTutor') {
                generateInitialLesson(btn.dataset.subject);
            }
        });
    });

    // Ask question form
    document.getElementById('tutorForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const question = document.getElementById('userQuestion').value;
        askQuestion(question);
        document.getElementById('userQuestion').value = '';
    });

    // New topic button
    document.getElementById('newTopicButton').addEventListener('click', () => {
        startNewTopic();
    });

    // Real tutor simulation
    document.getElementById('realTutorForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const messageInput = document.getElementById('realTutorQuestion');
        if (messageInput.value.trim()) {
            // In a real implementation, this would send the message to the backend
            // For now, just show a message
            const currentContent = document.getElementById('realTutorChat').innerHTML;
            const userMessage = messageInput.value;

            document.getElementById('realTutorChat').innerHTML = currentContent + `
                <div class="bg-blue-100 dark:bg-blue-900 dark:bg-opacity-50 rounded-lg p-3 my-3 ml-12">
                    <p class="text-gray-700 dark:text-gray-300">${userMessage}</p>
                </div>
            `;

            // Clear input
            messageInput.value = '';

            // Simulate tutor response after a delay
            setTimeout(() => {
                document.getElementById('realTutorChat').innerHTML += `
                    <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 mr-12">
                        <p class="text-gray-700 dark:text-gray-300">Thank you for your message. As this is a simulation, I won't be able to provide a real answer. In the actual app, you would receive a response from a teacher here.</p>
                    </div>
                `;
            }, 1500);
        }
    });

    // Tutor card click handlers
    document.querySelectorAll('.tutor-card').forEach(card => {
        card.addEventListener('click', () => {
            showRealTutorChat();
        });
    });
});

tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#5D5CDE',
                    dark: '#4D4CCE'
                },
                secondary: {
                    DEFAULT: '#4CAF50',
                    dark: '#3C9F40'
                },
                southsudan: {
                    blue: '#0F47AF',
                    red: '#BF0A30',
                    green: '#006847',
                    black: '#000000',
                }
            }
        }
    }
}