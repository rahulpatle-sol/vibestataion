const audio = new Audio();
audio.crossOrigin = "anonymous";

const playlistEl = document.getElementById("playlist");
const disk = document.getElementById("disk");
const playBtn = document.getElementById("playPause");
const fillBar = document.getElementById("fillBar");

let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;

// --- 1. Load LocalStorage on Startup ---
window.onload = () => {
    const savedData = localStorage.getItem('vibe_pro_list');
    if (savedData) {
        currentPlaylist = JSON.parse(savedData);
        renderPlaylist();
    } else {
        fetchOnline(); // Default online songs
    }
};

async function fetchOnline() {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=lofi&entity=song&limit=10`);
        const data = await res.json();
        currentPlaylist = data.results.map(t => ({
            name: t.trackName, artist: t.artistName,
            url: t.previewUrl, img: t.artworkUrl100.replace("100x100", "500x500")
        }));
        renderPlaylist();
    } catch (e) { console.error("API error"); }
}

function renderPlaylist() {
    playlistEl.innerHTML = "";
    currentPlaylist.forEach((song, i) => {
        const div = document.createElement("div");
        div.className = `track ${i === currentIndex ? 'active' : ''}`;
        div.innerHTML = `<img src="${song.img}"><div><h4>${song.name}</h4><p>${song.artist}</p></div>`;
        div.onclick = () => playSong(i);
        playlistEl.appendChild(div);
    });
}

function playSong(index) {
    currentIndex = index;
    const song = currentPlaylist[index];
    
    // SOUND FIX: Check if URL exists
    if(!song.url) { alert("Song URL not found!"); return; }

    audio.src = song.url;
    audio.load(); // Force load
    
    disk.style.backgroundImage = `url(${song.img})`;
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    
    audio.play().then(() => {
        isPlaying = true;
        updateUI();
    }).catch(e => console.error("Play failed", e));
}

function updateUI() {
    playBtn.innerHTML = isPlaying ? '<i class="ri-pause-fill"></i>' : '<i class="ri-play-fill"></i>';
    isPlaying ? disk.classList.add("rotating") : disk.classList.remove("rotating");
}

playBtn.onclick = () => {
    if(audio.paused) { audio.play(); isPlaying = true; }
    else { audio.pause(); isPlaying = false; }
    updateUI();
};

// Next/Prev
document.getElementById("next").onclick = () => playSong((currentIndex + 1) % currentPlaylist.length);
document.getElementById("prev").onclick = () => playSong((currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length);

// Progress Bar
audio.ontimeupdate = () => {
    const p = (audio.currentTime / audio.duration) * 100 || 0;
    fillBar.style.width = p + "%";
    document.getElementById("currTime").innerText = Math.floor(audio.currentTime/60) + ":" + Math.floor(audio.currentTime%60).toString().padStart(2,'0');
};

// Local Files logic
document.getElementById("addFiles").onclick = () => document.getElementById("fileInput").click();
document.getElementById("fileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    const localSongs = files.map(f => ({
        name: f.name.split('.')[0], artist: "Local",
        url: URL.createObjectURL(f), img: "https://images.unsplash.com/photo-1459749411177-042180ceea72?w=500"
    }));
    currentPlaylist = [...localSongs, ...currentPlaylist];
    localStorage.setItem('vibe_pro_list', JSON.stringify(currentPlaylist.slice(0,10))); // Save metadata
    renderPlaylist();
};