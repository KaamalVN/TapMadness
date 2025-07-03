import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js"; // optional

const firebaseConfig = {
    apiKey: "AIzaSyBK1CJlZacBh2DIPucvKQmqIqoLI3rvxgE",
    authDomain: "taptest-4249f.firebaseapp.com",
    databaseURL: "https://taptest-4249f-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "taptest-4249f",
    storageBucket: "taptest-4249f.appspot.com",
    messagingSenderId: "566703104816",
    appId: "1:566703104816:web:1d5d8059fccebf858c5ef5",
    measurementId: "G-SGFZW2F5FV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// const analytics = getAnalytics(app); // optional

// Game State
let challenge = {
    status: 'loading',
    goal: 1000000,
    counter: 0,
    start_time: null,
    end_time: null,
    challenge_id: null
};
let userTaps = 0;
let username = '';
let userStreak = 0;
let streakTimeout;
let tapsPerSecond = 0;
let tapTimes = [];
let isConnected = false;

// DOM Elements
const loader = document.getElementById('loader');
const gameScreen = document.getElementById('gameScreen');
const waitingScreen = document.getElementById('waitingScreen');
const victoryScreen = document.getElementById('victoryScreen');
const challengeStatus = document.getElementById('challengeStatus');
const challengeGoal = document.getElementById('challengeGoal');
const challengeTimer = document.getElementById('challengeTimer');
const globalCounterEl = document.getElementById('globalCounter');
const tapButton = document.getElementById('tapButton');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const usernameEl = document.getElementById('username');
const userTapsEl = document.getElementById('userTaps');
const tapsPerSecondEl = document.getElementById('tapsPerSecond');
const totalParticipantsEl = document.getElementById('totalParticipants');
const timeElapsedEl = document.getElementById('timeElapsed');
const userStreakEl = document.getElementById('userStreak');
const messageDisplay = document.getElementById('messageDisplay');
const leaderboardList = document.getElementById('leaderboardList');
const celebration = document.getElementById('celebration');
const statusText = document.getElementById('statusText');

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Username Generation
const adjectives = ['Sneaky', 'Tappy', 'Crazy', 'Epic', 'Mega', 'Super', 'Hyper', 'Turbo', 'Ninja', 'Cosmic'];
const nouns = ['Monkey', 'Broskie', 'Ghost', 'Warrior', 'Master', 'Legend', 'Beast', 'Hero', 'Champion', 'Wizard'];

function generateUsername() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${noun}${num}`;
}

function initUser() {
    // Check if challenge ID has changed (reset scenario)
    const storedChallengeId = localStorage.getItem('tapmadness_challenge_id');
    if (storedChallengeId && storedChallengeId !== challenge.challenge_id) {
        // Challenge was reset, clear local storage
        localStorage.removeItem('tapmadness_username');
        localStorage.removeItem('tapmadness_user_taps');
        localStorage.removeItem('tapmadness_challenge_id');
    }

    username = localStorage.getItem('tapmadness_username');
    if (!username) {
        username = generateUsername();
        localStorage.setItem('tapmadness_username', username);
    }
    usernameEl.textContent = username;

    userTaps = parseInt(localStorage.getItem('tapmadness_user_taps') || '0');
    userTapsEl.textContent = userTaps.toLocaleString();

    // Store current challenge ID
    if (challenge.challenge_id) {
        localStorage.setItem('tapmadness_challenge_id', challenge.challenge_id);
    }
}

// Connection monitoring
function setupConnectionMonitoring() {
    const connectedRef = ref(db, '.info/connected');
    onValue(connectedRef, (snapshot) => {
        isConnected = snapshot.val();
        if (isConnected) {
            statusText.textContent = 'ONLINE';
            statusText.className = 'status-online';
        } else {
            statusText.textContent = 'OFFLINE';
            statusText.className = 'status-offline';
        }
    });
}

// Firebase Listeners
function setupFirebaseListeners() {
    // Challenge listener
    onValue(ref(db, 'challenge'), (snapshot) => {
        const challengeData = snapshot.val();
        if (!challengeData) {
            showWaitingScreen();
            return;
        }

        const oldStatus = challenge.status;
        challenge = { ...challenge, ...challengeData };

        // Ensure username is initialized after challenge is loaded
        initUser();

        // Handle status changes
        if (oldStatus !== challenge.status) {
            handleStatusChange(challenge.status);
        }

        updateChallengeDisplay();
        updateCounter();
    });

    // Users listener
    onValue(ref(db, 'users'), (snapshot) => {
        const users = snapshot.val() || {};
        totalParticipantsEl.textContent = Object.keys(users).length;
        updateLeaderboard(users);
    });

    // Broadcast listener
    onValue(ref(db, 'broadcast'), (snapshot) => {
        const broadcast = snapshot.val();
        if (broadcast && broadcast.message && broadcast.timestamp) {
            showMessage(`📢 ${broadcast.message}`);
        }
    });
}

function handleStatusChange(status) {
    switch (status) {
        case 'active':
            showGameScreen();
            tapButton.disabled = false;
            challengeStatus.className = 'challenge-status status-active';
            break;
        case 'completed':
            tapButton.disabled = true;
            challengeStatus.className = 'challenge-status status-completed';
            setTimeout(() => showVictoryScreen(), 2000);
            break;
        case 'reset':
            // Clear local storage and reload
            localStorage.removeItem('tapmadness_username');
            localStorage.removeItem('tapmadness_user_taps');
            localStorage.removeItem('tapmadness_challenge_id');
            showMessage('Challenge has been reset!');
            setTimeout(() => location.reload(), 2000);
            break;
        default:
            showWaitingScreen();
    }
}

function showGameScreen() {
    gameScreen.style.display = 'block';
    waitingScreen.classList.remove('show');
    victoryScreen.classList.remove('show');
}

function showWaitingScreen() {
    gameScreen.style.display = 'none';
    waitingScreen.classList.add('show');
    victoryScreen.classList.remove('show');
}

function showVictoryScreen() {
    const timeTaken = challenge.end_time - challenge.start_time;
    const hours = Math.floor(timeTaken / 3600000);
    const minutes = Math.floor((timeTaken % 3600000) / 60000);
    const seconds = Math.floor((timeTaken % 60000) / 1000);

    document.getElementById('victoryTime').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('victoryTaps').textContent = challenge.counter.toLocaleString();
    document.getElementById('victoryTappers').textContent = totalParticipantsEl.textContent;

    // Get final leaderboard
    onValue(ref(db, 'users'), (snapshot) => {
        const users = snapshot.val() || {};
        const sortedUsers = Object.entries(users)
            .sort(([,a], [,b]) => b.taps - a.taps)
            .slice(0, 10);

        let leaderboardHTML = '';
        sortedUsers.forEach(([user, data], index) => {
            const isCurrentUser = user === username;
            leaderboardHTML += `
                <div style="display: flex; justify-content: space-between; padding: 5px; ${isCurrentUser ? 'color: #ff0080; font-weight: bold;' : ''}">
                    <span>#${index + 1} ${user}</span>
                    <span>${data.taps.toLocaleString()}</span>
                </div>
            `;
        });

        document.getElementById('victoryLeaderboardList').innerHTML = leaderboardHTML;
    });

    victoryScreen.classList.add('show');
    createCelebration();
}

function updateChallengeDisplay() {
    challengeGoal.textContent = `Goal: ${challenge.goal.toLocaleString()} taps`;
    progressText.textContent = `Progress to ${challenge.goal.toLocaleString()}`;
    
    if (challenge.start_time) {
        const elapsed = (challenge.end_time || Date.now()) - challenge.start_time;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        challengeTimer.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateCounter() {
    globalCounterEl.textContent = challenge.counter.toLocaleString();
    const progress = Math.min((challenge.counter / challenge.goal) * 100, 100);
    progressFill.style.width = progress + '%';

    // Check for milestones
    checkMilestones();
}

function checkMilestones() {
    const milestones = {
        1000: "1K TAPS! 🎉",
        5000: "5K BROSKIES! 🔥",
        10000: "10K MADNESS! 💥",
        25000: "25K INSANITY! ⚡",
        50000: "50K LEGENDS! 🚀",
        69420: "NICE! 😎🔥",
        100000: "100K BROSKIES! 🎊",
        250000: "QUARTER MILLION! 💪",
        500000: "HALFWAY THERE! 🌟",
        750000: "THREE QUARTERS! 🎯"
    };

    if (milestones[challenge.counter]) {
        showMessage(milestones[challenge.counter]);
        createCelebration();
    }
}

function showMessage(text) {
    messageDisplay.textContent = text;
    messageDisplay.classList.add('show');
    setTimeout(() => {
        messageDisplay.classList.remove('show');
    }, 3000);
}

function createFloatingEmoji(x, y) {
    const emojis = ['💥', '👊', '⚡', '🔥', '💪', '🚀', '⭐', '💫'];
    const emoji = document.createElement('div');
    emoji.className = 'floating-emoji';
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.left = x + 'px';
    emoji.style.top = y + 'px';
    document.body.appendChild(emoji);

    setTimeout(() => {
        emoji.remove();
    }, 2000);
}

function createCelebration() {
    const confettiCount = window.innerWidth < 768 ? 20 : 30;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = ['#ff0080', '#00ff00', '#00ffff', '#ffff00'][Math.floor(Math.random() * 4)];
            celebration.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 100);
    }
}

function updateTapsPerSecond() {
    const now = Date.now();
    tapTimes = tapTimes.filter(time => now - time < 1000);
    tapsPerSecond = tapTimes.length;
    tapsPerSecondEl.textContent = tapsPerSecond;
}

function updateTimeElapsed() {
    if (!challenge.start_time) return;
    
    const elapsed = (challenge.end_time || Date.now()) - challenge.start_time;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timeElapsedEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateLeaderboard(users) {
    const sortedUsers = Object.entries(users)
        .filter(([user, data]) => data && typeof data.taps === 'number')
        .sort(([,a], [,b]) => b.taps - a.taps)
        .slice(0, 10);

    leaderboardList.innerHTML = '';
    
    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-item"><span>No tappers yet...</span><span>0</span></div>';
        return;
    }

    sortedUsers.forEach(([user, data], index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        if (user === username) {
            item.classList.add('current-user');
        }
        item.innerHTML = `
            <span>#${index + 1} ${user}</span>
            <span>${data.taps ? data.taps.toLocaleString() : '0'}</span>
        `;
        leaderboardList.appendChild(item);
    });
}

// Share Functions
function shareToReddit() {
    const text = `🔥 Just completed the TAP MADNESS challenge! We reached ${challenge.counter.toLocaleString()} taps together in ${document.getElementById('victoryTime').textContent}! Join the next challenge!`;
    const url = `https://reddit.com/submit?title=${encodeURIComponent('TAP MADNESS Challenge Completed!')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function shareToWhatsApp() {
    const text = `🔥 TAP MADNESS COMPLETED! 🔥\n\nWe reached ${challenge.counter.toLocaleString()} taps together!\nTime: ${document.getElementById('victoryTime').textContent}\n\nJoin the next challenge: ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showMessage('Link copied to clipboard! 📋');
    }).catch(() => {
        showMessage('Could not copy link 😅');
    });
}

// Tap Handler
tapButton.addEventListener('click', handleTap);
tapButton.addEventListener('touchstart', handleTap, { passive: true });

function handleTap(event) {
    event.preventDefault();
    
    if (!isConnected || challenge.status !== 'active') {
        if (!isConnected) {
            showMessage('OFFLINE - Reconnecting...');
        } else {
            showMessage('Challenge not active!');
        }
        return;
    }

    // Update global counter
    update(ref(db, 'challenge/counter'), (current) => {
        return (current || 0) + 1;
    });

    // Update user data
    userTaps++;
    userTapsEl.textContent = userTaps.toLocaleString();
    localStorage.setItem('tapmadness_user_taps', userTaps.toString());

    // Write user object atomically to comply with Firebase rules
    set(ref(db, `users/${username}`), {
        taps: userTaps,
        joined: Date.now(),
        lastActive: Date.now()
    });

    // Update streak
    userStreak++;
    userStreakEl.textContent = userStreak;
    clearTimeout(streakTimeout);
    streakTimeout = setTimeout(() => {
        userStreak = 0;
        userStreakEl.textContent = userStreak;
    }, 2000);

    // Show combo message
    if (userStreak > 5 && userStreak % 5 === 0) {
        showMessage(`COMBO x${userStreak}! 🔥`);
    }

    // Update taps per second
    tapTimes.push(Date.now());
    updateTapsPerSecond();

    // Create floating emoji at tap position
    let x, y;
    if (event.type === 'touchstart' && event.touches && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else if (event.clientX !== undefined) {
        x = event.clientX;
        y = event.clientY;
    } else {
        const rect = tapButton.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }
    
    createFloatingEmoji(x, y);

    // Random funny messages
    const funnyMessages = [
        "Chill bro...",
        "You broke the tap!",
        "Broskie on fire 🔥",
        "TAP MASTER!",
        "UNSTOPPABLE!",
        "GOING CRAZY!",
        "MADNESS MODE!",
        "LEGENDARY TAPPER!"
    ];

    if (Math.random() < 0.08) {
        showMessage(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);
    }
}

// Initialize
function init() {
    setTimeout(() => {
        loader.classList.add('hidden');
        setupConnectionMonitoring();
        setupFirebaseListeners();
        setInterval(updateTimeElapsed, 1000);
        setInterval(updateTapsPerSecond, 100);
        showMessage('TAP MADNESS LOADED! 🚀');
    }, 4000);
}

init();