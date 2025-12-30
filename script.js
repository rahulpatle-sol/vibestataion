const audio = new Audio();
audio.crossOrigin = "anonymous";
let onlineSongs = [], currentIndex = 0, currentMode = 'online';

// 1. Storage & Load
window.onload = () => {
    refreshSavedUI();
    fetchOnline('trending hindi');
};

async function fetchOnline(q) {
    const list = document.getElementById("onlinePlaylist");
    list.innerHTML = "<p style='padding:20px'>Vibing...</p>";
    try {
        const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(q)}&limit=15`);
        const result = await res.json();
        if(result.success) {
            onlineSongs = result.data.results.map(s => ({
                name: s.name.replace(/&quot;/g, '"'),
                artist: s.artists.primary[0].name,
                url: s.downloadUrl[s.downloadUrl.length - 1].url,
                img: s.image[s.image.length - 1].url
            }));
            renderList("onlinePlaylist", onlineSongs, 'online');
        }
    } catch(e) { list.innerHTML = "Offline vibes only."; }
}

function renderList(id, songs, mode) {
    const el = document.getElementById(id);
    el.innerHTML = "";
    songs.forEach((s, i) => {
        el.innerHTML += `
            <div class="track" onclick="playSong(${i}, '${mode}')">
                <img src="${s.img}">
                <div style="flex:1; overflow:hidden">
                    <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</b>
                    <small style="color:#777">${s.artist}</small>
                </div>
            </div>`;
    });
}

// 2. Play & Save
function playSong(idx, mode) {
    const list = mode === 'online' ? onlineSongs : JSON.parse(localStorage.getItem('myVibe') || '[]');
    const song = list[idx];
    if(!song) return;

    currentIndex = idx;
    currentMode = mode;
    audio.src = song.url;
    audio.play();
    
    // UI Update
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    document.getElementById("disk").style.backgroundImage = `url(${song.img})`;
    document.getElementById("disk").classList.add("rotating");
    document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';

    if(mode === 'online') saveToVibe(song);
    initVisualizer();
}

function saveToVibe(song) {
    let vibe = JSON.parse(localStorage.getItem('myVibe') || '[]');
    if(!vibe.some(s => s.url === song.url)) {
        vibe.unshift(song);
        localStorage.setItem('myVibe', JSON.stringify(vibe));
        refreshSavedUI();
    }
}

function refreshSavedUI() {
    const vibe = JSON.parse(localStorage.getItem('myVibe') || '[]');
    renderList("savedPlaylist", vibe, 'saved');
}

// 3. UI Controls
document.getElementById("playPause").onclick = () => {
    if(audio.paused) {
        audio.play();
        document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';
        document.getElementById("disk").classList.add("rotating");
    } else {
        audio.pause();
        document.getElementById("playPause").innerHTML = '<i class="ri-play-fill"></i>';
        document.getElementById("disk").classList.remove("rotating");
    }
};

document.getElementById("next").onclick = () => playSong(currentIndex + 1, currentMode);
document.getElementById("prev").onclick = () => playSong(currentIndex - 1, currentMode);

audio.ontimeupdate = () => {
    const prog = (audio.currentTime / audio.duration) * 100;
    document.getElementById("seekSlider").value = prog || 0;
    document.getElementById("currentTime").innerText = formatTime(audio.currentTime);
    document.getElementById("duration").innerText = formatTime(audio.duration || 0);
};

document.getElementById("seekSlider").oninput = (e) => audio.currentTime = (e.target.value/100) * audio.duration;
document.getElementById("volumeSlider").oninput = (e) => audio.volume = e.target.value/100;

document.getElementById("minimizeBtn").onclick = () => document.getElementById("mainPlayer").classList.toggle("minimized");
document.getElementById("searchInput").onkeypress = (e) => { if(e.key === 'Enter') fetchOnline(e.target.value); };

function switchTab(t) {
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.list').forEach(l => l.classList.remove('active'));
    document.getElementById(t + "Playlist").classList.add('active');
    event.currentTarget.classList.add('active');
}

function formatTime(s) {
    let m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

// Visualizer (Beat Detection)
let audioCtx, analyser, dataArray, canvas, ctx;
function initVisualizer() {
    if(audioCtx) return;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser); analyser.connect(audioCtx.destination);
    canvas = document.getElementById("visualizer");
    ctx = canvas.getContext("2d");
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    draw();
}

function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0,0,canvas.width, canvas.height);
    dataArray.forEach((v, i) => {
        if(i % 10 === 0) {
            ctx.fillStyle = `rgba(0, 242, 254, 0.2)`;
            ctx.fillRect(i * 3, canvas.height, 10, -v/2);
        }
    });
}