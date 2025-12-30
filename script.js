const audio = new Audio();
audio.crossOrigin = "anonymous";
const playBtn = document.getElementById("playPause");
const disk = document.getElementById("disk");
const seekSlider = document.getElementById("seekSlider");
const volumeSlider = document.getElementById("volumeSlider");

let onlineSongs = [];
let localSongs = [];
let currentIndex = 0;
let currentMode = "online";

// 1. Visualizer Setup
let audioCtx, analyser, source, canvas, ctx, dataArray;
function initVisualizer() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    canvas = document.getElementById("visualizer");
    ctx = canvas.getContext("2d");
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let barWidth = (canvas.width / dataArray.length) * 2;
    let x = 0;
    dataArray.forEach(v => {
        let h = (v / 255) * canvas.height;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        ctx.fillRect(x, canvas.height - h, barWidth - 2, h);
        x += barWidth;
    });
}

// 2. Play Function
function playSong(index, mode) {
    initVisualizer();
    currentMode = mode;
    currentIndex = index;
    const song = (mode === 'online') ? onlineSongs[index] : localSongs[index];
    
    audio.src = song.url;
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    disk.style.backgroundImage = `url(${song.img})`;
    
    audio.play();
    isPlaying = true;
    updateUI();
}

function updateUI() {
    playBtn.innerHTML = audio.paused ? '<i class="ri-play-fill"></i>' : '<i class="ri-pause-fill"></i>';
    audio.paused ? disk.classList.remove("rotating") : disk.classList.add("rotating");
}

playBtn.onclick = () => {
    audio.paused ? audio.play() : audio.pause();
    updateUI();
};

// 3. Sliders Logic
audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    seekSlider.value = progress;
    document.getElementById("currentTime").innerText = formatTime(audio.currentTime);
    document.getElementById("duration").innerText = formatTime(audio.duration);
};

seekSlider.oninput = () => {
    audio.currentTime = (seekSlider.value / 100) * audio.duration;
};

volumeSlider.oninput = () => {
    audio.volume = volumeSlider.value / 100;
};

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

// 4. Fetch Online & Local
async function fetchOnline(q = 'lofi') {
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=15`);
    const data = await res.json();
    onlineSongs = data.results.map(t => ({
        name: t.trackName, artist: t.artistName, url: t.previewUrl, img: t.artworkUrl100.replace("100x100", "500x500")
    }));
    renderList("onlinePlaylist", onlineSongs, 'online');
}

function renderList(id, list, mode) {
    const el = document.getElementById(id);
    el.innerHTML = "";
    list.forEach((s, i) => {
        el.innerHTML += `<div class="track" onclick="playSong(${i}, '${mode}')"><img src="${s.img}"><div><b>${s.name}</b><br><small>${s.artist}</small></div></div>`;
    });
}

document.getElementById("fileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    localSongs = files.map(f => ({
        name: f.name.split('.')[0], artist: "Local", url: URL.createObjectURL(f), img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"
    }));
    renderList("localPlaylist", localSongs, 'local');
};

// Next/Prev
document.getElementById("next").onclick = () => playSong((currentIndex + 1) % (currentMode === 'online' ? onlineSongs.length : localSongs.length), currentMode);
document.getElementById("prev").onclick = () => playSong((currentIndex - 1 + (currentMode === 'online' ? onlineSongs.length : localSongs.length)) % (currentMode === 'online' ? onlineSongs.length : localSongs.length), currentMode);

// Theme Toggle
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("light-mode");
};

fetchOnline();

// --- SEARCH LOGIC (Enter key support) ---
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keyup", function(event) {
    // 13 is the "Enter" key code
    if (event.key === "Enter") {
        const query = searchInput.value.trim();
        if (query) {
            fetchOnline(query); // Call your existing fetch function
        }
    }
});

// --- THEME TOGGLE LOGIC ---
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

themeToggle.onclick = () => {
    body.classList.toggle("light-mode");
    
    // Save preference to localStorage
    const isLight = body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");

    // Update Icon
    const icon = themeToggle.querySelector("i");
    if (isLight) {
        icon.className = "ri-sun-fill";
        themeToggle.style.background = "#000";
        themeToggle.style.color = "#fff";
    } else {
        icon.className = "ri-moon-clear-line";
        themeToggle.style.background = "#fff";
        themeToggle.style.color = "#000";
    }
};

// Check for saved theme on load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        body.classList.add("light-mode");
        themeToggle.querySelector("i").className = "ri-sun-fill";
        themeToggle.style.background = "#000";
        themeToggle.style.color = "#fff";
    }
});

// --- YOUR EXISTING FETCH FUNCTION (Make sure it looks like this) ---
async function fetchOnline(q) {
    // Add loader if you have one
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=20`);
    const data = await res.json();
    
    if (data.results.length > 0) {
        onlineSongs = data.results.map(t => ({
            name: t.trackName, 
            artist: t.artistName, 
            url: t.previewUrl, 
            img: t.artworkUrl100.replace("100x100", "500x500")
        }));
        renderList("onlinePlaylist", onlineSongs, 'online');
    } else {
        console.log("No results found");
    }
}