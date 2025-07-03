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

// Admin State
let challenge = {
    status: 'inactive',
    goal: 1000000,
    counter: 0,
    start_time: null,
    end_time: null,
    challenge_id: null
};
let adminStats = {
    totalUsers: 0,
    activeUsers: 0,
    currentTPS: 0,
    peakTPS: 0
};
let isConnected = false;
let tpsHistory = [];

// DOM Elements
const statusText = document.getElementById('statusText');
const challengeStatusEl = document.getElementById('challengeStatus');
const currentGoalEl = document.getElementById('currentGoal');
const currentCounterEl = document.getElementById('currentCounter');
const progressPercentEl = document.getElementById('progressPercent');
const totalUsersEl = document.getElementById('totalUsers');
const activeUsersEl = document.getElementById('activeUsers');
const currentTPSEl = document.getElementById('currentTPS');
const peakTPSEl = document.getElementById('peakTPS');
const activityLog = document.getElementById('activityLog');
const liveLeaderboard = document.getElementById('liveLeaderboard');
const broadcastMessage = document.getElementById('broadcastMessage');
const messagePreview = document.getElementById('message-preview');
const newGoalInput = document.getElementById('newGoal');
const challengeIdInput = document.getElementById('challengeId');

// Utility Functions
function logActivity(message) {
    const timestamp = new Date().toLocaleTimeString();
    activityLog.innerHTML += `[${timestamp}] ${message}<br>`;
    activityLog.scrollTop = activityLog.scrollHeight;
}

function generateChallengeId() {
    return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateStatusIndicator(status) {
    const indicator = challengeStatusEl.querySelector('.status-indicator');
    indicator.className = 'status-indicator';
    
    switch (status) {
        case 'active':
            indicator.classList.add('status-active');
            challengeStatusEl.innerHTML = '<span class="status-indicator status-active"></span>ACTIVE';
            break;
        case 'completed':
            indicator.classList.add('status-completed');
            challengeStatusEl.innerHTML = '<span class="status-indicator status-completed"></span>COMPLETED';
            break;
        case 'reset':
            indicator.classList.add('status-reset');
            challengeStatusEl.innerHTML = '<span class="status-indicator status-reset"></span>RESET';
            break;
        default:
            indicator.classList.add('status-inactive');
            challengeStatusEl.innerHTML = '<span class="status-indicator status-inactive"></span>INACTIVE';
    }
}

// Firebase Listeners
function setupFirebaseListeners() {
    // Connection monitoring
    onValue(ref(db, '.info/connected'), (snapshot) => {
        isConnected = snapshot.val();
        if (isConnected) {
            statusText.textContent = 'ONLINE';
            statusText.className = 'status-online';
            logActivity('🟢 Connection established');
        } else {
            statusText.textContent = 'OFFLINE';
            statusText.className = 'status-offline';
            logActivity('🔴 Connection lost');
        }
    });

    // Challenge listener
    onValue(ref(db, 'challenge'), (snapshot) => {
        const challengeData = snapshot.val();
        if (challengeData) {
            const oldStatus = challenge.status;
            challenge = { ...challenge, ...challengeData };
            
            if (oldStatus !== challenge.status) {
                logActivity(`📊 Challenge status changed: ${oldStatus} → ${challenge.status}`);
            }
            
            updateChallengeDisplay();
        } else {
            challenge = {
                status: 'inactive',
                goal: 1000000,
                counter: 0,
                start_time: null,
                end_time: null,
                challenge_id: null
            };
            updateChallengeDisplay();
        }
    });

    // Users listener
    onValue(ref(db, 'users'), (snapshot) => {
        const users = snapshot.val() || {};
        const userCount = Object.keys(users).length;
        
        // Count active users (last active within 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const activeUsers = Object.values(users).filter(user => 
            user.lastActive && user.lastActive > fiveMinutesAgo
        ).length;

        adminStats.totalUsers = userCount;
        adminStats.activeUsers = activeUsers;
        
        updateStatsDisplay();
        updateLeaderboard(users);
    });

    // TPS monitoring
    let lastCounter = 0;
    setInterval(() => {
        const currentTPS = Math.max(0, challenge.counter - lastCounter);
        lastCounter = challenge.counter;
        
        adminStats.currentTPS = currentTPS;
        if (currentTPS > adminStats.peakTPS) {
            adminStats.peakTPS = currentTPS;
            if (currentTPS > 10) {
                logActivity(`🔥 New peak TPS: ${currentTPS}`);
            }
        }
        
        updateStatsDisplay();
    }, 1000);
}

function updateChallengeDisplay() {
    updateStatusIndicator(challenge.status);
    currentGoalEl.textContent = challenge.goal.toLocaleString();
    currentCounterEl.textContent = challenge.counter.toLocaleString();
    
    const progress = challenge.goal > 0 ? ((challenge.counter / challenge.goal) * 100).toFixed(1) : 0;
    progressPercentEl.textContent = progress + '%';
    
    if (challenge.challenge_id) {
        challengeIdInput.value = challenge.challenge_id;
    }
}

function updateStatsDisplay() {
    totalUsersEl.textContent = adminStats.totalUsers;
    activeUsersEl.textContent = adminStats.activeUsers;
    currentTPSEl.textContent = adminStats.currentTPS;
    peakTPSEl.textContent = adminStats.peakTPS;
}

function updateLeaderboard(users) {
    const sortedUsers = Object.entries(users)
        .sort(([,a], [,b]) => b.taps - a.taps)
        .slice(0, 20);

    let leaderboardHTML = '';
    if (sortedUsers.length === 0) {
        leaderboardHTML = '<div style="text-align: center; color: #666;">No users yet...</div>';
    } else {
        sortedUsers.forEach(([user, data], index) => {
            const isActive = data.lastActive && (Date.now() - data.lastActive) < 300000; // 5 minutes
            const statusIcon = isActive ? '🟢' : '🔴';
            leaderboardHTML += `
                <div class="leaderboard-item">
                    <span>#${index + 1} ${statusIcon} ${user}</span>
                    <span>${data.taps.toLocaleString()}</span>
                </div>
            `;
        });
    }

    liveLeaderboard.innerHTML = leaderboardHTML;
}

// Admin Functions
function startNewChallenge() {
    const goal = parseInt(newGoalInput.value);
    if (!goal || goal < 1000) {
        alert('Please enter a valid goal (minimum 1,000)');
        return;
    }

    if (challenge.status === 'active') {
        if (!confirm('A challenge is currently active. Start a new one anyway?')) {
            return;
        }
    }

    const challengeId = generateChallengeId();
    const challengeData = {
        status: 'active',
        goal: goal,
        counter: 0,
        start_time: Date.now(),
        end_time: null,
        challenge_id: challengeId
    };

    set(ref(db, 'challenge'), challengeData).then(() => {
        // Clear users for new challenge
        set(ref(db, 'users'), {});
        logActivity(`🚀 New challenge started! Goal: ${goal.toLocaleString()}, ID: ${challengeId}`);
    }).catch((error) => {
        logActivity(`❌ Error starting challenge: ${error.message}`);
    });
}

function completeChallenge() {
    if (challenge.status !== 'active') {
        alert('No active challenge to complete');
        return;
    }

    set(ref(db, 'challenge/status'), 'completed').then(() => {
        logActivity(`🏁 Challenge completed! Final count: ${challenge.counter.toLocaleString()}`);
    }).catch((error) => {
        logActivity(`❌ Error completing challenge: ${error.message}`);
    });
}

function resetChallenge() {
    if (!confirm('⚠️ WARNING: This will completely reset the challenge!\n\nThis action will:\n- Set status to reset\n- Clear all user data\n- Reset counters\n\nAre you absolutely sure?')) {
        return;
    }

    // Set status to reset first (this triggers client-side cleanup)
    set(ref(db, 'challenge/status'), 'reset').then(() => {
        // Wait a moment for clients to react, then clear everything
        setTimeout(() => {
            set(ref(db, 'challenge'), null);
            set(ref(db, 'users'), {});
            set(ref(db, 'broadcast'), null);
            
            // Reset admin stats
            adminStats = {
                totalUsers: 0,
                activeUsers: 0,
                currentTPS: 0,
                peakTPS: 0
            };
            
            updateStatsDisplay();
            logActivity('🔄 Challenge completely reset - all data cleared');
        }, 2000);
    }).catch((error) => {
        logActivity(`❌ Error resetting challenge: ${error.message}`);
    });
}

function sendBroadcast() {
    const message = broadcastMessage.value.trim();
    if (!message) {
        alert('Please enter a message to broadcast');
        return;
    }

    set(ref(db, 'broadcast'), {
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        sender: 'ADMIN'
    }).then(() => {
        broadcastMessage.value = '';
        messagePreview.style.display = 'none';
        logActivity(`📢 Broadcast sent: "${message}"`);
    }).catch((error) => {
        logActivity(`❌ Error sending broadcast: ${error.message}`);
    });
}

function quickBroadcast(message) {
    broadcastMessage.value = message;
    sendBroadcast();
}

function exportData() {
    onValue(ref(db), (snapshot) => {
        const data = snapshot.val();
        const exportData = {
            challenge: data.challenge || {},
            users: data.users || {},
            stats: adminStats,
            exportTime: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tap-madness-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        logActivity('💾 Data exported successfully');
    }).catch((error) => {
        logActivity(`❌ Error exporting data: ${error.message}`);
    });
}

function clearLog() {
    activityLog.innerHTML = '[SYSTEM] Activity log cleared...<br>';
}

// Event Listeners
broadcastMessage.addEventListener('input', (e) => {
    const message = e.target.value.trim();
    if (message) {
        messagePreview.textContent = `📢 ${message}`;
        messagePreview.style.display = 'block';
    } else {
        messagePreview.style.display = 'none';
    }
});

// Initialize
function init() {
    logActivity('🔧 Admin dashboard initializing...');
    setupFirebaseListeners();
    
    // Update displays every 5 seconds
    setInterval(() => {
        updateStatsDisplay();
    }, 5000);
    
    logActivity('✅ Admin dashboard ready');
}

init();

// Expose admin functions to the global window object
window.startNewChallenge = startNewChallenge;
window.completeChallenge = completeChallenge;
window.resetChallenge = resetChallenge;
window.exportData = exportData;
window.sendBroadcast = sendBroadcast;
window.quickBroadcast = quickBroadcast;
window.clearLog = clearLog;