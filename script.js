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


//  palylist section
// 4. Playlist Creation & Storage
document.getElementById("createPlaylistBtn").onclick = () => {
    const name = document.getElementById("playlistNameInput").value.trim();
    if (!name) return alert("Enter a playlist name!");

    let playlists = JSON.parse(localStorage.getItem("vibePlaylists") || "{}");
    if (playlists[name]) return alert("Playlist already exists!");

    playlists[name] = [];
    localStorage.setItem("vibePlaylists", JSON.stringify(playlists));
    document.getElementById("playlistNameInput").value = "";
    refreshPlaylistUI();
};

function refreshPlaylistUI() {
    const playlists = JSON.parse(localStorage.getItem("vibePlaylists") || "{}");
    const allList = document.getElementById("allPlaylistsList");
    allList.innerHTML = "";

    Object.keys(playlists).forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        li.onclick = () => loadPlaylist(name);
        allList.appendChild(li);
    });
}

function loadPlaylist(name) {
    const playlists = JSON.parse(localStorage.getItem("vibePlaylists") || "{}");
    const songs = playlists[name] || [];
    const currentList = document.getElementById("currentPlaylistList");
    currentList.innerHTML = "";

    songs.forEach((s, i) => {
        const li = document.createElement("li");
        li.innerText = `${s.name} - ${s.artist}`;
        li.onclick = () => playCustomSong(s);
        currentList.appendChild(li);
    });
}

function playCustomSong(song) {
    audio.src = song.url;
    audio.play();
    document.getElementById("trackTitle").innerText = song.name;
    document.getElementById("trackArtist").innerText = song.artist;
    document.getElementById("disk").style.backgroundImage = `url(${song.img})`;
    document.getElementById("disk").classList.add("rotating");
    document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';
    initVisualizer();
}

// Optional: Add song to a selected playlist
function addToPlaylist(name, song) {
    let playlists = JSON.parse(localStorage.getItem("vibePlaylists") || "{}");
    if (!playlists[name]) return;

    if (!playlists[name].some(s => s.url === song.url)) {
        playlists[name].push(song);
        localStorage.setItem("vibePlaylists", JSON.stringify(playlists));
        loadPlaylist(name);
    }
}

// Call this on load
window.onload = () => {
    refreshSavedUI();
    refreshPlaylistUI();
    fetchOnline('trending hindi');
};
// Persisted theme
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeSwitch').checked = saved === 'light';
  document.getElementById('themeSwitch').addEventListener('change', (e) => {
    const next = e.target.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

// Playlist storage helpers
function getPlaylists() {
  return JSON.parse(localStorage.getItem('vibePlaylists') || "{}");
}
function setPlaylists(obj) {
  localStorage.setItem('vibePlaylists', JSON.stringify(obj));
}

// Populate playlist selector in player
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

// Render all playlists and current selection
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

  // Render songs in current playlist
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${s.name} — ${s.artist}</span>
      <div class="actions">
        <button onclick="playCustomSongFromPlaylist('${name}', ${i})"><i class="ri-play-line"></i></button>
        <button onclick="removeFromPlaylist('${name}', '${s.url}')"><i class="ri-subtract-line"></i></button>
      </div>`;
    currentList.appendChild(li);
  });

  // Store selected current playlist for quick-add
  localStorage.setItem('currentPlaylistName', name);
}

function deletePlaylist(name) {
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

// Add current playing track to selected playlist (player quick-add)
document.getElementById('addCurrentToPlaylist').onclick = () => {
  const select = document.getElementById('playlistSelect');
  const name = select.value;
  if (!name) return alert('Select a playlist first.');

  // Determine current song object based on currentMode
  const list = currentMode === 'online'
    ? onlineSongs
    : JSON.parse(localStorage.getItem('myVibe') || '[]');

  const song = list[currentIndex];
  if (!song) return alert('No current song found.');
  addToPlaylist(name, song);
};

// Add to playlist utility (idempotent)
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

// Enhance renderList with inline add-to-playlist controls
const originalRenderList = renderList;
renderList = function(id, songs, mode) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  songs.forEach((s, i) => {
    const trackHTML = `
      <div class="track" onclick="playSong(${i}, '${mode}')">
        <img src="${s.img}">
        <div style="flex:1; overflow:hidden">
          <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</b>
          <small style="color:var(--muted)">${s.artist}</small>
        </div>
        <div class="inline-actions" onclick="event.stopPropagation()">
          <select data-index="${i}" data-mode="${mode}" class="playlist-picker"></select>
          <button class="add-btn" data-index="${i}" data-mode="${mode}">
            <i class="ri-add-line"></i> Add
          </button>
        </div>
      </div>`;
    el.insertAdjacentHTML('beforeend', trackHTML);
  });

  // Populate playlist dropdowns
  const playlists = getPlaylists();
  const names = Object.keys(playlists);
  el.querySelectorAll('.playlist-picker').forEach(sel => {
    sel.innerHTML = '<option value="" disabled selected>Playlist</option>' +
      names.map(n => `<option value="${n}">${n}</option>`).join('');
  });

  // Wire add buttons
  el.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-index'));
      const m = btn.getAttribute('data-mode');
      const picker = btn.parentElement.querySelector('.playlist-picker');
      const name = picker.value;
      if (!name) return alert('Choose a playlist.');
      const list = m === 'online'
        ? onlineSongs
        : JSON.parse(localStorage.getItem('myVibe') || '[]');
      const song = list[i];
      if (!song) return;
      addToPlaylist(name, song);
    });
  });
};

// Boot refinements on load
const prevOnload = window.onload || (()=>{});
window.onload = () => {
  prevOnload();
  refreshPlaylistUI();
  refreshPlaylistSelector();
};

// Keep your existing playCustomSong
// If needed, ensure it updates UI consistently
function playCustomSong(song) {
  audio.src = song.url;
  audio.play();
  document.getElementById("trackTitle").innerText = song.name;
  document.getElementById("trackArtist").innerText = song.artist;
  document.getElementById("disk").style.backgroundImage = `url(${song.img})`;
  document.getElementById("disk").classList.add("rotating");
  document.getElementById("playPause").innerHTML = '<i class="ri-pause-fill"></i>';
  initVisualizer();
}

// Mobile Expand/Collapse Logic
const playerContainer = document.getElementById('mainPlayer');
const mobToggle = document.getElementById('minimizeBtn');

// Click on the whole player to expand (only if not clicking a button)
playerContainer.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        // Prevent expanding if user clicked a button or slider
        if (e.target.closest('button') || e.target.closest('input')) return;
        playerContainer.classList.add('expanded');
    }
});
document.querySelectorAll('.playlist-list li').forEach(el => el.classList.remove('playing'));
selectedItem.classList.add('playing');

// Click on the drag handle to collapse
mobToggle.onclick = (e) => {
    e.stopPropagation(); // Prevent re-expanding
    playerContainer.classList.remove('expanded');
};

// Auto-collapse when a new song is played on mobile? 
// (Optional: can keep expanded for better experience)
const originalPlayCustomSong = playCustomSong;
playCustomSong = function(song) {
    originalPlayCustomSong(song);
    // if(window.innerWidth <= 768) playerContainer.classList.add('expanded');
};
// Minimize toggle
const minimizeBtn = document.getElementById("minimizeBtn");
const player = document.getElementById("mainPlayer");
minimizeBtn.addEventListener("click", () => {
  player.classList.toggle("minimized");
});

// Disk rotation sync
const playPauseBtn = document.getElementById("playPause");
const disk = document.getElementById("disk");
playPauseBtn.addEventListener("click", () => {
  disk.classList.toggle("rotating");
});

// Upload local song
const songUpload = document.getElementById("songUpload");
songUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    // attach to audio element
    const audio = new Audio(url);
    audio.play();
    document.getElementById("trackTitle").textContent = file.name;
    document.getElementById("trackArtist").textContent = "Local Upload";
  }
});

