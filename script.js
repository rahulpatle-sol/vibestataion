const audio = new Audio();
audio.crossOrigin = "anonymous"; // Brave aur Chrome ke liye zaroori hai
const playBtn = document.getElementById("playPause");
const disk = document.getElementById("disk");
const seekSlider = document.getElementById("seekSlider");
const volumeSlider = document.getElementById("volumeSlider");

let onlineSongs = [], localSongs = [], currentIndex = 0, currentMode = "online";

// 1. Play Function (Yahi missing tha bhai!)
function playSong(index, mode) {
    initVisualizer(); // Visualizer chalu karega
    currentMode = mode;
    currentIndex = index;
    
    const list = (mode === 'online') ? onlineSongs : localSongs;
    const song = list[index];

    if (!song) return;

    // UI Updates
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    disk.style.backgroundImage = `url(${song.img})`;

    // Audio Load aur Play
    audio.src = song.url;
    audio.load(); // Brave ko batana padta hai ki naya maal aaya hai
    
    // Play promise handle karna zaroori hai
    let playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            updateUI();
        }).catch(error => {
            console.log("Bhai, browser ne block kiya: ", error);
            // Agar block ho jaye toh manual click chahiye hota hai
            alert("Brave Shield ki wajah se gaana block hua. Lion icon off karke dubara play karo!");
        });
    }
}

// 2. Visualizer Setup
let audioCtx, analyser, canvas, ctx, dataArray;
function initVisualizer() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        canvas = document.getElementById("visualizer");
        ctx = canvas.getContext("2d");
        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser); analyser.connect(audioCtx.destination);
        analyser.fftSize = 64;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        draw();
    } catch(e) { console.log("Visualizer blocked"); }
}

function draw() {
    requestAnimationFrame(draw);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let barWidth = (canvas.width / 32) * 2;
    let x = 0;
    dataArray.forEach(v => {
        let h = (v/255) * canvas.height;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "#00f2fe";
        ctx.fillRect(x, canvas.height - h, barWidth - 2, h);
        x += barWidth;
    });
}

// 3. Search Logic
async function fetchOnline(q = 'hindi trending') {
    const listDiv = document.getElementById("onlinePlaylist");
    listDiv.innerHTML = "<p>Bhai vibes load ho rahi hain...</p>";
    
    const url = `https://saavn-api-beta-one.vercel.app/api/search/songs?query=${encodeURIComponent(q)}`;

    try {
        const res = await fetch(url);
        const result = await res.json();
        const songs = result.data.results || result.data;

        if (songs && songs.length > 0) {
            onlineSongs = songs.map(s => ({
                name: s.name.replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                artist: s.primaryArtists || "Unknown Artist",
                url: s.downloadUrl[s.downloadUrl.length - 1].url || s.downloadUrl[s.downloadUrl.length - 1].link,
                img: s.image[s.image.length - 1].url || s.image[s.image.length - 1].link
            }));
            renderList("onlinePlaylist", onlineSongs, 'online');
        } else {
            listDiv.innerHTML = "<p>Bhai gaana nahi mila!</p>";
        }
    } catch (e) {
        console.log("JioSaavn down hai, backup system chalu...");
        fetchFallback(q);
    }
}

async function fetchFallback(q) {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=15`);
    const data = await res.json();
    onlineSongs = data.results.map(t => ({
        name: t.trackName, 
        artist: t.artistName,
        url: t.previewUrl,
        img: t.artworkUrl100.replace("100x100", "500x500")
    }));
    renderList("onlinePlaylist", onlineSongs, 'online');
}

// 4. UI aur Control
function updateUI() {
    playBtn.innerHTML = audio.paused ? '<i class="ri-play-fill"></i>' : '<i class="ri-pause-fill"></i>';
    audio.paused ? disk.classList.remove("rotating") : disk.classList.add("rotating");
}

playBtn.onclick = () => { 
    if (audio.src) {
        audio.paused ? audio.play() : audio.pause(); 
        updateUI(); 
    }
};

audio.ontimeupdate = () => {
    if(isFinite(audio.duration)) {
        seekSlider.value = (audio.currentTime / audio.duration) * 100;
        document.getElementById("currentTime").innerText = formatTime(audio.currentTime);
        document.getElementById("duration").innerText = formatTime(audio.duration);
    }
};

seekSlider.oninput = () => { if(isFinite(audio.duration)) audio.currentTime = (seekSlider.value / 100) * audio.duration; };
volumeSlider.oninput = () => { audio.volume = volumeSlider.value / 100; };

function formatTime(s) {
    let m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function renderList(id, list, mode) {
    const el = document.getElementById(id);
    el.innerHTML = "";
    list.forEach((s, i) => {
        el.innerHTML += `
            <div class="track" onclick="playSong(${i}, '${mode}')">
                <img src="${s.img}">
                <div style="flex:1; overflow:hidden">
                    <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</b>
                    <small style="color:var(--gray)">${s.artist}</small>
                </div>
            </div>`;
    });
}

// Theme aur Search
document.getElementById("themeToggle").onclick = () => document.body.classList.toggle("light-mode");
document.getElementById("searchInput").onkeypress = (e) => { if(e.key === "Enter") fetchOnline(e.target.value); };

// Local Files logic same rahega
document.getElementById("fileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    localSongs = files.map(f => ({
        name: f.name.split('.')[0], artist: "Local", url: URL.createObjectURL(f),
        img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"
    }));
    renderList("localPlaylist", localSongs, 'local');
};

// Next/Prev
document.getElementById("next").onclick = () => {
    let len = (currentMode === 'online') ? onlineSongs.length : localSongs.length;
    playSong((currentIndex + 1) % len, currentMode);
};
document.getElementById("prev").onclick = () => {
    let len = (currentMode === 'online') ? onlineSongs.length : localSongs.length;
    playSong((currentIndex - 1 + len) % len, currentMode);
};

fetchOnline();