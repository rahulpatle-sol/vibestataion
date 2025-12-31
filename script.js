const audio = new Audio();
audio.crossOrigin = "anonymous";
let onlineSongs = [], currentIndex = 0, currentMode = 'online';

// 1. Storage & Load
window.onload = () => {
    refreshSavedUI();
    refreshPlaylistUI();
    refreshPlaylistSelector();
    fetchOnline('trending hindi');
    initializePlayer();
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
    } catch(e) { 
        list.innerHTML = "<p style='padding:20px;color:var(--muted)'>Offline vibes only.</p>"; 
    }
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
                    <small style="color:var(--muted)">${s.artist}</small>
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

    // Expand player on mobile when song starts
    if(window.innerWidth <= 768) {
        document.getElementById("mainPlayer").classList.remove("minimized");
    }

    if(mode === 'online') saveToVibe(song);
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
function initializePlayer() {
    const playPauseBtn = document.getElementById("playPause");
    const nextBtn = document.getElementById("next");
    const prevBtn = document.getElementById("prev");
    const seekSlider = document.getElementById("seekSlider");
    const volumeSlider = document.getElementById("volumeSlider");
    const minimizeBtn = document.getElementById("minimizeBtn");
    const searchInput = document.getElementById("searchInput");

    // Play/Pause
    playPauseBtn.onclick = () => {
        if(audio.paused) {
            audio.play();
            playPauseBtn.innerHTML = '<i class="ri-pause-fill"></i>';
            document.getElementById("disk").classList.add("rotating");
        } else {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="ri-play-fill"></i>';
            document.getElementById("disk").classList.remove("rotating");
        }
    };

    // Next/Prev
    nextBtn.onclick = () => {
        const list = currentMode === 'online' ? onlineSongs : JSON.parse(localStorage.getItem('myVibe') || '[]');
        const nextIndex = (currentIndex + 1) % list.length;
        playSong(nextIndex, currentMode);
    };

    prevBtn.onclick = () => {
        const list = currentMode === 'online' ? onlineSongs : JSON.parse(localStorage.getItem('myVibe') || '[]');
        const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : list.length - 1;
        playSong(prevIndex, currentMode);
    };

    // Progress
    audio.ontimeupdate = () => {
        const prog = (audio.currentTime / audio.duration) * 100;
        seekSlider.value = prog || 0;
        document.getElementById("currentTime").innerText = formatTime(audio.currentTime);
        document.getElementById("duration").innerText = formatTime(audio.duration || 0);
    };

    seekSlider.oninput = (e) => {
        audio.currentTime = (e.target.value/100) * audio.duration;
    };

    // Volume
    volumeSlider.oninput = (e) => {
        audio.volume = e.target.value/100;
    };
    audio.volume = 0.8;

    // Minimize/Maximize
    if(minimizeBtn) {
        minimizeBtn.onclick = (e) => {
            e.stopPropagation();
            document.getElementById("mainPlayer").classList.toggle("minimized");
        };
    }

    // Search
    searchInput.onkeypress = (e) => { 
        if(e.key === 'Enter') {
            fetchOnline(e.target.value);
        }
    };
}

function switchTab(t) {
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.list').forEach(l => l.classList.remove('active'));
    document.getElementById(t + "Playlist").classList.add('active');
    event.currentTarget.classList.add('active');
}

function formatTime(s) {
    if(isNaN(s)) return '0:00';
    let m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

// 4. Playlist Management
function getPlaylists() {
    return JSON.parse(localStorage.getItem('vibePlaylists') || "{}");
}

function setPlaylists(obj) {
    localStorage.setItem('vibePlaylists', JSON.stringify(obj));
}

function refreshPlaylistSelector() {
    const select = document.getElementById('playlistSelect');
    const playlists = getPlaylists();
    select.innerHTML = '<option value="" disabled selected>Select playlist</option>';
    Object.keys(playlists).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// Create playlist
document.getElementById('createPlaylistBtn').onclick = () => {
    const nameInput = document.getElementById('playlistNameInput');
    const name = nameInput.value.trim();
    if (!name) return alert('Enter a playlist name!');
    const playlists = getPlaylists();
    if (playlists[name]) return alert('Playlist already exists!');
    playlists[name] = [];
    setPlaylists(playlists);
    nameInput.value = '';
    refreshPlaylistUI();
    refreshPlaylistSelector();
};

function refreshPlaylistUI() {
    const playlists = getPlaylists();
    const allList = document.getElementById('allPlaylistsList');
    allList.innerHTML = '';

    Object.keys(playlists).forEach(name => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${name}</span><div class="actions">
            <button onclick="loadPlaylist('${name}')"><i class="ri-play-line"></i> Open</button>
            <button onclick="deletePlaylist('${name}')"><i class="ri-delete-bin-6-line"></i></button>
        </div>`;
        allList.appendChild(li);
    });
}

function loadPlaylist(name) {
    const playlists = getPlaylists();
    const songs = playlists[name] || [];
    const currentList = document.getElementById('currentPlaylistList');
    currentList.innerHTML = '';

    songs.forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${s.name} — ${s.artist}</span>
            <div class="actions">
                <button onclick="playCustomSongFromPlaylist('${name}', ${i})"><i class="ri-play-line"></i></button>
                <button onclick="removeFromPlaylist('${name}', '${s.url}')"><i class="ri-subtract-line"></i></button>
            </div>`;
        currentList.appendChild(li);
    });

    localStorage.setItem('currentPlaylistName', name);
}

function deletePlaylist(name) {
    if(!confirm(`Delete playlist "${name}"?`)) return;
    const playlists = getPlaylists();
    delete playlists[name];
    setPlaylists(playlists);
    if (localStorage.getItem('currentPlaylistName') === name) {
        localStorage.removeItem('currentPlaylistName');
        document.getElementById('currentPlaylistList').innerHTML = '';
    }
    refreshPlaylistUI();
    refreshPlaylistSelector();
}

function playCustomSongFromPlaylist(name, idx) {
    const playlists = getPlaylists();
    const song = (playlists[name] || [])[idx];
    if (!song) return;
    playCustomSong(song);
}

function removeFromPlaylist(name, url) {
    const playlists = getPlaylists();
    const arr = playlists[name] || [];
    playlists[name] = arr.filter(s => s.url !== url);
    setPlaylists(playlists);
    loadPlaylist(name);
}

function playCustomSong(song) {
    audio.src = song.url;
    audio.play();
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    document.getElementById("disk").style.backgroundImage = `url(${song.img})`;
    document.getElementById("disk").classList.add("rotating");
    document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';

    // Expand player on mobile
    if(window.innerWidth <= 768) {
        document.getElementById("mainPlayer").classList.remove("minimized");
    }
}

// Add current to playlist
document.getElementById('addCurrentToPlaylist').onclick = () => {
    const select = document.getElementById('playlistSelect');
    const name = select.value;
    if (!name) return alert('Select a playlist first.');

    const list = currentMode === 'online'
        ? onlineSongs
        : JSON.parse(localStorage.getItem('myVibe') || '[]');

    const song = list[currentIndex];
    if (!song) return alert('No current song found.');
    addToPlaylist(name, song);
    alert(`Added "${song.name}" to "${name}"!`);
};

function addToPlaylist(name, song) {
    const playlists = getPlaylists();
    if (!playlists[name]) return alert('Playlist not found.');

    if (!playlists[name].some(s => s.url === song.url)) {
        playlists[name].push(song);
        setPlaylists(playlists);
        const selected = localStorage.getItem('currentPlaylistName');
        if (selected === name) loadPlaylist(name);
    }
}

// Theme toggle
(function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const themeSwitch = document.getElementById('themeSwitch');
    if(themeSwitch) {
        themeSwitch.checked = saved === 'light';
        themeSwitch.addEventListener('change', (e) => {
            const next = e.target.checked ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
})();

// Auto-play next song
audio.onended = () => {
    const list = currentMode === 'online' ? onlineSongs : JSON.parse(localStorage.getItem('myVibe') || '[]');
    const nextIndex = (currentIndex + 1) % list.length;
    playSong(nextIndex, currentMode);
};