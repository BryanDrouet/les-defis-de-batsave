const CHARACTERS = ['Mario', 'Luigi', 'Wario', 'Yoshi'];
const START_TIME = 10;
const TIME_BONUS = 5;
const DARK_MODE_LEVEL = 5;
const MAX_LIGHT_RADIUS = 500; 
const MIN_LIGHT_RADIUS = 70;  
const LIGHT_SHRINK_STEP = 40; 

const params = new URLSearchParams(window.location.search);
const isDebug = params.get('debug') === 'true';
const isTorchEnabled = params.get('torch') !== 'false';

const audio = {
    caught: [
        new Audio('assets/audio/luigiCaught1.wav'),
        new Audio('assets/audio/luigiCaught2.wav'),
        new Audio('assets/audio/luigiCaught3.wav')
    ],
    wrong: new Audio('assets/audio/luigiWrong.wav'),
    timeup: new Audio('assets/audio/luigiTimeup.wav'),
    music: new Audio('assets/audio/music.wav')
};
audio.music.loop = true;
audio.music.volume = 0.3;

let score = 0;
let level = 1;
let timeLeft = START_TIME;
let timerInterval = null;
let currentTarget = '';
let isPlaying = false;

const board = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const targetImg = document.getElementById('target-img');
const shadowOverlay = document.getElementById('shadow-overlay');
const overlayScreen = document.getElementById('overlay-screen');
const overlayTitle = document.getElementById('overlay-title');
const warningText = document.getElementById('warning-text');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const uiBar = document.querySelector('.ui-bar');
const timerBox = document.querySelector('.timer-box');

if (isDebug && timerBox) {
    timerBox.style.opacity = '0';
}

const saveGame = () => {
    if(!isPlaying) return;
    localStorage.setItem('wanted_current_session', JSON.stringify({ score, level, timeLeft }));
};

const loadSession = () => {
    const session = localStorage.getItem('wanted_current_session');
    if (session) {
        const data = JSON.parse(session);
        score = data.score;
        level = data.level;
        timeLeft = data.timeLeft;
        return true;
    }
    return false;
};

const updateBestScore = () => {
    const best = localStorage.getItem('wanted_best_score') || 0;
    if (score > best) {
        localStorage.setItem('wanted_best_score', score);
    }
};

function updateFlashlight(x, y) {
    if (level >= DARK_MODE_LEVEL && isPlaying && isTorchEnabled) {
        const uiHeight = uiBar.offsetHeight;
        shadowOverlay.style.setProperty('--x', `${x}px`);
        shadowOverlay.style.setProperty('--y', `${y - uiHeight}px`);
    }
}

document.addEventListener('mousemove', (e) => {
    const rect = document.querySelector('.game-container').getBoundingClientRect();
    updateFlashlight(e.clientX - rect.left, e.clientY - rect.top);
});

document.addEventListener('touchmove', (e) => {
    const rect = document.querySelector('.game-container').getBoundingClientRect();
    const touch = e.touches[0];
    updateFlashlight(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: true });

function startGame(isResume = false) {
    if (!isResume) {
        score = 0;
        level = 1;
        timeLeft = START_TIME;
        localStorage.removeItem('wanted_current_session');
    }
    
    isPlaying = true;
    uiBar.classList.remove('hidden');
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    overlayScreen.classList.add('hidden');
    
    warningText.classList.add('hidden');
    
    audio.music.currentTime = 0;
    audio.music.play().catch(() => {});

    startLevel();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isDebug) timeLeft--;
        timerEl.textContent = timeLeft;
        timerEl.style.color = timeLeft <= 5 ? '#ff5454' : '#00d512';
        
        saveGame();

        if (timeLeft <= 0) gameOver();
    }, 1000);
}

function startLevel() {
    board.innerHTML = '';
    
    let totalCharacters = 4; 
    if (level >= 3) totalCharacters = 9;
    if (level >= 6) totalCharacters = 16;
    if (level >= 10) totalCharacters = 25;
    if (level >= 15) totalCharacters = 36;
    if (level >= 20) totalCharacters = 49;

    let cols = Math.ceil(Math.sqrt(totalCharacters));
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${Math.ceil(totalCharacters / cols)}, 1fr)`;
    
    if (level >= DARK_MODE_LEVEL && isTorchEnabled) {
        shadowOverlay.classList.add('active');
        shadowOverlay.classList.remove('hidden');
         
        const darkLevelsPassed = level - DARK_MODE_LEVEL;
        
        let newRadius = Math.max(MAX_LIGHT_RADIUS - (darkLevelsPassed * LIGHT_SHRINK_STEP), MIN_LIGHT_RADIUS);
        shadowOverlay.style.setProperty('--radius', `${newRadius}px`);
        
        let newOpacity = Math.min(0.85 + (darkLevelsPassed * 0.05), 0.98); 
        
        shadowOverlay.style.setProperty('--opacity', newOpacity);
        
    } else {
        shadowOverlay.classList.remove('active');
        shadowOverlay.style.setProperty('--opacity', 0);
    }

    currentTarget = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    targetImg.src = `assets/img/wanted${currentTarget}.png`;

    const targetIndex = Math.floor(Math.random() * totalCharacters);

    for (let i = 0; i < totalCharacters; i++) {
        const img = document.createElement('img');
        img.classList.add('character');
        img.setAttribute('draggable', false);
        
        if (i === targetIndex) {
            img.src = `assets/img/sprite${currentTarget}.png`;
            img.dataset.type = 'target';
        } else {
            let distractor;
            do { distractor = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]; } 
            while (distractor === currentTarget);
            img.src = `assets/img/sprite${distractor}.png`;
            img.dataset.type = 'wrong';
        }

        img.addEventListener('pointerdown', handleCharacterClick);
        board.appendChild(img);
    }
}

function handleCharacterClick(e) {
    if (!isPlaying) return;
    if (e.target.dataset.type === 'target') {
        audio.caught[Math.floor(Math.random() * audio.caught.length)].play();
        score++;
        scoreEl.textContent = score;
        timeLeft = Math.min(timeLeft + TIME_BONUS, 30);
        level++;
        saveGame();
        startLevel();
    } else {
        audio.wrong.play();
        timeLeft = Math.max(0, timeLeft - 3);
        timerEl.classList.add('shake');
        setTimeout(() => timerEl.classList.remove('shake'), 200);
        if (timeLeft <= 0) gameOver();
    }
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerInterval);
    updateBestScore();
    localStorage.removeItem('wanted_current_session');
    
    audio.music.pause();
    audio.timeup.play();
    uiBar.classList.add('hidden');
    
    overlayTitle.textContent = "GAME OVER";
    const best = localStorage.getItem('wanted_best_score') || 0;
    document.getElementById('overlay-desc').innerHTML = `Score : ${score}<br><small>Record : ${best}</small>`;
    
    warningText.classList.add('hidden');
    startBtn.textContent = "REJOUER";
    resetBtn.classList.add('hidden'); 
    
    overlayScreen.classList.remove('hidden');
    shadowOverlay.classList.remove('active');
}

window.onload = () => {
    const hasSession = loadSession();
    
    if (hasSession) {
        overlayTitle.textContent = "SESSION REPRISE";
        document.getElementById('overlay-desc').textContent = `Niveau ${level} - Score ${score}`;
        warningText.classList.add('hidden');
        
        startBtn.textContent = "CONTINUER";
        resetBtn.classList.remove('hidden');
    } else {
        overlayTitle.textContent = "WANTED!";
        warningText.classList.remove('hidden');
        startBtn.textContent = "COMMENCER";
        resetBtn.classList.add('hidden');
    }
};

startBtn.addEventListener('click', () => {
    const hasSession = localStorage.getItem('wanted_current_session') !== null;
    startGame(hasSession);
});

resetBtn.addEventListener('click', () => {
    if(confirm("Voulez-vous vraiment recommencer à zéro ?")) {
        startGame(false);
    }
});

startBtn.addEventListener('click', () => startGame(loadSession()));