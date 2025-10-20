/* ========================================================================= */
/* =================== JAVASCRIPT-ЛОГИКА ПЛЕЕРА И ЭФФЕКТОВ ================= */
/* ========================================================================= */

// --- ЛОГИКА ДЛЯ ЭКРАНА ВХОДА И АВТОПЛЕЯ ---
const enterOverlay = document.getElementById('enter-overlay');
const audio = document.getElementById('audio-source');
let audioContext;
let analyser;

enterOverlay.addEventListener('click', () => {
    if (!audioContext) {
        setupAudioAPI();
        setupVisualizer();
    }
    
    audio.muted = false;
    audio.play();

    enterOverlay.style.opacity = '0';
    setTimeout(() => {
        enterOverlay.style.display = 'none';
    }, 500);
});


// --- ЛОГИКА ДЛЯ 3D-ЭФФЕКТА НАКЛОНА ---
const card = document.querySelector('.card-container');
if (card) {
    card.addEventListener('mousemove', (e) => {
        card.style.transition = 'transform 0.05s linear';
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = e.clientX - left; const y = e.clientY - top;
        const centerX = width / 2; const centerY = height / 2;
        const deltaX = x - centerX; const deltaY = y - centerY;
        const rotateIntensity = 0.04;
        const rotateX = -deltaY * rotateIntensity;
        const rotateY = deltaX * rotateIntensity;
        
        card.style.transform = `scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease-in-out';
        card.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)';
    });
}

// --- ЛОГИКА ДЛЯ АУДИОПЛЕЕРА ---
const playPauseBtn = document.getElementById('play-pause-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressHandle = document.getElementById('progress-handle');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const volumeIcon = document.getElementById('volume-icon');
const volumeSlider = document.getElementById('volume-slider');

function loadVolume() {
    const savedVolume = localStorage.getItem('playerVolume');
    if (savedVolume !== null) {
        audio.volume = savedVolume;
        volumeSlider.value = savedVolume;
    } else {
        audio.volume = 1;
        volumeSlider.value = 1;
    }
    updateVolumeIcon();
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function togglePlayPause() {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

function updatePlayPauseIcon() {
    if (audio.paused) {
        playPauseBtn.classList.remove('fa-pause');
        playPauseBtn.classList.add('fa-play');
    } else {
        playPauseBtn.classList.remove('fa-play');
        playPauseBtn.classList.add('fa-pause');
    }
}

function updateProgress() {
    if (audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${percentage}%`;
        progressHandle.style.left = `${percentage}%`;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }
}

function setProgress(e) {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if (duration) {
        audio.currentTime = (clickX / width) * duration;
    }
}

audio.addEventListener('durationchange', () => {
    totalDurationEl.textContent = formatTime(audio.duration);
});

volumeSlider.addEventListener('input', (e) => {
    audio.muted = false;
    audio.volume = e.target.value;
    localStorage.setItem('playerVolume', e.target.value);
});

function updateVolumeIcon() {
    if (audio.muted || audio.volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (audio.volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-low';
    } else {
        volumeIcon.className = 'fas fa-volume-high';
    }
}

volumeIcon.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
        localStorage.setItem('playerVolume', audio.volume);
    }
});

playPauseBtn.addEventListener('click', togglePlayPause);
audio.addEventListener('play', updatePlayPauseIcon);
audio.addEventListener('pause', updatePlayPauseIcon);
audio.addEventListener('timeupdate', updateProgress);
progressContainer.addEventListener('click', setProgress);
audio.addEventListener('volumechange', updateVolumeIcon);
audio.addEventListener('ended', () => {
    audio.currentTime = 0;
});

loadVolume();


// --- КОД ДЛЯ ВИЗУАЛАЙЗЕРА ---
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');
let dataArray;
let bufferLength;

function setupAudioAPI() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

function setupVisualizer() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    draw();
}

function draw() {
    requestAnimationFrame(draw);

    if (!analyser) return;
    
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let bassAmount = 0;
    const bassBins = Math.floor(bufferLength * 0.06);
    for (let i = 0; i < bassBins; i++) {
        bassAmount += dataArray[i];
    }
    bassAmount = (bassAmount / bassBins) / 255;

    if (bassAmount > 0.1) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const radius = canvas.height * bassAmount * 2;
        const opacity = 0.5 * bassAmount;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `rgba(118, 232, 245, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(118, 232, 245, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


// --- КОД ДЛЯ ДОЖДЯ ---
const rainCanvas = document.getElementById('rain-canvas');
const rainCtx = rainCanvas.getContext('2d');
rainCanvas.width = window.innerWidth;
rainCanvas.height = window.innerHeight;
let drops = [];
function createDrop() {
    return {
        x: Math.random() * rainCanvas.width,
        y: Math.random() * rainCanvas.height - rainCanvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 5 + 2,
        opacity: Math.random() * 0.5 + 0.2
    };
}
function createDrops() { for (let i = 0; i < 200; i++) { drops.push(createDrop()); } }
function drawRain() {
    rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    drops.forEach(drop => {
        rainCtx.beginPath();
        rainCtx.moveTo(drop.x, drop.y);
        rainCtx.lineTo(drop.x, drop.y + drop.length);
        rainCtx.strokeStyle = `rgba(118, 232, 245, ${drop.opacity})`;
        rainCtx.lineWidth = 1;
        rainCtx.stroke();
    });
    updateRain();
}
function updateRain() {
    drops.forEach(drop => {
        drop.y += drop.speed;
        if (drop.y > rainCanvas.height) {
            drop.y = 0 - drop.length;
            drop.x = Math.random() * rainCanvas.width;
        }
    });
}
function animateRain() { drawRain(); requestAnimationFrame(animateRain); }
window.addEventListener('resize', () => {
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;
    drops = [];
    createDrops();
});
createDrops();
animateRain();


// --- КОД ДЛЯ АВАТАРА DISCORD ---
const DISCORD_USER_ID = "928692326983933962";
async function fetchDiscordAvatar() {
    const avatarElement = document.getElementById('discord-avatar');
    if (!avatarElement) return;
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
        if (!response.ok) { console.error("Lanyard API Error."); return; }
        const { data } = await response.json();
        if (data && data.discord_user) {
            const user = data.discord_user;
            const avatarExtension = user.avatar.startsWith('a_') ? 'gif' : 'png';
            const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${avatarExtension}?size=256`;
            avatarElement.src = avatarUrl;
        }
    } catch (error) { console.error("Ошибка при загрузке аватара из Discord:", error); }
}
fetchDiscordAvatar();