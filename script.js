const audio = new Audio();
let onlineList = [];
let localList = JSON.parse(localStorage.getItem('my_saved_songs')) || [];

// 1. Fetch Trending Songs
async function fetchTrending(query = 'hindi lofi') {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
    const data = await res.json();
    onlineList = data.results.map(t => ({
        name: t.trackName, artist: t.artistName,
        url: t.previewUrl, img: t.artworkUrl100.replace("100x100", "500x500")
    }));
    renderList('onlinePlaylist', onlineList);
}

// 2. Render Lists
function renderList(divId, songs) {
    const container = document.getElementById(divId);
    container.innerHTML = "";
    songs.forEach((s, i) => {
        container.innerHTML += `
            <div class="track" onclick="playMusic('${divId}', ${i})">
                <img src="${s.img}">
                <div>
                    <p><b>${s.name}</b></p>
                    <small style="color:var(--gray)">${s.artist}</small>
                </div>
            </div>`;
    });
}

// 3. Play Music Logic
function playMusic(type, index) {
    const list = type === 'onlinePlaylist' ? onlineList : localList;
    const song = list[index];
    
    audio.src = song.url;
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    document.getElementById("disk").style.backgroundImage = `url(${song.img})`;
    
    audio.play();
    document.getElementById("disk").classList.add("rotating");
    document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';
}

// 4. Local File Upload
document.getElementById("fileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    const newSongs = files.map(f => ({
        name: f.name.split('.')[0], 
        artist: "Local Device", 
        url: URL.createObjectURL(f), 
        img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"
    }));
    
    localList = [...newSongs, ...localList];
    // Save metadata to storage
    localStorage.setItem('my_saved_songs', JSON.stringify(localList.slice(0, 20))); 
    renderList('localPlaylist', localList);
};

// 5. Theme & Search
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("light-mode");
    const icon = document.querySelector("#themeToggle i");
    icon.className = document.body.classList.contains("light-mode") ? "ri-sun-line" : "ri-moon-line";
};

document.getElementById("searchBtn").onclick = () => {
    const q = document.getElementById("searchInput").value;
    if(q) fetchTrending(q);
};

// Init
fetchTrending();
renderList('localPlaylist', localList);