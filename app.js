// Sound System (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const sounds = {
    playTone: (freq, type, duration, vol=0.1) => {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    tick: () => {
        sounds.playTone(800, 'sine', 0.05, 0.05);
        setTimeout(() => sounds.playTone(600, 'sine', 0.05, 0.02), 100);
    },
    click: () => sounds.playTone(400, 'triangle', 0.1, 0.1),
    bonus: () => {
        sounds.playTone(880, 'sine', 0.1, 0.1);
        setTimeout(() => sounds.playTone(1108, 'sine', 0.2, 0.1), 100);
        setTimeout(() => sounds.playTone(1318, 'sine', 0.3, 0.1), 200);
    },
    timesUp: () => {
        sounds.playTone(150, 'sawtooth', 0.5, 0.2);
        setTimeout(() => sounds.playTone(140, 'sawtooth', 0.8, 0.2), 150);
    },
    winRound: () => {
        sounds.playTone(523.25, 'sine', 0.1, 0.1);
        setTimeout(() => sounds.playTone(659.25, 'sine', 0.1, 0.1), 150);
        setTimeout(() => sounds.playTone(783.99, 'sine', 0.2, 0.1), 300);
        setTimeout(() => sounds.playTone(1046.50, 'sine', 0.4, 0.1), 450);
    }
};

const categories = [
    "Things that are cold", "Fictional characters", "Items in a refrigerator",
    "Things you can ride", "Superheroes", "Things that are sticky",
    "Villains", "Reasons to be late", "Things you smell",
    "Hobbies", "Fast food items", "Countries",
    "Things found in an ocean", "Things you can wear", "Musical instruments"
];

// UI Elements
const turnIndicator = document.getElementById('turn-indicator');
const startStopBtn = document.getElementById('start-stop-btn');
const timerDisplay = document.getElementById('timer-display');
const categoryDisplay = document.getElementById('category-display');
const pointsTeam1 = document.getElementById('points-team1');
const pointsTeam2 = document.getElementById('points-team2');
const distanceTeam1 = document.getElementById('distance-team1');
const distanceTeam2 = document.getElementById('distance-team2');
const bonusTeam1 = document.getElementById('bonus-team1');
const bonusTeam2 = document.getElementById('bonus-team2');
const resetBtn = document.getElementById('reset-btn');
const tutorialBtn = document.getElementById('tutorial-btn');
const wheelTrack = document.getElementById('wheel-track');

// Game State
const TRACK_LENGTH = 20;
const TOTAL_WHEEL_ITEMS = 500;
let trackLetters = [];
let bonusTokens = [];

let globalPos = 0; 
let roundStartPos = 0;
let activeTeam = 1;

let roundDistance1 = 0;
let roundDistance2 = 0;
let roundTokens1 = 0;
let roundTokens2 = 0;
let score1 = 0;
let score2 = 0;

let isRunning = false;
let timeLeft = 60;
let timerInterval;

function showModal(title, text, buttonText = "OK", onDismiss = null) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').textContent = text;
    const btn = document.getElementById('modal-btn');
    btn.textContent = buttonText;
    
    btn.onclick = () => {
        sounds.click();
        modal.classList.add('hidden');
        if(onDismiss) onDismiss();
    };
    
    modal.classList.remove('hidden');
}

function initGame() {
    score1 = 0;
    score2 = 0;
    globalPos = 0;
    roundStartPos = 0;
    
    // The actual game uses 20 unique letters and excludes Q, U, V, X, Y, Z
    let availableLetters = "ABCDEFGHIJKLMNOPRSTW".split('');
    
    // Shuffle the 20 letters to create the board
    for (let i = availableLetters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableLetters[i], availableLetters[j]] = [availableLetters[j], availableLetters[i]];
    }
    let baseTrack = availableLetters;

    trackLetters = [];
    for(let i=0; i<TOTAL_WHEEL_ITEMS; i++) {
        trackLetters.push(baseTrack[i % TRACK_LENGTH]);
    }

    buildWheelDOM();
    startNewRound();
}

function buildWheelDOM() {
    wheelTrack.innerHTML = '';
    for(let i=0; i<TOTAL_WHEEL_ITEMS; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.id = `wheel-item-${i}`;
        item.textContent = trackLetters[i];
        
        item.addEventListener('click', () => {
            if (!isRunning) return;
            if (i === globalPos + 1 || i === globalPos + 2 || i === globalPos + 3) {
                advanceChainTo(i);
            }
        });

        wheelTrack.appendChild(item);
    }
}

function startNewRound() {
    activeTeam = 1;
    roundDistance1 = 0;
    roundDistance2 = 0;
    roundTokens1 = 0;
    roundTokens2 = 0;
    globalPos = roundStartPos;

    bonusTokens = [];
    while (bonusTokens.length < 3) {
        let r = globalPos + 4 + Math.floor(Math.random() * 16); 
        if (!bonusTokens.includes(r)) {
            bonusTokens.push(r);
        }
    }

    document.querySelectorAll('.bonus-star').forEach(el => el.remove());
    bonusTokens.forEach(idx => {
        const item = document.getElementById(`wheel-item-${idx}`);
        if(item) {
            const star = document.createElement('div');
            star.className = 'bonus-star';
            star.textContent = '⭐';
            item.appendChild(star);
        }
    });

    updateTurnUI();
    renderWheel();
}

function updateTurnUI() {
    if(activeTeam === 1) {
        turnIndicator.textContent = "🏃‍♀️ Gertrude";
        turnIndicator.className = "team-name gertrude-turn";
    } else {
        turnIndicator.textContent = "🧙‍♂️ Wilfred";
        turnIndicator.className = "team-name wilfred-turn";
    }
    
    pointsTeam1.textContent = score1;
    pointsTeam2.textContent = score2;
    distanceTeam1.textContent = roundDistance1;
    distanceTeam2.textContent = roundDistance2;
    
    bonusTeam1.textContent = roundTokens1 > 0 ? `(+${roundTokens1} ⭐)` : '';
    bonusTeam2.textContent = roundTokens2 > 0 ? `(+${roundTokens2} ⭐)` : '';
}

function advanceChainTo(targetIdx) {
    if (!isRunning) return;

    sounds.click();

    let moveDist = targetIdx - globalPos;
    globalPos = targetIdx;
    
    if (activeTeam === 1) {
        roundDistance1 += moveDist;
    } else {
        roundDistance2 += moveDist;
    }

    let tokenIndex = bonusTokens.indexOf(globalPos);
    if (tokenIndex !== -1) {
        if (activeTeam === 1) roundTokens1++;
        else roundTokens2++;
        bonusTokens.splice(tokenIndex, 1);
        
        setTimeout(() => sounds.bonus(), 50);

        const item = document.getElementById(`wheel-item-${globalPos}`);
        const star = item.querySelector('.bonus-star');
        if(star) star.remove();
    }

    updateTurnUI();
    renderWheel();
}

function renderWheel() {
    wheelTrack.style.transform = `translateX(-${globalPos * 72}px)`;

    for(let i = Math.max(0, globalPos - 2); i < Math.min(TOTAL_WHEEL_ITEMS, globalPos + 6); i++) {
        const item = document.getElementById(`wheel-item-${i}`);
        if(!item) continue;
        
        item.className = 'wheel-item'; 
        
        if (i < globalPos + 1) {
            item.classList.add('upcoming-left');
        } else if (i === globalPos + 1 || i === globalPos + 2 || i === globalPos + 3) {
            item.classList.add('active-slot');
            if (!isRunning) item.style.opacity = '0.5'; 
            else item.style.opacity = '1';
        } else {
            item.classList.add('upcoming-right');
        }
    }
}

function getRandomCategory() {
    return categories[Math.floor(Math.random() * categories.length)];
}

function toggleTimer() {
    sounds.click();
    
    if (isRunning) {
        endTurn();
    } else {
        timeLeft = 60;
        timerDisplay.textContent = timeLeft;
        categoryDisplay.textContent = getRandomCategory();
        
        isRunning = true;
        startStopBtn.textContent = 'End Turn Early';
        updateTurnUI();
        renderWheel();
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            sounds.tick();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endTurn(true);
            }
        }, 1000);
    }
}

function endTurn(isTimeUp = false) {
    if(timerInterval) clearInterval(timerInterval);
    isRunning = false;
    startStopBtn.textContent = 'Start Turn';
    categoryDisplay.textContent = "Wait for turn...";
    updateTurnUI();
    renderWheel(); 
    
    if (isTimeUp) {
        sounds.timesUp();
    }

    if (activeTeam === 1) {
        activeTeam = 2;
        globalPos = roundStartPos; 
        updateTurnUI();
        renderWheel();
        
        if (isTimeUp) {
            showModal("Time's up!", "Gertrude's turn is over.\nWilfred will now start from the SAME spot Gertrude started this round.");
        }
    } else {
        setTimeout(endRound, 500);
    }
}

function endRound() {
    sounds.winRound();
    let winnerMsg = "";
    if (roundDistance1 > roundDistance2) {
        score1 += 1 + roundTokens1;
        winnerMsg = "Gertrude won the round!";
    } else if (roundDistance2 > roundDistance1) {
        score2 += 1 + roundTokens2;
        winnerMsg = "Wilfred won the round!";
    } else {
        winnerMsg = "It's a tie! No points awarded.";
    }

    roundStartPos = globalPos;

    if (typeof confetti === "function" && winnerMsg !== "It's a tie! No points awarded.") {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 10001
        });
    }

    showModal("Round Over!", `${winnerMsg}\n\nGertrude went ${roundDistance1} spaces.\nWilfred went ${roundDistance2} spaces.\n\nNext round starts from this position.`, "Next Round", () => {
        if (score1 >= 12 || score2 >= 12) {
            let champ = score1 >= 12 ? "Gertrude" : "Wilfred";
            
            if (typeof confetti === "function") {
                let duration = 3000;
                let animationEnd = Date.now() + duration;
                let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

                let interval = setInterval(function() {
                    let timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }
                    let particleCount = 50 * (timeLeft / duration);
                    confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
                }, 250);
            }

            showModal("🏆 GAME OVER!", `${champ} wins the game!`, "Play Again", initGame);
        } else {
            startNewRound();
        }
    });
}

// Events
startStopBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', () => {
    sounds.click();
    if(timerInterval) clearInterval(timerInterval);
    isRunning = false;
    startStopBtn.textContent = 'Start Turn';
    categoryDisplay.textContent = "Wait for turn...";
    initGame();
});

const tutorialSteps = [
    { text: "Welcome to Really Loud Librarians!\n\nFirst, divide into two teams. One team will be Gertrude 🏃‍♀️ and the other will be Wilfred 🧙‍♂️.\n\nThis app is your digital game board!", highlight: null },
    { text: "1. Start your turn!\n\nWhen you press 'Start Turn', you'll be given a category and your 60-second timer will begin.", highlight: ".timer-box" },
    { text: "2. The Category\n\nYour team must shout out words that fit the category displayed here...", highlight: ".category-box" },
    { text: "3. The Chain (Letters)\n\n...AND the word must start with one of the 3 highlighted letters in the green box!\n\nIf the letters are S, B, C, and the category is 'Cold Things', you could shout 'SNOW' and click 'S'.", highlight: ".wheel-container" },
    { text: "4. Moving Forward\n\nClicking a letter advances your team to that letter. If you use the 3rd letter, you jump 3 spaces! The further the letter, the faster you move.", highlight: ".action-section" },
    { text: "5. Bonus Stars ⭐\n\nSee a ⭐? Land on it or pass it to collect bonus points for the end of the round.", highlight: ".wheel-container" },
    { text: "6. Passing the Baton\n\nWhen your 60 seconds run out, your turn ends. The OTHER team picks up from the exact spot you left off!", highlight: ".turn-box" },
    { text: "7. Winning the Round\n\nWhoever travels the furthest distance during their 60 seconds wins the round and gets 1 point. First to 12 points wins the whole game!", highlight: ".bottom-stats" },
    { text: "You are ready to play!!\n\nHit 'Got it!' and click 'Start Turn' to begin the chaos.", highlight: "#start-stop-btn" }
];

let currentTutorialStep = 0;
const tutorialOverlay = document.getElementById('tutorial-overlay');

function clearTutorialHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
}

function renderTutorialStep() {
    clearTutorialHighlights();
    
    let step = tutorialSteps[currentTutorialStep];
    if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) el.classList.add('tutorial-highlight');
    }

    let btnText = currentTutorialStep < tutorialSteps.length - 1 ? "Next ➔" : "Got it!";
    
    showModal("How to Play", step.text, btnText, () => {
        if (currentTutorialStep < tutorialSteps.length - 1) {
            currentTutorialStep++;
            setTimeout(renderTutorialStep, 50); 
        } else {
            clearTutorialHighlights();
            tutorialOverlay.classList.add('hidden');
        }
    });
}

tutorialBtn.addEventListener('click', () => {
    sounds.click();
    currentTutorialStep = 0;
    tutorialOverlay.classList.remove('hidden');
    renderTutorialStep();
});

// Start
initGame();
