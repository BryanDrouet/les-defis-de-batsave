const CHARACTERS = ['Mario', 'Luigi', 'Wario', 'Yoshi'];
const START_TIME = 10;
const TIME_BONUS = 5;

const DARK_MODE_LEVEL = 5;
const CHAOS_MODE_LEVEL = 20;
const ADVANCED_CHAOS_LEVEL = 30;

const MIN_SPEED = 0.8;
const MAX_SPEED = 3.5;
const CHAOS_MAX_SPEED_LEVEL = 50;

const MIN_CHAOS_CHARS = 20;
const MAX_CHAOS_CHARS = 40;
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

let allRecords = [];
let sortState = { column: 'score', direction: 'desc' };

let animationFrameId = null;
let movingCharacters = []; 

let isUserTouching = false;
let autoLight = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    dx: 4,
    dy: 4
};

let isMuted = false;
const VOLUMES = {
    music: 0.3,
    sfx: 1.0
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
const soundBtn = document.getElementById('mute-btn');

warningText.textContent = `Attention : à partir du niveau ${CHAOS_MODE_LEVEL} le chaos arrive...`;
timerEl.textContent = START_TIME;

function toggleSound() {
    isMuted = !isMuted;
    const btn = document.getElementById('sound-btn');
    const icon = btn.querySelector('i');

    if (isMuted) {
        audio.music.volume = 0;
        audio.wrong.volume = 0;
        audio.timeup.volume = 0;
        audio.caught.forEach(s => s.volume = 0);
        
        if (icon) icon.setAttribute('data-lucide', 'volume-x');
        btn.style.borderColor = '#7f8c8d';
        btn.style.color = '#7f8c8d';
    } else {
        audio.music.volume = VOLUMES.music;
        audio.wrong.volume = VOLUMES.sfx;
        audio.timeup.volume = VOLUMES.sfx;
        audio.caught.forEach(s => s.volume = VOLUMES.sfx);
        
        if (icon) icon.setAttribute('data-lucide', 'volume-2');
        btn.style.borderColor = '#b30000';
        btn.style.color = '#f1c40f';
    }

    if (window.lucide) lucide.createIcons();
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

document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    
    document.getElementById('lb-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allRecords.filter(r => r.pseudo.toLowerCase().includes(term));
        renderTable(filtered);
    });

    document.querySelectorAll('#leaderboard-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (sortState.column === column) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = column;
                sortState.direction = 'desc';
                if (column === 'pseudo') sortState.direction = 'asc';
            }
            sortRecords();
        });
    });
});

async function loadLeaderboard() {
    const loadingMsg = document.getElementById('lb-loading');
    try {
        const response = await fetch('records.json'); 
        if (!response.ok) throw new Error("Fichier introuvable");
        
        allRecords = await response.json();
        
        sortRecords();
        
        loadingMsg.style.display = 'none';
    } catch (error) {
        console.error("Erreur leaderboard:", error);
        loadingMsg.textContent = "Impossible de charger les scores.";
    }
}

function sortRecords() {
    const { column, direction } = sortState;
    const modifier = direction === 'asc' ? 1 : -1;

    allRecords.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'date') {
            valA = parseDate(valA);
            valB = parseDate(valB);
        }
        else if (column === 'score') {
            valA = Number(valA);
            valB = Number(valB);
        }
        else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return -1 * modifier;
        if (valA > valB) return 1 * modifier;
        return 0;
    });

    const searchTerm = document.getElementById('lb-search').value.toLowerCase();
    const filtered = allRecords.filter(r => r.pseudo.toLowerCase().includes(searchTerm));
    
    renderTable(filtered);
    updateSortIcons();
}

function renderTable(data) {
    const tbody = document.getElementById('lb-body');
    tbody.innerHTML = '';

    data.forEach(record => {
        const tr = document.createElement('tr');
        
        let pseudoHtml = record.pseudo;
        if (record.proof && record.proof.trim() !== "") {
            pseudoHtml += ` <a href="${record.proof}" target="_blank" title="Voir la preuve" class="proof-link">
                <i data-lucide="external-link" style="width:14px;height:14px;"></i>
            </a>`;
        }

        tr.innerHTML = `
            <td>${pseudoHtml}</td>
            <td>${record.score}</td>
            <td>${record.date}</td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

function parseDate(dateStr) {
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
}

function updateSortIcons() {
    document.querySelectorAll('th .sort-icon').forEach(icon => {
        icon.setAttribute('data-lucide', 'arrow-up-down');
        icon.style.opacity = '0.3';
    });

    const activeTh = document.querySelector(`th[data-sort="${sortState.column}"]`);
    if (activeTh) {
        const activeIcon = activeTh.querySelector('.sort-icon');
        const iconName = sortState.direction === 'asc' ? 'arrow-up' : 'arrow-down';
        activeIcon.setAttribute('data-lucide', iconName);
        activeIcon.style.opacity = '1';
    }
    if (window.lucide) lucide.createIcons();
}

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

        const rect = container.getBoundingClientRect();
        autoLight.x = Math.max(60, Math.min(rect.width - 60, autoLight.x));
        autoLight.y = Math.max(160, Math.min(rect.height - 60, autoLight.y));

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
        if (char.dx === 0 && char.dy === 0) return;

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

        char.el.style.transform = `translate3d(${char.x}px, ${char.y}px, 0)`;
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

    let levelBehavior = 'bounce';
    let currentSpeed = 0;
    let isStatic = false;
    let isSynced = false;
    let sharedDirX = 0;
    let sharedDirY = 0;

    if (level >= CHAOS_MODE_LEVEL) {
        levelBehavior = Math.random() < 0.5 ? 'bounce' : 'wrap';
        const speedProgress = Math.min((level - CHAOS_MODE_LEVEL) / (CHAOS_MAX_SPEED_LEVEL - CHAOS_MODE_LEVEL), 1);
        currentSpeed = MIN_SPEED + ((MAX_SPEED - MIN_SPEED) * speedProgress);

        let multiplier = 1;

        if (level >= ADVANCED_CHAOS_LEVEL) {
            isSynced = Math.random() < 0.5;
            isStatic = false;
            multiplier = 1 + Math.random() * 2;
        } 
        else {
            const chaosRoll = Math.random();
            if (chaosRoll < 0.33) {
                isStatic = true;
                multiplier = 1 + Math.random(); 
            } else if (chaosRoll < 0.66) {
                isSynced = true;
                isStatic = false;
            } else {
                isSynced = false;
                isStatic = false;
            }
        }

        totalCharacters = Math.floor(totalCharacters * multiplier);

        if (isSynced) {
            sharedDirX = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
            sharedDirY = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
        }
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
            
            let dirX = 0;
            let dirY = 0;

            if (!isStatic) {
                if (isSynced) {
                    dirX = sharedDirX;
                    dirY = sharedDirY;
                } else {
                    dirX = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
                    dirY = (Math.random() < 0.5 ? -1 : 1) * currentSpeed;
                }
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
            img.style.transform = `translate3d(${startX}px, ${startY}px, 0)`; 
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
        
        timerEl.textContent = timeLeft;
        timerEl.style.color = timeLeft <= 5 ? '#ff5454' : '#00d512';

        level++;
        saveGame();
        startLevel();
    } else {
        audio.wrong.play();
        
        timeLeft = Math.max(0, timeLeft - 3);
        
        timerEl.textContent = timeLeft;
        timerEl.style.color = timeLeft <= 5 ? '#ff5454' : '#00d512';

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

soundBtn.addEventListener('click', toggleSound);

startBtn.addEventListener('click', () => {
    const hasSession = localStorage.getItem('wanted_current_session') !== null;
    startGame(hasSession);
});

resetBtn.addEventListener('click', () => {
    if(confirm("Voulez-vous vraiment recommencer à zéro ?")) {
        startGame(false);
    }
});