const urlParams = new URLSearchParams(window.location.search);
const isDebug = urlParams.get('debug') === 'true';

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
const practiceCheck = document.getElementById('practice-mode-check');

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');

const menuMusicCheck = document.getElementById('menu-music-check');
const musicSlider = document.getElementById('music-slider');
const sfxSlider = document.getElementById('sfx-slider');

const varCSS = getComputedStyle(document.documentElement);

timerEl.textContent = START_TIME;

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

    if (visibleModals === 1 && isGameplayActive && !settings.practiceMode) {
        countdownOverlay.classList.remove('hidden');
        countdownOverlay.textContent = '3';
    }

    modal.classList.remove('visible');
    
    setTimeout(() => {
        if (!modal.classList.contains('visible')) {
           modal.classList.add('hidden');
           
           const anyVisible = document.querySelectorAll('.modal.visible').length > 0;
           const currentlyPlaying = isPlaying && overlayScreen.classList.contains('hidden');
           
           if (!anyVisible) {
               if (currentlyPlaying) {
                   if (!settings.practiceMode) {
                       startResumeCountdown();
                   } else {
                       togglePause(false);
                   }
               } else {
                   togglePause(false);
                   countdownOverlay.classList.add('hidden');
               }
           }
        }
    }, 300);
}

settingsBtn.addEventListener('click', () => openModal(settingsModal));
closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

leaderboardBtn.addEventListener('click', () => openModal(leaderboardModal));
closeLeaderboardBtn.addEventListener('click', () => closeModal(leaderboardModal));

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

function parseDate(dateStr) {
    if(!dateStr) return 0;
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
}

const handleInteractionEnd = (e) => {
    if (e.pointerType === 'mouse' && e.type !== 'pointerleave') {
        return;
    }

    if (isUserTouching) {
        isUserTouching = false;
        const rect = board.getBoundingClientRect();
        autoLight.x = Math.max(60, Math.min(rect.width - 60, autoLight.x));
        autoLight.y = Math.max(60, Math.min(rect.height - 60, autoLight.y));
        autoLight.dx = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
        autoLight.dy = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
    }
};

document.removeEventListener('pointerup', handleInteractionEnd);
document.removeEventListener('pointercancel', handleInteractionEnd);
document.removeEventListener('pointerleave', handleInteractionEnd);
uiBar.removeEventListener('mouseenter', handleInteractionEnd);
uiBar.removeEventListener('pointerenter', handleInteractionEnd);

container.addEventListener('pointerleave', handleInteractionEnd);
container.addEventListener('mouseleave', handleInteractionEnd);

document.addEventListener('pointerup', handleInteractionEnd);
document.addEventListener('pointercancel', handleInteractionEnd);

function preloadAssets() {
    const loadingText = document.getElementById('loading-text');
    
    const imagesToLoad = [
        'assets/img/background.png',
        ...CHARACTERS.map(c => `assets/img/wanted${c}.png`),
        ...CHARACTERS.map(c => `assets/img/sprite${c}.png`)
    ];

    const audioToLoad = [
        'assets/audio/luigiWrong.wav',
        'assets/audio/luigiTimeup.wav',
        'assets/audio/music.wav',
        'assets/audio/luigiCaught1.wav',
        'assets/audio/luigiCaught2.wav',
        'assets/audio/luigiCaught3.wav'
    ];

    const promises = [];

    imagesToLoad.forEach(src => {
        promises.push(new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src + '?v=' + Date.now();
        }));
    });

    audioToLoad.forEach(src => {
        promises.push(new Promise((resolve) => {
            const aud = new Audio();
            aud.oncanplaythrough = resolve;
            aud.onerror = resolve;
            setTimeout(resolve, 2000); 
            aud.src = src + '?v=' + Date.now();
            aud.preload = 'auto';
            aud.load();
        }));
    });
    
    if(loadingText) loadingText.textContent = "Chargement des assets...";
    console.log("Début du chargement...");

    return Promise.all(promises);
}

window.onload = async () => {
    if (window.lucide) lucide.createIcons();

    loadSettings();
    const hasSession = loadSession();
    
    const best = parseInt(localStorage.getItem('wanted_best_score')) || 0;
    if (best > 0) {
        bestScoreDisplay.textContent = `Record : ${best}`;
    } else {
        bestScoreDisplay.textContent = "Aucun record";
    }

    if (hasSession) {
        document.getElementById('overlay-desc').textContent = `Niveau ${level} - Score ${score}`;
    }

    await preloadAssets();

    if (settings.menuMusic && settings.musicVolume > 0) {
        const targetVol = settings.musicVolume * 0.3;
        audio.music.volume = 0; 
        const playPromise = audio.music.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                fadeAudioTo(targetVol, 2000);
            }).catch(error => {
                console.log("Autoplay bloqué.");
                const unlockAudio = () => {
                    audio.music.play().then(() => fadeAudioTo(targetVol, 2000));
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('touchstart', unlockAudio);
                };
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
            });
        }
    }

    initStartScreen();

    const loader = document.getElementById('loading-screen');
    if(loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.remove();
        }, 500);
    }
};

startBtn.addEventListener('click', () => {
    const hasSession = localStorage.getItem('wanted_current_session') !== null;
    startGame(hasSession);
});

function showConfirmModal(message, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMsg = document.getElementById('confirm-msg');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    confirmMsg.textContent = message;
    
    const handleYes = () => {
        closeModal(confirmModal);
        onConfirm();
        cleanup();
    };

    const handleNo = () => {
        closeModal(confirmModal);
        cleanup();
    };

    const cleanup = () => {
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);

    openModal(confirmModal);
}

if(quitGameBtn) {
    quitGameBtn.addEventListener('click', () => {
        showConfirmModal("Voulez-vous vraiment abandonner la partie en cours ?", () => {
            closeModal(settingsModal);
            quitGame();
        });
    });
}

resetBtn.addEventListener('click', () => {
    showConfirmModal("Voulez-vous vraiment recommencer à zéro ?", () => {
        localStorage.removeItem('wanted_current_session');
        initStartScreen();
    });
});