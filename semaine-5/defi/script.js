const CHARACTERS = ['Mario', 'Luigi', 'Wario', 'Yoshi'];
const START_TIME = 10;
const TIME_BONUS = 5;

const DARK_MODE_LEVEL = 5;
const CHAOS_MODE_LEVEL = 20;

const MIN_SPEED = 0.8;
const MAX_SPEED = 5;
const CHAOS_MAX_SPEED_LEVEL = 50;

const MIN_CHAOS_CHARS = 20;
const MAX_CHAOS_CHARS = 60;
const CHAOS_MAX_CHARS_LEVEL = 50;

const MAX_LIGHT_RADIUS = 500; 
const MIN_LIGHT_RADIUS = 150;  
const LIGHT_MIN_LEVEL = 20;

const MIN_SHADOW_OPACITY = 0;
const MAX_SHADOW_OPACITY = 0.88;
const SHADOW_MAX_LEVEL = 30;

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

let animationFrameId = null;
let movingCharacters = []; 

let isUserTouching = false;
let autoLight = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    dx: 4,
    dy: 4
};

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
const bestScoreDisplay = document.getElementById('best-score-display');
const container = document.querySelector('.game-container');

warningText.textContent = `Attention : À partir du niveau ${CHAOS_MODE_LEVEL} le chaos arrive...`;
timerEl.textContent = START_TIME;

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
        bestScoreDisplay.textContent = `Record : ${score}`;
    }
};

function setFlashlightPosition(x, y) {
    if (level >= DARK_MODE_LEVEL && isPlaying) {
        const uiHeight = uiBar.offsetHeight;
        shadowOverlay.style.setProperty('--x', `${x}px`);
        shadowOverlay.style.setProperty('--y', `${y - uiHeight}px`);
    }
}

function updateAutoLight() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    autoLight.x += autoLight.dx;
    autoLight.y += autoLight.dy;

    if (autoLight.x <= 50 || autoLight.x >= width - 50) {
        autoLight.dx *= -1;
        autoLight.dy += (Math.random() - 0.5); 
    }
    if (autoLight.y <= 150 || autoLight.y >= height - 50) {
        autoLight.dy *= -1;
        autoLight.dx += (Math.random() - 0.5);
    }

    autoLight.x = Math.max(0, Math.min(autoLight.x, width));
    autoLight.y = Math.max(0, Math.min(autoLight.y, height));

    setFlashlightPosition(autoLight.x, autoLight.y);
}

document.addEventListener('pointerdown', (e) => {
    isUserTouching = true;
    updateLightPosition(e);
});

document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
        isUserTouching = true;
        updateLightPosition(e);
    } 
    else if (isUserTouching) { 
        updateLightPosition(e);
    }
});

function updateLightPosition(e) {
    const rect = container.getBoundingClientRect();
    autoLight.x = e.clientX - rect.left;
    autoLight.y = e.clientY - rect.top;
    setFlashlightPosition(autoLight.x, autoLight.y);
}

const handleInteractionEnd = (e) => {
    if (e.pointerType === 'mouse' && e.type !== 'pointerleave') {
        return;
    }

    if (isUserTouching) {
        isUserTouching = false;
        autoLight.dx = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
        autoLight.dy = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
    }
};

document.addEventListener('pointerup', handleInteractionEnd);
document.addEventListener('pointercancel', handleInteractionEnd);
document.addEventListener('pointerleave', handleInteractionEnd);

function gameLoop() {
    if (!isPlaying) return;

    if (level >= CHAOS_MODE_LEVEL) {
        moveCharacters();
    }

    if (level >= DARK_MODE_LEVEL && !isUserTouching) {
        updateAutoLight();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function moveCharacters() {
    const boardRect = board.getBoundingClientRect();
    const maxX = boardRect.width;
    const maxY = boardRect.height;

    movingCharacters.forEach(char => {
        char.x += char.dx;
        char.y += char.dy;

        if (char.behavior === 'bounce') {
            if (char.x <= 0 || char.x + char.width >= maxX) {
                char.dx *= -1;
                char.x = Math.max(0, Math.min(char.x, maxX - char.width));
            }
            if (char.y <= 0 || char.y + char.height >= maxY) {
                char.dy *= -1;
                char.y = Math.max(0, Math.min(char.y, maxY - char.height));
            }
        } else {
            if (char.x > maxX) char.x = -char.width;
            else if (char.x < -char.width) char.x = maxX;
            
            if (char.y > maxY) char.y = -char.height;
            else if (char.y < -char.height) char.y = maxY;
        }

        char.el.style.transform = `translate(${char.x}px, ${char.y}px)`;
    });
}

function startGame(isResume = false) {
    if (!isResume) {
        score = 0;
        level = 1;
        timeLeft = START_TIME;
        localStorage.removeItem('wanted_current_session');
    }

    bestScoreDisplay.classList.add('hidden');
    
    isPlaying = true;
    uiBar.classList.remove('hidden');
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    overlayScreen.classList.add('hidden');
    warningText.classList.add('hidden');
    
    isUserTouching = false; 
    
    autoLight.x = window.innerWidth / 2;
    autoLight.y = window.innerHeight / 2;
    autoLight.dx = (Math.random() < 0.5 ? -1 : 1) * 4;
    autoLight.dy = (Math.random() < 0.5 ? -1 : 1) * 4;
    
    audio.music.currentTime = 0;
    audio.music.play().catch(() => {});

    startLevel();
    gameLoop();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        timerEl.style.color = timeLeft <= 5 ? '#ff5454' : '#00d512';
        
        saveGame();

        if (timeLeft <= 0) gameOver();
    }, 1000);
}

function startLevel() {
    board.innerHTML = '';
    movingCharacters = []; 

    let totalCharacters;
    
    if (level >= CHAOS_MODE_LEVEL) {
        const charsProgress = Math.min((level - CHAOS_MODE_LEVEL) / (CHAOS_MAX_CHARS_LEVEL - CHAOS_MODE_LEVEL), 1);
        const calculatedChars = MIN_CHAOS_CHARS + ((MAX_CHAOS_CHARS - MIN_CHAOS_CHARS) * charsProgress);
        totalCharacters = Math.floor(calculatedChars);
    } else {
        totalCharacters = 4;
        if (level >= 3) totalCharacters = 9;
        if (level >= 6) totalCharacters = 16;
        if (level >= 10) totalCharacters = 25;
        if (level >= 15) totalCharacters = 36;
    }

    if (level >= CHAOS_MODE_LEVEL) {
        board.style.display = 'block'; 
        board.style.position = 'relative';
    } else {
        board.style.display = 'grid';
        let cols = Math.ceil(Math.sqrt(totalCharacters));
        board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${Math.ceil(totalCharacters / cols)}, 1fr)`;
    }
    
    if (level >= DARK_MODE_LEVEL) {
        shadowOverlay.classList.add('active');
        shadowOverlay.classList.remove('hidden');
         
        const lightProgress = Math.min((level - DARK_MODE_LEVEL) / (LIGHT_MIN_LEVEL - DARK_MODE_LEVEL), 1);
        const currentRadius = MAX_LIGHT_RADIUS - ((MAX_LIGHT_RADIUS - MIN_LIGHT_RADIUS) * lightProgress);
        shadowOverlay.style.setProperty('--radius', `${currentRadius}px`);
        
        const shadowProgress = Math.min((level - DARK_MODE_LEVEL) / (SHADOW_MAX_LEVEL - DARK_MODE_LEVEL), 1);
        const currentOpacity = MIN_SHADOW_OPACITY + ((MAX_SHADOW_OPACITY - MIN_SHADOW_OPACITY) * shadowProgress);
        shadowOverlay.style.setProperty('--opacity', currentOpacity);
        
    } else {
        shadowOverlay.classList.remove('active');
        shadowOverlay.style.setProperty('--opacity', 0);
        shadowOverlay.style.setProperty('--radius', '200vmax');
    }

    currentTarget = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    targetImg.src = `assets/img/wanted${currentTarget}.png`;

    const targetIndex = Math.floor(Math.random() * totalCharacters);
    const boardRect = board.getBoundingClientRect(); 

    let levelBehavior = 'bounce';
    let sharedDirX = 0;
    let sharedDirY = 0;
    const isUniformMovement = Math.random() < 0.8;

    if (level >= CHAOS_MODE_LEVEL) {
        levelBehavior = Math.random() < 0.5 ? 'bounce' : 'wrap';

        const speedProgress = Math.min((level - CHAOS_MODE_LEVEL) / (CHAOS_MAX_SPEED_LEVEL - CHAOS_MODE_LEVEL), 1);
        const currentSpeed = MIN_SPEED + ((MAX_SPEED - MIN_SPEED) * speedProgress);

        if (isUniformMovement) {
            sharedDirX = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
            sharedDirY = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
        }
    }

    for (let i = 0; i < totalCharacters; i++) {
        const img = document.createElement('img');
        img.classList.add('character');
        img.setAttribute('draggable', false);
        
        if (i === targetIndex) {
            img.src = `assets/img/sprite${currentTarget}.png`;
            img.dataset.type = 'target';
            img.classList.add('target');
        } else {
            let distractor;
            do { distractor = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]; } 
            while (distractor === currentTarget);
            img.src = `assets/img/sprite${distractor}.png`;
            img.dataset.type = 'wrong';
        }

        if (level >= CHAOS_MODE_LEVEL) {
            img.style.position = 'absolute';
            img.style.width = '60px';
            img.style.height = '60px';
            
            const startX = Math.random() * (boardRect.width - 60);
            const startY = Math.random() * (boardRect.height - 60);
            
            const speedProgress = Math.min((level - CHAOS_MODE_LEVEL) / (CHAOS_MAX_SPEED_LEVEL - CHAOS_MODE_LEVEL), 1);
            const currentSpeed = MIN_SPEED + ((MAX_SPEED - MIN_SPEED) * speedProgress);

            let dirX, dirY;

            if (isUniformMovement) {
                dirX = sharedDirX;
                dirY = sharedDirY;
            } else {
                dirX = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
                dirY = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
            }

            movingCharacters.push({
                el: img,
                x: startX,
                y: startY,
                dx: dirX,
                dy: dirY,
                width: 60,
                height: 60,
                behavior: levelBehavior
            });

            img.style.left = '0px';
            img.style.top = '0px';
            img.style.transform = `translate(${startX}px, ${startY}px)`;
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
    cancelAnimationFrame(animationFrameId); 
    clearInterval(timerInterval);
    updateBestScore();
    localStorage.removeItem('wanted_current_session');
    
    audio.music.pause();
    audio.timeup.play();
    uiBar.classList.add('hidden');
    
    overlayTitle.textContent = "GAME OVER";
    const best = localStorage.getItem('wanted_best_score') || 0;
    document.getElementById('overlay-desc').innerHTML = `Score : ${score}`;
    
    if (best > 0) bestScoreDisplay.classList.remove('hidden');

    warningText.classList.add('hidden');
    startBtn.textContent = "REJOUER";
    resetBtn.classList.add('hidden'); 
    
    overlayScreen.classList.remove('hidden');
    shadowOverlay.classList.remove('active');
}

window.onload = () => {
    const best = localStorage.getItem('wanted_best_score') || 0;

    if (best > 0) {
        bestScoreDisplay.textContent = `Record : ${best}`;
        bestScoreDisplay.classList.remove('hidden');
    } else {
        bestScoreDisplay.classList.add('hidden');
    }

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