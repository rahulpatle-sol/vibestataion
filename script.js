// --- SETUP & VARIABLES ---
const audio = new Audio();
audio.crossOrigin = "anonymous"; // IMPORTANT for visualizer to work with external files

const playlistEl = document.getElementById("playlist");
const disk = document.getElementById("disk");
const playBtn = document.getElementById("playPause");
const loader = document.getElementById("loader");
const searchInput = document.getElementById("searchInput");
const fillBar = document.getElementById("fillBar");
const volFillBar = document.getElementById("volFillBar");
const volIcon = document.getElementById("volIcon");

let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;

// Visualizer Variables
let audioCtx, analyser, source, canvas, ctx, dataArray;
let isVisualizerSetup = false;

// --- MAST CONTENT (Premium Fallback Playlist) ---
// Ye gaane tab chalenge jab internet nahi hoga ya API fail hogi.
const fallbackSongs = [
    { name: "Chill Lofi Study", artist: "Unknown Artist", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", img: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?w=500&auto=format&fit=crop&q=60" },
    { name: "Night Drive Beats", artist: "Synthwave Pro", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", img: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=500&auto=format&fit=crop&q=60" },
    { name: "Ocean Waves Vibes", artist: "Relax Sounds", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60" },
    { name: "Jazzy Hip Hop", artist: "Groove Master", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60" },
    { name: "Ambient Piano", artist: "Dreamscape", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", img: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&auto=format&fit=crop&q=60" }
];

function toggleLoader(show) {
    if(show) loader.classList.add("visible");
    else loader.classList.remove("visible");
}

// --- ONLINE SEARCH ---
async function fetchSongs(query = "lofi hip hop chill beats") { // Default query mast kar di
    toggleLoader(true);
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
        const data = await res.json();
        
        if (data.resultCount === 0) throw new Error("No results");

        currentPlaylist = data.results.map(track => ({
            name: track.trackName,
            artist: track.artistName,
            url: track.previewUrl,
            img: track.artworkUrl100.replace("100x100", "600x600")
        })).filter(s => s.url);

        renderPlaylist();
    } catch (err) {
        console.warn("API issue, loading fallback content.", err);
        currentPlaylist = fallbackSongs; // Error aane par mast content load karo
        renderPlaylist();
    } finally {
        toggleLoader(false);
    }
}

// --- RENDER PLAYLIST ---
function renderPlaylist() {
    playlistEl.innerHTML = "";
    currentPlaylist.forEach((song, i) => {
        const div = document.createElement("div");
        div.className = `track ${i === currentIndex ? 'active' : ''}`;
        div.innerHTML = `
            <img src="${song.img}" loading="lazy">
            <div class="info">
                <h4>${song.name}</h4>
                <p>${song.artist}</p>
            </div>
        `;
        div.onclick = () => playSong(i);
        playlistEl.appendChild(div);
    });
}

// --- PLAYER LOGIC ---
function playSong(index) {
    currentIndex = index;
    const song = currentPlaylist[index];
    
    audio.src = song.url;
    disk.style.backgroundImage = `url(${song.img})`;
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    
    // Highlight active track
    document.querySelectorAll('.track').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });

    playAudio();
}

function playAudio() {
    // User interaction ke baad hi audio context start hota hai
    if (!isVisualizerSetup) setupVisualizer();

    audio.play().then(() => {
        isPlaying = true;
        updateUI();
    }).catch(err => console.error("Play error:", err));
}

function pauseAudio() {
    audio.pause();
    isPlaying = false;
    updateUI();
}

function updateUI() {
    playBtn.innerHTML = isPlaying ? '<i class="ri-pause-fill"></i>' : '<i class="ri-play-fill"></i>';
    if(isPlaying) disk.classList.add("rotating");
    else disk.classList.remove("rotating");
}

playBtn.onclick = () => isPlaying ? pauseAudio() : playAudio();
document.getElementById("next").onclick = () => playSong((currentIndex + 1) % currentPlaylist.length);
document.getElementById("prev").onclick = () => playSong((currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length);
audio.onended = () => document.getElementById("next").click();

// --- VISUALIZER SETUP (The New Mast Feature!) ---
function setupVisualizer() {
    isVisualizerSetup = true;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    canvas = document.getElementById("visualizer");
    ctx = canvas.getContext("2d");

    // Connect audio element to analyser
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    // Settings for the bars
    analyser.fftSize = 128; // Controls number of bars (must be power of 2)
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    
    analyser.getByteFrequencyData(dataArray);
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / dataArray.length) * 1.2;
    let x = 0;

    // Create a cool gradient for the bars
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'var(--primary)');
    gradient.addColorStop(1, 'var(--accent)');
    ctx.fillStyle = gradient;

    dataArray.forEach(value => {
        // Make bars respond nicely to volume
        const barHeight = (value / 255) * height * 1.2;
        // Draw rounded bars
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
    });
}


// --- SLIDERS & EVENTS ---
audio.ontimeupdate = () => {
    const prog = (audio.currentTime / audio.duration) * 100 || 0;
    document.getElementById("progress").value = prog;
    fillBar.style.width = prog + "%";
    document.getElementById("currTime").innerText = formatTime(audio.currentTime);
};
audio.onloadedmetadata = () => document.getElementById("durTime").innerText = formatTime(audio.duration);
document.getElementById("progress").oninput = (e) => audio.currentTime = (e.target.value / 100) * audio.duration;

document.getElementById("volume").oninput = (e) => {
    const vol = e.target.value;
    audio.volume = vol;
    volFillBar.style.width = vol * 100 + "%";
    volIcon.className = vol == 0 ? "ri-volume-mute-line" : vol < 0.5 ? "ri-volume-down-line" : "ri-volume-up-line";
};

function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

// --- MODE & SEARCH ---
document.getElementById("searchBtn").onclick = () => fetchSongs(searchInput.value);
searchInput.onkeypress = (e) => { if(e.key === 'Enter') fetchSongs(searchInput.value); };

document.getElementById("onlineMode").onclick = (e) => switchMode("online", e.target);
document.getElementById("localMode").onclick = (e) => switchMode("local", e.target);

function switchMode(mode, btn) {
    document.querySelectorAll('.mode-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const addBtn = document.getElementById("addFiles");
    const searchContainer = document.querySelector(".search-bar");
    
    if(mode === "local") {
        addBtn.style.display = "flex";
        searchContainer.style.visibility = "hidden";
        document.getElementById("listTitle").innerText = "My Local Tracks";
        playlistEl.innerHTML = "<p style='padding:20px; color:var(--text-muted)'>Import files to start playing.</p>";
        pauseAudio();
    } else {
        addBtn.style.display = "none";
        searchContainer.style.visibility = "visible";
        document.getElementById("listTitle").innerText = "Trending Vibes";
        if(currentPlaylist.length === 0 || currentPlaylist === fallbackSongs) fetchSongs();
    }
}

document.getElementById("addFiles").onclick = () => document.getElementById("fileInput").click();
document.getElementById("fileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    currentPlaylist = files.map(f => ({
        name: f.name.replace(/\.[^/.]+$/, ""), artist: "Local File", url: URL.createObjectURL(f), img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500"
    }));
    renderPlaylist();
    playSong(0);
};

// --- INIT ---
fetchSongs(); // Load mast content on start