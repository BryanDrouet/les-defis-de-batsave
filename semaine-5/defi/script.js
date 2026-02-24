const CHARACTERS = ['Mario', 'Luigi', 'Wario', 'Yoshi'];
const START_TIME = 10;
const TIME_BONUS = 5;
const DARK_MODE_LEVEL = 5;

const MAX_LIGHT_RADIUS = 350; 
const MIN_LIGHT_RADIUS = 70;  
const LIGHT_SHRINK_STEP = 30; 

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
const startBtn = document.getElementById('start-btn');

const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';
const uiBar = document.querySelector('.ui-bar');
const timerBox = document.querySelector('.timer-box');

if (isDebug && timerBox) {
    timerBox.style.opacity = '0';
}

function updateFlashlight(x, y) {
    if (level >= DARK_MODE_LEVEL && isPlaying) {
        const uiHeight = uiBar.offsetHeight;
        shadowOverlay.style.setProperty('--x', `${x}px`);
        shadowOverlay.style.setProperty('--y', `${y - uiHeight}px`);
    }
}

document.addEventListener('mousemove', (e) => {
    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    updateFlashlight(e.clientX - rect.left, e.clientY - rect.top);
});

document.addEventListener('touchmove', (e) => {
    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    updateFlashlight(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: true });

function startGame() {
    score = 0;
    level = 1;
    timeLeft = START_TIME;
    isPlaying = true;
    
    uiBar.classList.remove('hidden');
    
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    overlayScreen.classList.add('hidden');
    shadowOverlay.classList.remove('active');
    
    audio.music.currentTime = 0;
    audio.music.play().catch(e => console.log("Audio autoplay bloqué", e));

    startLevel();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isDebug) {
            timeLeft--;
        }
        
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerEl.style.color = 'red';
        } else {
            timerEl.style.color = '#b30000';
        }
        
        if (timeLeft <= 0) {
            gameOver();
        }
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
    
    if (level >= DARK_MODE_LEVEL) {
        shadowOverlay.classList.add('active');
        const darkLevelsPassed = level - DARK_MODE_LEVEL;
        let newRadius = MAX_LIGHT_RADIUS - (darkLevelsPassed * LIGHT_SHRINK_STEP);
        newRadius = Math.max(newRadius, MIN_LIGHT_RADIUS);
        shadowOverlay.style.setProperty('--radius', `${newRadius}px`);
    } else {
        shadowOverlay.classList.remove('active');
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
            do {
                distractor = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            } while (distractor === currentTarget);
            img.src = `assets/img/sprite${distractor}.png`;
            img.dataset.type = 'wrong';
        }

        img.addEventListener('pointerdown', handleCharacterClick);
        board.appendChild(img);
    }
}

function handleCharacterClick(e) {
    if (!isPlaying) return;
    e.preventDefault(); 

    const type = e.target.dataset.type;

    if (type === 'target') {
        const randomSound = audio.caught[Math.floor(Math.random() * audio.caught.length)];
        randomSound.currentTime = 0;
        randomSound.play();

        score++;
        scoreEl.textContent = score;
        
        timeLeft = Math.min(timeLeft + TIME_BONUS, 30);
        timerEl.textContent = timeLeft;

        level++;
        startLevel();
    } else {
        audio.wrong.currentTime = 0;
        audio.wrong.play();
        
        timeLeft = Math.max(0, timeLeft - 3);
        timerEl.textContent = timeLeft;
        timerEl.classList.add('shake');
        setTimeout(() => timerEl.classList.remove('shake'), 200);
        
        if (timeLeft <= 0) gameOver();
    }
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerInterval);
    audio.music.pause();
    audio.timeup.play();

    uiBar.classList.add('hidden');

    overlayTitle.textContent = "GAME OVER";
    document.getElementById('overlay-desc').textContent = `Score final : ${score}`;
    startBtn.textContent = "REJOUER";
    
    overlayScreen.classList.remove('hidden');
    shadowOverlay.classList.remove('active');
}

startBtn.addEventListener('click', startGame);