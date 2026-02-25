const urlParams = new URLSearchParams(window.location.search);
const isDebug = urlParams.get('debug') === 'true';

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

let settings = {
    musicVolume: 0.3,
    sfxVolume: 1.0,
    gameMode: 'normal',
    menuMusic: false
};
audio.music.volume = settings.musicVolume;

let score = 0;
let level = 1;
let timeLeft = START_TIME;
let timerInterval = null;
let currentTarget = '';
let isPlaying = false;
let isPaused = false;
let lastSfxPlay = 0;

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

const board = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const targetImg = document.getElementById('target-img');
const shadowOverlay = document.getElementById('shadow-overlay');
const overlayScreen = document.getElementById('overlay-screen');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const uiBar = document.querySelector('.ui-bar');
const bestScoreDisplay = document.getElementById('best-score-display');
const container = document.querySelector('.game-container');
const buttonGroup = document.querySelector('.button-group');
const countdownOverlay = document.getElementById('countdown-overlay');

const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const quitGameBtn = document.getElementById('quit-game-btn');

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');

const menuMusicCheck = document.getElementById('menu-music-check');
const musicSlider = document.getElementById('music-slider');
const sfxSlider = document.getElementById('sfx-slider');

const varCSS = getComputedStyle(document.documentElement);

timerEl.textContent = START_TIME;

function togglePause(pauseState) {
    if (!isPlaying) return;
    
    isPaused = pauseState;
    
    if (isPaused) {
        if (settings.musicVolume > 0) {
            fadeAudioTo(settings.musicVolume * 0.3, 500);
        }
    } else {
        if (settings.musicVolume > 0) {
            fadeAudioTo(settings.musicVolume, 500);
        }
    }
}

function openModal(modal) {
    togglePause(true);
    
    if (modal === settingsModal) {
        if (isPlaying) {
            quitGameBtn.classList.remove('hidden');
        } else {
            quitGameBtn.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden'); 
    requestAnimationFrame(() => {
        modal.classList.add('visible');
    });
}

function closeModal(modal) {
    const visibleModals = document.querySelectorAll('.modal.visible').length;
    
    const isGameplayActive = isPlaying && overlayScreen.classList.contains('hidden');

    if (visibleModals === 1 && isGameplayActive && !isDebug) {
        countdownOverlay.classList.remove('hidden');
        countdownOverlay.textContent = '3';
    }

    modal.classList.remove('visible');
    
    setTimeout(() => {
        if (!modal.classList.contains('visible')) {
           modal.classList.add('hidden');
           
           const anyVisible = document.querySelectorAll('.modal.visible').length > 0;
           
           if (!anyVisible) {
               if (isGameplayActive) {
                   if (isDebug) {
                       togglePause(false);
                   } else {
                       startResumeCountdown();
                   }
               } else {
                   togglePause(false);
               }
           }
        }
    }, 300);
}

function startResumeCountdown(onCompleteCallback = null) {
    let count = 3;
    countdownOverlay.classList.remove('hidden');
    countdownOverlay.textContent = count;
    
    const countInt = setInterval(() => {
        count--;
        if (count > 0) {
            countdownOverlay.textContent = count;
        } else {
            clearInterval(countInt);
            countdownOverlay.textContent = "GO!";
            
            setTimeout(() => {
                countdownOverlay.classList.add('hidden');
                
                if (onCompleteCallback) {
                    onCompleteCallback();
                } else {
                    togglePause(false);
                }
            }, 500); 
        }
    }, 1000);
}

settingsBtn.addEventListener('click', () => openModal(settingsModal));
closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

leaderboardBtn.addEventListener('click', () => openModal(leaderboardModal));
closeLeaderboardBtn.addEventListener('click', () => closeModal(leaderboardModal));

[settingsModal, leaderboardModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

let audioTransitionInterval = null;

function fadeAudioTo(targetVolume, duration = 500, callback = null) {
    if (audioTransitionInterval) clearInterval(audioTransitionInterval);
    
    if (audio.music.paused && targetVolume > 0) {
        audio.music.volume = 0;
        audio.music.play().catch(() => {});
    }

    const startVolume = audio.music.volume;
    const startTime = Date.now();

    audioTransitionInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1); 

        audio.music.volume = startVolume + (targetVolume - startVolume) * progress;

        if (progress >= 1) {
            clearInterval(audioTransitionInterval);
            audio.music.volume = targetVolume;
            if (callback) callback();
        }
    }, 20);
}

musicSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    settings.musicVolume = val;
    document.getElementById('music-val').textContent = Math.round(val * 100) + '%';
    
    fadeAudioTo(val);
    saveSettings();
});

menuMusicCheck.addEventListener('change', (e) => {
    settings.menuMusic = e.target.checked;
    saveSettings();

    if (settings.menuMusic) {
        if (settings.musicVolume > 0) {
            const targetVol = (!isPlaying || isPaused) ? settings.musicVolume * 0.3 : settings.musicVolume;
            fadeAudioTo(targetVol, 2000); 
        }
    } else {
        fadeAudioTo(0, 2000, () => {
            audio.music.pause();
        });
    }
});

sfxSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    settings.sfxVolume = val;
    document.getElementById('sfx-val').textContent = Math.round(val * 100) + '%';
    
    const now = Date.now();
    if (now - lastSfxPlay > 150) {
        const testSound = audio.caught[0].cloneNode(); 
        testSound.volume = val;
        testSound.play().catch(() => {});
        lastSfxPlay = now;
    }
    saveSettings();
});

const saveSettings = () => {
    localStorage.setItem('wanted_settings', JSON.stringify(settings));
};

const loadSettings = () => {
    const saved = localStorage.getItem('wanted_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            settings = { ...settings, ...parsed };
            
            musicSlider.value = settings.musicVolume;
            document.getElementById('music-val').textContent = Math.round(settings.musicVolume * 100) + '%';
            
            sfxSlider.value = settings.sfxVolume;
            document.getElementById('sfx-val').textContent = Math.round(settings.sfxVolume * 100) + '%';
            
            menuMusicCheck.checked = settings.menuMusic;
            
            audio.music.volume = settings.musicVolume;
        } catch (e) {
            console.error("Erreur chargement paramètres", e);
        }
    }
};

if(quitGameBtn) {
    quitGameBtn.addEventListener('click', () => {
        if(confirm("Voulez-vous vraiment abandonner la partie en cours ?")) {
            settingsModal.classList.remove('visible');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
            
            quitGame();
        }
    });
}

function quitGame() {
    isPlaying = false;
    isPaused = false;
    cancelAnimationFrame(animationFrameId); 
    clearInterval(timerInterval);
    
    localStorage.removeItem('wanted_current_session');
    
    if (!settings.menuMusic) {
        audio.music.pause();
    } else {
        if (audio.music.paused && settings.musicVolume > 0) {
            audio.music.play().catch(()=>{});
        }
    }
    
    uiBar.classList.add('hidden');
    board.innerHTML = '';
    shadowOverlay.classList.remove('active');
    
    overlayTitle.textContent = "WANTED!";
    overlayDesc.textContent = "Trouve le personnage affiché avant la fin du temps.";
    
    overlayScreen.classList.remove('hidden');
    initStartScreen();
    
    document.querySelector('.top-buttons').style.display = 'flex';
}

const saveGame = () => {
    if(!isPlaying) return;
    localStorage.setItem('wanted_current_session', JSON.stringify({ score, level, timeLeft, gameMode: settings.gameMode }));
};

const loadSession = () => {
    try {
        const session = localStorage.getItem('wanted_current_session');
        if (session && session !== "undefined") {
            const data = JSON.parse(session);
            score = data.score || 0;
            level = data.level || 1;
            timeLeft = data.timeLeft || START_TIME;
            if(data.gameMode) {
                settings.gameMode = data.gameMode;
            }
            return true;
        }
    } catch (e) {
        console.error("Erreur lecture sauvegarde:", e);
        localStorage.removeItem('wanted_current_session');
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
    if (level >= DARK_MODE_LEVEL && isPlaying && !isPaused) {
        const uiHeight = uiBar.offsetHeight;
        shadowOverlay.style.setProperty('--x', `${x}px`);
        shadowOverlay.style.setProperty('--y', `${y - uiHeight}px`);
    }
}

function updateAutoLight() {
    if(isPaused) return;

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
    if(!isPaused) updateLightPosition(e);
});

document.addEventListener('pointermove', (e) => {
    if(isPaused) return;
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
            valA = valA ? valA.toString().toLowerCase() : '';
            valB = valB ? valB.toString().toLowerCase() : '';
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
            pseudoHtml += ` <a href="${record.proof}" target="_blank" class="proof-link"><i data-lucide="external-link" class="external-link-icon"></i></a>`;
        }

        let modeClass = 'mode-normal';
        let modeLabel = 'Normal';
        if(record.mode === 'simple') { modeClass = 'mode-simple'; modeLabel = 'Simple'; }
        if(record.mode === 'hard') { modeClass = 'mode-hard'; modeLabel = 'Difficile'; }

        tr.innerHTML = `
            <td>${pseudoHtml}</td>
            <td>${record.score}</td>
            <td><span class="mode-badge ${modeClass}">${modeLabel}</span></td>
            <td>${record.date}</td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

function parseDate(dateStr) {
    if(!dateStr) return 0;
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

    if (!isPaused) {
        if (level >= CHAOS_MODE_LEVEL) {
            moveCharacters();
        }

        if (level >= DARK_MODE_LEVEL && !isUserTouching) {
            updateAutoLight();
        }
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
    uiBar.classList.remove('hidden');
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    overlayScreen.classList.add('hidden');
    document.querySelector('.top-buttons').style.display = 'flex';
    
    isUserTouching = false; 
    autoLight.x = window.innerWidth / 2;
    autoLight.y = window.innerHeight / 2;
    
    startLevel();

    audio.music.currentTime = 0;
    if(settings.musicVolume > 0) {
        audio.music.play().catch(() => {});
    }

    startResumeCountdown(() => {
        isPlaying = true;
        isPaused = false;
        
        gameLoop();
        
        if (timerInterval) clearInterval(timerInterval);

        if (isDebug) {
            timerEl.textContent = "∞";
            timerEl.classList.add('timer-debug');
        } else {
            timerInterval = setInterval(() => {
                if (isPaused) return;

                timerEl.classList.remove('timer-normal', 'timer-danger');
                timeLeft--;
                timerEl.textContent = timeLeft;

                if (timeLeft <= 5) {
                    timerEl.classList.add('timer-danger');
                } else {
                    timerEl.classList.add('timer-normal');
                }

                if (timeLeft <= 0) gameOver();
                saveGame();
            }, 1000);
        }
    });
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

    if (settings.gameMode === 'simple') {
        totalCharacters = Math.max(4, Math.floor(totalCharacters / 2));
    } else if (settings.gameMode === 'hard') {
        totalCharacters = Math.floor(totalCharacters * 1.5);
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
        
        board.style.display = 'block'; 
        board.style.position = 'relative';
        board.style.gridTemplateColumns = 'none';
        board.style.gridTemplateRows = 'none';
    } 
    else {
        board.style.display = 'grid';
        let cols = Math.ceil(Math.sqrt(totalCharacters));
        let rows = Math.ceil(totalCharacters / cols);
        
        totalCharacters = cols * rows;

        board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
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

    const bWidth = boardRect.width || window.innerWidth;
    const bHeight = boardRect.height || window.innerHeight;

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
            img.style.opacity = '0';
            img.style.position = 'absolute';
            img.style.width = '60px';
            img.style.height = '60px';
            
            const startX = Math.random() * (bWidth - 60);
            const startY = Math.random() * (bHeight - 60);
            
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
            
            requestAnimationFrame(() => {
                img.style.transition = 'opacity 0.2s ease-out';
                img.style.opacity = '1';
            });

        } else {
            img.style.animation = 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }

        img.addEventListener('pointerdown', handleCharacterClick);
        board.appendChild(img);
    }
}

function handleCharacterClick(e) {
    if (!isPlaying || isPaused) return;
        
    if (e.target.dataset.type === 'target') {
        const sound = audio.caught[Math.floor(Math.random() * audio.caught.length)];
        sound.volume = settings.sfxVolume;
        sound.play().catch(()=>{});
        
        score++;
        scoreEl.textContent = score;
        
        timeLeft = Math.min(timeLeft + TIME_BONUS, 30);
        
        timerEl.textContent = timeLeft;
        timerEl.classList.remove('timer-danger', 'timer-normal');
        if(timeLeft <= 5) timerEl.classList.add('timer-danger');
        else timerEl.classList.add('timer-normal');

        level++;
        saveGame();
        startLevel();
    } else {
        audio.wrong.volume = settings.sfxVolume;
        audio.wrong.play().catch(()=>{});

        if (!isDebug) {
            timeLeft = Math.max(0, timeLeft - 3);
            
            timerEl.textContent = timeLeft;
            timerEl.classList.remove('timer-danger', 'timer-normal');
            if(timeLeft <= 5) timerEl.classList.add('timer-danger');
            else timerEl.classList.add('timer-normal');
            
            if (timeLeft <= 0) gameOver();
        }

        timerEl.classList.add('shake');
        setTimeout(() => timerEl.classList.remove('shake'), 200);
    }
}

function gameOver() {
    isPlaying = false;
    isPaused = false;
    cancelAnimationFrame(animationFrameId); 
    clearInterval(timerInterval);
    updateBestScore();
    localStorage.removeItem('wanted_current_session');
    
    audio.music.pause();
    
    audio.timeup.volume = settings.sfxVolume;
    audio.timeup.play().catch(()=>{});
    
    uiBar.classList.add('hidden');
    
    overlayTitle.textContent = "GAME OVER";
    const best = localStorage.getItem('wanted_best_score') || 0;
    overlayDesc.innerHTML = `Score : ${score}`;
    
    if (best > 0) bestScoreDisplay.classList.remove('hidden');
    
    initStartScreen();
    
    document.querySelector('.top-buttons').style.display = 'flex';
    
    overlayScreen.classList.remove('hidden');
    shadowOverlay.classList.remove('active');
}

function initStartScreen() {
    const existingDiffContainer = document.querySelector('.difficulty-start-container');
    if(existingDiffContainer) existingDiffContainer.remove();

    const hasSession = localStorage.getItem('wanted_current_session') !== null;
    
    if (!hasSession) {
        overlayDesc.textContent = "Trouve le personnage affiché avant la fin du temps.";
    }
    
    if (hasSession) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = "CONTINUER";
        resetBtn.classList.remove('hidden');
        overlayTitle.textContent = "SESSION REPRISE";
    } else {
        startBtn.classList.add('hidden');
        resetBtn.classList.add('hidden');
        overlayTitle.textContent = "WANTED!";

        const diffContainer = document.createElement('div');
        diffContainer.className = 'difficulty-start-container';

        const label = document.createElement('p');
        label.textContent = "CHOISIS TA DIFFICULTÉ :";
        label.className = 'difficulty-label';
        diffContainer.appendChild(label);

        const modes = [
            { id: 'simple', label: 'SIMPLE' },
            { id: 'normal', label: 'NORMAL' },
            { id: 'hard', label: 'DIFFICILE' }
        ];

        modes.forEach(m => {
            const btn = document.createElement('button');
            btn.textContent = m.label;
            
            btn.onclick = () => {
                settings.gameMode = m.id;
                startGame(false);
            };
            diffContainer.appendChild(btn);
        });

        buttonGroup.insertBefore(diffContainer, startBtn);
    }
}

window.onload = () => {
    loadSettings();

    const best = localStorage.getItem('wanted_best_score') || 0;
    if (best > 0) {
        bestScoreDisplay.textContent = `Record : ${best}`;
        bestScoreDisplay.classList.remove('hidden');
    } else {
        bestScoreDisplay.classList.add('hidden');
    }

    const hasSession = loadSession();
    if (hasSession) {
        document.getElementById('overlay-desc').textContent = `Niveau ${level} - Score ${score}`;
    }

    if (settings.menuMusic && settings.musicVolume > 0) {
        const targetVol = settings.musicVolume * 0.3;
        
        audio.music.volume = 0; 

        const playPromise = audio.music.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                fadeAudioTo(targetVol, 2000);
            }).catch(error => {
                console.log("Autoplay bloqué par le navigateur. Attente d'interaction...");
                const unlockAudio = () => {
                    audio.music.play().then(() => {
                        fadeAudioTo(targetVol, 2000);
                    });
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('touchstart', unlockAudio);
                };

                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
            });
        }
    }

    initStartScreen();
};

startBtn.addEventListener('click', () => {
    const hasSession = localStorage.getItem('wanted_current_session') !== null;
    startGame(hasSession);
});

resetBtn.addEventListener('click', () => {
    if(confirm("Voulez-vous vraiment recommencer à zéro ?")) {
        localStorage.removeItem('wanted_current_session');
        initStartScreen();
    }
});