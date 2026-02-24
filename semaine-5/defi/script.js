/* --- CONFIGURATION --- */
const CHARACTERS = ['Mario', 'Luigi', 'Wario', 'Yoshi'];
const START_TIME = 10;
const TIME_BONUS = 5;

// Difficulté et Ambiance
const DARK_MODE_LEVEL = 5;
const CHAOS_MODE_LEVEL = 20;

// Configuration du Chaos (Niveau 20+)
const MIN_SPEED = 2;          // Vitesse de départ
const MAX_SPEED = 15;         // Vitesse maximale (plafond)
const SPEED_INCREMENT = 0.5;  // Accélération tous les 2 niveaux

const MIN_CHAOS_CHARS = 20;   // Nombre minimum de personnages
const MAX_CHAOS_CHARS = 60;   // Nombre maximum (pour éviter la saturation)

// Configuration de la Lumière (Ombre)
const MAX_LIGHT_RADIUS = 500; 
const MIN_LIGHT_RADIUS = 70;  
const LIGHT_SHRINK_STEP = 40;
const MIN_SHADOW_OPACITY = 0.5;
const MAX_SHADOW_OPACITY = 0.95;

/* --- SONS --- */
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

/* --- VARIABLES D'ÉTAT --- */
let score = 0;
let level = 1;
let timeLeft = START_TIME;
let timerInterval = null;
let currentTarget = '';
let isPlaying = false;

// Variables Chaos
let animationFrameId = null;
let movingCharacters = []; 

/* --- DOM ELEMENTS --- */
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

/* --- INITIALISATION TEXTE --- */
warningText.textContent = `Attention : À partir du niveau ${DARK_MODE_LEVEL}, les ténèbres arrivent...`;

/* --- STOCKAGE --- */
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

/* --- LAMPE TORCHE --- */
function updateFlashlight(x, y) {
    if (level >= DARK_MODE_LEVEL && isPlaying) {
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

/* --- BOUCLE D'ANIMATION (CHAOS MODE) --- */
function gameLoop() {
    if (!isPlaying) return;

    if (level >= CHAOS_MODE_LEVEL) {
        moveCharacters();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function moveCharacters() {
    const boardRect = board.getBoundingClientRect();
    const maxX = boardRect.width;
    const maxY = boardRect.height;

    movingCharacters.forEach(char => {
        // Mise à jour position
        char.x += char.dx;
        char.y += char.dy;

        if (char.behavior === 'bounce') {
            // COMPORTEMENT 1 : REBOND
            if (char.x <= 0 || char.x + char.width >= maxX) {
                char.dx *= -1;
                char.x = Math.max(0, Math.min(char.x, maxX - char.width));
            }
            if (char.y <= 0 || char.y + char.height >= maxY) {
                char.dy *= -1;
                char.y = Math.max(0, Math.min(char.y, maxY - char.height));
            }
        } else {
            // COMPORTEMENT 2 : TRAVERSÉE (Wrap-around)
            if (char.x > maxX) char.x = -char.width;
            else if (char.x < -char.width) char.x = maxX;
            
            if (char.y > maxY) char.y = -char.height;
            else if (char.y < -char.height) char.y = maxY;
        }

        // Applique la position
        char.el.style.transform = `translate(${char.x}px, ${char.y}px)`;
    });
}

/* --- FONCTIONS DU JEU --- */
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
    gameLoop(); // Lancement de l'animation
    
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

    // --- 1. Calcul du nombre de personnages ---
    let totalCharacters;
    if (level >= CHAOS_MODE_LEVEL) {
        // Progression linéaire entre MIN et MAX Chaos Chars
        const chaosProgress = Math.min((level - CHAOS_MODE_LEVEL), 20); // Plafonne la progression
        // Formule simple : base + (niveau * multiplicateur), borné par MAX
        let calculatedChars = MIN_CHAOS_CHARS + (level - CHAOS_MODE_LEVEL) * 2;
        totalCharacters = Math.min(calculatedChars, MAX_CHAOS_CHARS);
    } else {
        // Progression standard grille
        totalCharacters = 4;
        if (level >= 3) totalCharacters = 9;
        if (level >= 6) totalCharacters = 16;
        if (level >= 10) totalCharacters = 25;
        if (level >= 15) totalCharacters = 36;
    }

    // --- 2. Configuration du Plateau ---
    if (level >= CHAOS_MODE_LEVEL) {
        board.style.display = 'block'; 
        board.style.position = 'relative';
    } else {
        board.style.display = 'grid';
        let cols = Math.ceil(Math.sqrt(totalCharacters));
        board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${Math.ceil(totalCharacters / cols)}, 1fr)`;
    }
    
    // --- 3. Gestion de l'Ombre ---
    if (level >= DARK_MODE_LEVEL) {
        shadowOverlay.classList.add('active');
        shadowOverlay.classList.remove('hidden');
         
        const darkLevelsPassed = level - DARK_MODE_LEVEL;
        
        let newRadius = Math.max(MAX_LIGHT_RADIUS - (darkLevelsPassed * LIGHT_SHRINK_STEP), MIN_LIGHT_RADIUS);
        shadowOverlay.style.setProperty('--radius', `${newRadius}px`);
        
        let calculatedOpacity = MIN_SHADOW_OPACITY + (darkLevelsPassed * 0.05);
        let finalOpacity = Math.min(calculatedOpacity, MAX_SHADOW_OPACITY);
        
        shadowOverlay.style.setProperty('--opacity', finalOpacity);
    } else {
        shadowOverlay.classList.remove('active');
        shadowOverlay.style.setProperty('--opacity', 0);
        // Réinitialisation pour l'effet de zoom au prochain trigger
        shadowOverlay.style.setProperty('--radius', '200vmax');
    }

    // --- 4. Génération des Persos ---
    currentTarget = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    targetImg.src = `assets/img/wanted${currentTarget}.png`;

    const targetIndex = Math.floor(Math.random() * totalCharacters);
    const boardRect = board.getBoundingClientRect(); 

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

        // 🟢 INITIALISATION CHAOS (Position + Vitesse + Comportement)
        if (level >= CHAOS_MODE_LEVEL) {
            img.style.position = 'absolute';
            img.style.width = '60px';
            img.style.height = '60px';
            
            const startX = Math.random() * (boardRect.width - 60);
            const startY = Math.random() * (boardRect.height - 60);
            
            // Vitesse progressive
            const levelsOverChaos = Math.floor((level - CHAOS_MODE_LEVEL) / 2);
            let currentSpeed = MIN_SPEED + (levelsOverChaos * SPEED_INCREMENT);
            currentSpeed = Math.min(currentSpeed, MAX_SPEED); 

            const dirX = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
            const dirY = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;

            // Choix aléatoire : Rebond (60%) ou Traversée (40%)
            const behaviorType = Math.random() > 0.4 ? 'bounce' : 'wrap';

            movingCharacters.push({
                el: img,
                x: startX,
                y: startY,
                dx: dirX,
                dy: dirY,
                width: 60,
                height: 60,
                behavior: behaviorType
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