import './styles.css';
import { TrackRepository } from './classes/TrackRepository';
import { buildShuffledOrder, clampIndex, clampVolume, getNextIndex, getPreviousIndex, shouldAutoSkipAfterError } from './playerState';
import type { RepeatMode, TabName, Track } from './types';

const GENRES = ['Semua', 'Electronic', 'Hip-Hop/Rap', 'Pop', 'Lo-Fi', 'Rock', 'R&B/Soul', 'Jazz', 'Acoustic', 'Ambient'];

const repository = new TrackRepository();
type LocalPlaylist = { id: string; name: string; tracks: Track[] };
const DEFAULT_PLAYLISTS: LocalPlaylist[] = [
  { id: 'chill', name: 'Chill', tracks: [] },
  { id: 'focus', name: 'Focus', tracks: [] },
  { id: 'late-night', name: 'Late Night', tracks: [] }
];
const app = document.querySelector('#app');

if (!app) {
  throw new Error('Root element #app not found');
}

const appRoot = app as HTMLElement;

const appState = {
  tab: 'explore' as TabName,
  genre: 'Semua',
  results: [] as Track[],
  queue: [] as Track[],
  qi: -1,
  shuffle: false,
  repeat: 'off' as RepeatMode,
  favs: load('asylum_favs', []) as Track[],
  playlists: load('asylum_playlists', DEFAULT_PLAYLISTS) as LocalPlaylist[],
  activePlaylistId: 'chill',
  history: [] as number[],
  shuffleOrder: [] as number[]
};

let activeSearchId = 0;
let audioElement: HTMLAudioElement | null = null;
let autoSkipFailures = 0;
let lastFailedTrackId: string | null = null;
let playbackSuccessTimer: number | null = null;
let handlingAudioError = false;
let activeStreamTrackId: string | null = null;
let streamAttempt = 0;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function getCurrentTrack(): Track | undefined {
  if (!appState.queue.length || appState.qi < 0 || appState.qi >= appState.queue.length) {
    return undefined;
  }

  return appState.queue[appState.qi];
}

function setStatus(message: string, tone: 'info' | 'success' | 'warn' = 'info') {
  const list = document.querySelector('#list');
  if (!list) return;

  if (!message) {
    refresh();
    return;
  }

  // Use textContent instead of interpolating messages into innerHTML.
  const status = document.createElement('div');
  status.className = `status ${tone}`;
  status.textContent = message;
  list.replaceChildren(status);
}

function updatePlaybackUi() {
  const audio = getAudio();
  const playButton = document.querySelector('#play') as HTMLButtonElement | null;
  const shuffleButton = document.querySelector('#shuffle') as HTMLButtonElement | null;
  const repeatButton = document.querySelector('#repeat') as HTMLButtonElement | null;

  if (playButton) {
    const isPaused = !audio || audio.paused;
    playButton.textContent = isPaused ? '▶' : '⏸';
    playButton.setAttribute('aria-label', isPaused ? 'Putar' : 'Jeda');
    playButton.title = isPaused ? 'Putar' : 'Jeda';
  }

  if (shuffleButton) {
    shuffleButton.classList.toggle('is-on', appState.shuffle);
    shuffleButton.setAttribute('aria-pressed', String(appState.shuffle));
  }

  if (repeatButton) {
    repeatButton.textContent = appState.repeat === 'one' ? '↻1' : '↻';
    repeatButton.classList.toggle('is-on', appState.repeat !== 'off');
    repeatButton.setAttribute('aria-label', `Mode ulang: ${appState.repeat}`);
  }
}

function updatePlayerMeta() {
  const track = getCurrentTrack();
  const art = document.querySelector('#art') as HTMLImageElement | null;
  const nowTitle = document.querySelector('#nowTitle');
  const nowArtist = document.querySelector('#nowArtist');
  const current = document.querySelector('#cur');
  const total = document.querySelector('#tot');
  const seek = document.querySelector('#seek') as HTMLInputElement | null;

  if (art) {
    art.src = track?.art || '';
    art.alt = track?.title || 'Album art';
  }

  if (nowTitle) nowTitle.textContent = track?.title ?? 'No song selected';
  if (nowArtist) nowArtist.textContent = track?.artist ?? 'Choose a track to play';
  if (current) current.textContent = '0:00';
  if (total) total.textContent = track ? repository.formatTime(track.duration) : '0:00';
  if (seek) {
    seek.value = '0';
    seek.max = String(track ? Math.max(track.duration, 1) * 1000 : 1000);
  }
}

function getAudio(): HTMLAudioElement | null {
  if (!audioElement) {
    audioElement = document.querySelector('#audio') as HTMLAudioElement | null;
  }
  return audioElement;
}

function resetAutoSkipState() {
  autoSkipFailures = 0;
  lastFailedTrackId = null;
  if (playbackSuccessTimer !== null) {
    window.clearTimeout(playbackSuccessTimer);
    playbackSuccessTimer = null;
  }
}

function rebuildShuffleOrder() {
  if (!appState.shuffle || appState.queue.length <= 1) {
    appState.shuffleOrder = [];
    return;
  }

  const nextOrder = buildShuffledOrder(appState.queue.length);
  const currentIndex = appState.qi;
  if (currentIndex >= 0 && nextOrder.includes(currentIndex)) {
    const currentPosition = nextOrder.indexOf(currentIndex);
    if (currentPosition > 0) {
      const [currentTrackIndex] = nextOrder.splice(currentPosition, 1);
      nextOrder.unshift(currentTrackIndex);
    }
  }

  appState.shuffleOrder = nextOrder;
}

function renderShell() {
  appRoot.innerHTML = `
    <div class="spotify-shell">
      <aside class="sidebar" aria-label="Navigasi utama">
        <button class="brand brand-button" type="button" data-view="explore" aria-label="Asylum Home"><span class="brand-mark">◉</span><span>Asylum</span></button>

        <nav class="nav" aria-label="Menu utama">
          <button class="nav-item active" type="button" data-view="explore"><span class="nav-icon">⌂</span><span>Home</span></button>
          <button class="nav-item" type="button" data-view="search"><span class="nav-icon">⌕</span><span>Search</span></button>
          <button class="nav-item" type="button" data-view="library"><span class="nav-icon">▤</span><span>Your Library</span></button>
        </nav>

        <section class="library-box" aria-label="Perpustakaan lokal">
          <div class="library-head"><span>Playlists</span><button id="createPlaylist" class="icon-button create-playlist" type="button" title="Buat playlist" aria-label="Buat playlist">＋</button></div>
          <div class="library-list" id="playlistNav">
            <button class="library-item" type="button" data-view="fav"><span class="playlist-dot liked-dot">♥</span><span>Liked Songs</span></button>
          </div>
          <p class="sidebar-note">Playlist disimpan di perangkat ini.</p>
        </section>
      </aside>

      <div class="content">
        <header class="topbar">
          <div class="nav-arrows">
            <button class="arrow" id="navBack" type="button" aria-label="Back">‹</button>
            <button class="arrow" id="navForward" type="button" aria-label="Forward">›</button>
          </div>

          <form class="search-form" id="searchForm">
            <input class="search-input" type="search" id="q" placeholder="Search songs, artists..." aria-label="Cari lagu" />
            <button class="primary-btn" type="submit">Search</button>
          </form>

          <div class="profile-pill" aria-label="Mode lokal tanpa akun" title="Mode lokal · tanpa akun">A</div>
        </header>

        <main class="main-panel">
          <section class="spot-hero" id="homeHero">
            <div class="hero-copy">
              <p class="eyebrow">YOUR PERSONAL SOUNDSPACE</p>
              <h1>Find your frequency.</h1>
              <p>Discover independent music, build your own library, and keep listening.</p>
            </div>

            <div class="hero-note"><span class="hero-note-icon">♫</span><div><strong>Music without the noise.</strong><span>No account. Your library stays in this browser.</span></div></div>
          </section>

          <div class="tabs">
            <button class="tab on" type="button" data-tab="explore">Explore</button>
            <button class="tab" type="button" data-tab="fav">Favorites</button>
            <button class="tab" type="button" data-tab="queue">Queue</button>
          </div>

          <div class="chips" id="chips"></div>

          <section class="list-section">
            <h2 class="heading" id="heading">Trending</h2>
            <div class="list" id="list"></div>
          </section>
        </main>
      </div>
    </div>

    <footer class="player">
      <div class="player-now">
        <img id="art" alt="Album art" />
        <div class="track-meta">
          <div class="track-title" id="nowTitle">No song selected</div>
          <div class="track-artist" id="nowArtist">Choose a track to play</div>
        </div>
      </div>

      <div class="player-controls">
        <div class="control-buttons">
          <button id="shuffle" type="button" title="Shuffle" aria-label="Shuffle">⇄</button>
          <button id="prev" type="button" title="Previous" aria-label="Previous">⏮</button>
          <button id="play" class="play-button" type="button" title="Play/Pause" aria-label="Putar">▶</button>
          <button id="next" type="button" title="Next" aria-label="Next">⏭</button>
          <button id="repeat" type="button" title="Repeat" aria-label="Mode ulang">↻</button>
        </div>
        <div class="player-seek">
          <span id="cur">0:00</span>
          <input type="range" id="seek" min="0" max="1000" value="0" aria-label="Seek" />
          <span id="tot">0:00</span>
        </div>
      </div>

      <div class="player-volume">
        <span aria-hidden="true">🔊</span>
        <input type="range" id="vol" min="0" max="100" value="80" aria-label="Volume" />
      </div>
    </footer>

    <audio id="audio" preload="none" aria-label="Audio player"></audio>
  `;

  bindEvents();
  updatePlaybackUi();
  updatePlayerMeta();
  renderChips();
  renderPlaylistNav();
  loadTrending();
}

function bindEvents() {
  const searchForm = document.querySelector('#searchForm');
  const qInput = document.querySelector('#q') as HTMLInputElement | null;
  const playButton = document.querySelector('#play') as HTMLButtonElement | null;
  const nextButton = document.querySelector('#next') as HTMLButtonElement | null;
  const prevButton = document.querySelector('#prev') as HTMLButtonElement | null;
  const shuffleButton = document.querySelector('#shuffle') as HTMLButtonElement | null;
  const repeatButton = document.querySelector('#repeat') as HTMLButtonElement | null;
  const seekInput = document.querySelector('#seek') as HTMLInputElement | null;
  const volumeInput = document.querySelector('#vol') as HTMLInputElement | null;
  const audio = getAudio();

  if (!audio) {
    return;
  }

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = qInput?.value.trim() ?? '';
    if (value) {
      doSearch(value);
    }
  });

  playButton?.addEventListener('click', () => {
    if (!getCurrentTrack() && appState.results.length) {
      playFrom(appState.results, 0);
      return;
    }

    if (!audio.src) {
      if (appState.queue.length) {
        playCurrent();
      }
      return;
    }

    if (audio.paused) {
      audio.play().catch((error) => {
        const message = error && typeof error === 'object' && 'name' in error && String((error as { name?: string }).name) === 'NotAllowedError'
          ? 'Pemutaran diblokir browser. Tekan Play untuk mencoba lagi.'
          : 'Lagu tidak bisa diputar. Coba lagu lain.';
        setStatus(message, 'warn');
        updatePlaybackUi();
      });
    } else {
      audio.pause();
    }
  });

  nextButton?.addEventListener('click', () => nextTrack(false));
  prevButton?.addEventListener('click', () => prevTrack());

  shuffleButton?.addEventListener('click', () => {
    appState.shuffle = !appState.shuffle;
    if (appState.shuffle) {
      rebuildShuffleOrder();
    } else {
      appState.shuffleOrder = [];
    }
    updatePlaybackUi();
    if (appState.queue.length) {
      refresh();
    }
  });

  repeatButton?.addEventListener('click', () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const index = order.indexOf(appState.repeat);
    appState.repeat = order[(index + 1) % order.length];
    updatePlaybackUi();
  });

  seekInput?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const currentValue = Number(target.value);
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    if (total > 0) {
      audio.currentTime = clampValue((currentValue / 1000) * total, 0, total);
    }
  });

  volumeInput?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const value = clampVolume(Number(target.value) / 100);
    audio.volume = value;
    save('asylum_vol', value);
  });

  const savedVolume = clampVolume(Number(load('asylum_vol', 80)) / 100);
  audio.volume = savedVolume;
  if (volumeInput) {
    volumeInput.value = String(Math.round(savedVolume * 100));
  }

  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      const current = button.getAttribute('data-tab') as TabName;
      setTab(current);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view as TabName | undefined;
      if (!view) return;
      if (view === 'playlist') {
        const playlistId = button.dataset.playlistId;
        if (playlistId) appState.activePlaylistId = playlistId;
      }
      if (view === 'search') {
        setTab('search');
        window.setTimeout(() => qInput?.focus(), 0);
      } else {
        setTab(view);
      }
    });
  });

  document.querySelector('#createPlaylist')?.addEventListener('click', () => createPlaylist());
  document.querySelector('#navBack')?.addEventListener('click', () => navigateHistory(-1));
  document.querySelector('#navForward')?.addEventListener('click', () => navigateHistory(1));

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      playButton?.click();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
      event.preventDefault();
      nextTrack(false);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
      event.preventDefault();
      prevTrack();
      return;
    }

    if (event.key === 'ArrowRight' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      audio.currentTime = clampValue(audio.currentTime + 10, 0, duration);
      return;
    }

    if (event.key === 'ArrowLeft' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      audio.currentTime = clampValue(audio.currentTime - 10, 0, duration);
      return;
    }

    if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      audio.muted = !audio.muted;
    }
  });

  audio.addEventListener('loadstart', () => setStatus('Memuat lagu...', 'info'));
  audio.addEventListener('waiting', () => setStatus('Memuat lagu...', 'info'));
  audio.addEventListener('canplay', () => setStatus('', 'success'));
  audio.addEventListener('playing', () => {
    setStatus('', 'success');
    updatePlaybackUi();

    // Only reset the consecutive-failure budget after playback remains healthy.
    if (playbackSuccessTimer !== null) {
      window.clearTimeout(playbackSuccessTimer);
    }
    playbackSuccessTimer = window.setTimeout(() => {
      autoSkipFailures = 0;
      lastFailedTrackId = null;
      playbackSuccessTimer = null;
    }, 10000);
  });
  audio.addEventListener('pause', () => updatePlaybackUi());
  audio.addEventListener('loadedmetadata', () => {
    const seek = document.querySelector('#seek') as HTMLInputElement | null;
    const total = document.querySelector('#tot');
    if (seek) seek.max = String(Math.max(audio.duration, 1) * 1000);
    if (total) total.textContent = repository.formatTime(audio.duration || 0);
  });
  audio.addEventListener('timeupdate', () => {
    const current = document.querySelector('#cur');
    const total = document.querySelector('#tot');
    const seek = document.querySelector('#seek') as HTMLInputElement | null;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    if (current) current.textContent = repository.formatTime(audio.currentTime);
    if (total && duration > 0) total.textContent = repository.formatTime(duration);
    if (seek && duration > 0) seek.value = String((audio.currentTime / duration) * 1000);
  });
  audio.addEventListener('ended', () => {
    if (appState.repeat === 'one') {
      audio.currentTime = 0;
      audio.play().catch(() => setStatus('Lagu tidak bisa diputar ulang saat ini.', 'warn'));
      return;
    }

    nextTrack(true);
  });
  audio.addEventListener('error', () => {
    if (handlingAudioError) return;
    handlingAudioError = true;

    try {
      const currentTrack = getCurrentTrack();
      const currentTrackId = currentTrack?.id ?? null;

      // A media error can fire while the browser is switching sources.
      if (!currentTrack || !currentTrackId || !audio.currentSrc) {
        setStatus('Lagu tidak tersedia. Coba pilih lagu lain.', 'warn');
        return;
      }

      const streamUrls = currentTrack ? repository.streamUrls(currentTrack) : [];
      if (streamAttempt < streamUrls.length - 1) {
        streamAttempt += 1;
        audio.src = streamUrls[streamAttempt];
        audio.load();
        audio.play().catch(() => { /* the next media error will continue through the bounded fallback */ });
        setStatus('Mencoba jalur streaming alternatif...', 'info');
        return;
      }

      if (appState.repeat === 'one') {
        setStatus('Lagu gagal diputar. Tekan Next untuk melewati lagu ini.', 'warn');
        return;
      }

      if (!shouldAutoSkipAfterError(autoSkipFailures, currentTrackId, lastFailedTrackId)) {
        setStatus('Beberapa lagu gagal diputar. Periksa koneksi atau pilih lagu lain.', 'warn');
        return;
      }

      autoSkipFailures += 1;
      lastFailedTrackId = currentTrackId;
      setStatus('Koneksi terganggu, mencoba lagu berikutnya...', 'warn');
      nextTrack(true);
    } finally {
      handlingAudioError = false;
    }
  });

  updatePlaybackUi();
}

function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function isFav(id: string): boolean {
  return appState.favs.some((track) => track.id === id);
}

function setTab(name: TabName) {
  if (viewHistory[viewHistoryIndex] !== name) {
    viewHistory.splice(viewHistoryIndex + 1);
    viewHistory.push(name);
    viewHistoryIndex = viewHistory.length - 1;
  }
  appState.tab = name;
  document.querySelectorAll<HTMLElement>('.tab').forEach((button) => {
    button.classList.toggle('on', button.getAttribute('data-tab') === name);
  });

  const chips = document.querySelector('#chips') as HTMLElement | null;
  const hero = document.querySelector('#homeHero') as HTMLElement | null;
  if (chips) chips.style.display = name === 'explore' ? '' : 'none';
  if (hero) hero.style.display = name === 'explore' ? '' : 'none';

  document.querySelectorAll<HTMLElement>('.nav-item, .library-item, .brand-button').forEach((button) => {
    const view = button.dataset.view;
    const isPlaylist = view === 'playlist' && name === 'playlist' && button.dataset.playlistId === appState.activePlaylistId;
    const isLiked = button.classList.contains('liked-item') && name === 'fav';
    button.classList.toggle('active', view === name || isPlaylist || isLiked || (button.classList.contains('liked-item') && name === 'fav'));
  });

  refresh();
}

function renderPlaylistNav() {
  const nav = document.querySelector('#playlistNav');
  if (!nav) return;
  nav.replaceChildren();

  const liked = document.createElement('button');
  liked.type = 'button';
  liked.className = 'library-item liked-item' + (appState.tab === 'fav' ? ' active' : '');
  liked.dataset.view = 'fav';
  liked.innerHTML = '<span class="playlist-dot liked-dot">♥</span><span>Liked Songs</span>';
  liked.addEventListener('click', () => setTab('fav'));
  nav.appendChild(liked);

  appState.playlists.forEach((playlist) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-item' + (appState.tab === 'playlist' && appState.activePlaylistId === playlist.id ? ' active' : '');
    button.dataset.view = 'playlist';
    button.dataset.playlistId = playlist.id;
    const dot = document.createElement('span');
    dot.className = 'playlist-dot';
    dot.textContent = '♫';
    const label = document.createElement('span');
    label.textContent = playlist.name;
    button.append(dot, label);
    button.addEventListener('click', () => { appState.activePlaylistId = playlist.id; setTab('playlist'); });
    nav.appendChild(button);
  });
}

function createPlaylist() {
  const name = window.prompt('Nama playlist baru:');
  if (!name || !name.trim()) return;
  const cleanName = name.trim().slice(0, 48);
  if (appState.playlists.some((playlist) => playlist.name.toLowerCase() === cleanName.toLowerCase())) {
    setStatus('Nama playlist sudah digunakan.', 'warn');
    return;
  }
  const playlist: LocalPlaylist = { id: `playlist-${Date.now()}`, name: cleanName, tracks: [] };
  appState.playlists = [...appState.playlists, playlist];
  appState.activePlaylistId = playlist.id;
  save('asylum_playlists', appState.playlists);
  renderPlaylistNav();
  setTab('playlist');
}

function addToQueue(track: Track) {
  const existing = appState.queue.findIndex((item) => item.id === track.id);
  if (existing === -1) appState.queue.push(track);
  if (appState.qi < 0) appState.qi = 0;
  updatePlayerMeta();
  setStatus(existing === -1 ? `Ditambahkan ke antrean: ${track.title}` : 'Lagu sudah ada di antrean.', 'success');
  refresh();
}

function addToPlaylist(track: Track) {
  if (!appState.playlists.length) {
    createPlaylist();
    return;
  }
  const names = appState.playlists.map((playlist, index) => `${index + 1}. ${playlist.name}`).join('\n');
  const choice = window.prompt(`Tambahkan ke playlist (masukkan nomor):\n${names}`, '1');
  if (choice === null) return;
  const index = Number(choice) - 1;
  const playlist = appState.playlists[index];
  if (!playlist) { setStatus('Nomor playlist tidak valid.', 'warn'); return; }
  if (!playlist.tracks.some((item) => item.id === track.id)) playlist.tracks.push(track);
  save('asylum_playlists', appState.playlists);
  renderPlaylistNav();
  setStatus(`Ditambahkan ke ${playlist.name}.`, 'success');
  if (appState.tab === 'playlist' && appState.activePlaylistId === playlist.id) refresh();
}

const viewHistory: TabName[] = ['explore'];
let viewHistoryIndex = 0;
function navigateHistory(direction: -1 | 1) {
  const next = viewHistoryIndex + direction;
  if (next < 0 || next >= viewHistory.length) return;
  viewHistoryIndex = next;
  setTab(viewHistory[viewHistoryIndex]);
}

function renderChips() {
  const box = document.querySelector('#chips');
  if (!box) return;

  box.innerHTML = '';
  GENRES.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip' + (item === appState.genre ? ' on' : '');
    button.textContent = item;
    button.addEventListener('click', () => {
      appState.genre = item;
      const qInput = document.querySelector('#q') as HTMLInputElement | null;
      if (qInput) qInput.value = '';
      loadTrending();
      renderChips();
    });
    box.appendChild(button);
  });
}

function setExploreTitle(title: string) {
  const heading = document.querySelector('#heading') as HTMLElement | null;
  if (!heading) return;
  heading.dataset.explore = title;
  if (appState.tab === 'explore') heading.textContent = title;
}

async function loadTrending() {
  if (appState.tab !== 'explore') return;
  setExploreTitle(appState.genre === 'Semua' ? 'Trending' : `Trending · ${appState.genre}`);
  setStatus('Memuat...', 'info');

  const requestId = ++activeSearchId;

  try {
    const tracks = await repository.getTrending(appState.genre);
    if (requestId !== activeSearchId) {
      return;
    }

    appState.results = tracks;
    if (!tracks.length) {
      setStatus('Tidak ada hasil saat ini.', 'warn');
    }
    refresh();
  } catch (error) {
    if (requestId !== activeSearchId) {
      return;
    }

    setStatus(error instanceof Error ? error.message : 'Gagal memuat lagu.', 'warn');
  }
}

async function doSearch(query: string) {
  const safeQuery = query.trim();
  if (!safeQuery) return;

  setExploreTitle(`Hasil untuk "${safeQuery}"`);
  setTab('explore');
  setStatus('Mencari...', 'info');

  const requestId = ++activeSearchId;

  try {
    const tracks = await repository.search(safeQuery);
    if (requestId !== activeSearchId) {
      return;
    }

    appState.results = tracks;
    if (!tracks.length) {
      setStatus('Lagu tidak ditemukan.', 'warn');
    }
    refresh();
  } catch (error) {
    if (requestId !== activeSearchId) {
      return;
    }

    setStatus(error instanceof Error ? error.message : 'Pencarian gagal.', 'warn');
  }
}

function refresh() {
  const heading = document.querySelector('#heading');
  const list = document.querySelector('#list');

  if (!heading || !list) return;

  const currentView = getCurrentView();
  heading.textContent = currentView.title;
  renderList(currentView.list, currentView.emptyMessage);
}

function getCurrentView() {
  if (appState.tab === 'library') {
    const libraryTracks = [...appState.favs];
    const seen = new Set(libraryTracks.map((track) => track.id));
    appState.playlists.forEach((playlist) => playlist.tracks.forEach((track) => { if (!seen.has(track.id)) { seen.add(track.id); libraryTracks.push(track); } }));
    return { title: 'Your Library', list: libraryTracks, emptyMessage: 'Library masih kosong. Simpan favorit atau tambahkan lagu ke playlist.' };
  }

  if (appState.tab === 'search') {
    return { title: 'Cari musik', list: appState.results, emptyMessage: 'Cari judul lagu atau nama artis melalui kolom pencarian di atas.' };
  }

  if (appState.tab === 'playlist') {
    const playlist = appState.playlists.find((item) => item.id === appState.activePlaylistId);
    return { title: playlist?.name ?? 'Playlist', list: playlist?.tracks ?? [], emptyMessage: 'Playlist ini masih kosong. Gunakan tombol + pada lagu untuk menambahkannya.' };
  }

  if (appState.tab === 'fav') {
    return {
      title: 'Favorit',
      list: appState.favs,
      emptyMessage: 'Belum ada favorit. Tekan ♡ pada lagu untuk menyimpannya.'
    };
  }

  if (appState.tab === 'queue') {
    return {
      title: 'Antrean',
      list: appState.queue,
      emptyMessage: 'Antrean kosong.'
    };
  }

  return {
    title: (document.querySelector('#heading') as HTMLElement | null)?.dataset.explore || 'Trending',
    list: appState.results,
    emptyMessage: 'Tidak ada hasil.'
  };
}

function renderList(tracks: Track[], emptyMessage: string) {
  const list = document.querySelector('#list');
  if (!list) return;

  list.innerHTML = '';

  if (!tracks.length) {
    list.innerHTML = `<div class="status">${emptyMessage}</div>`;
    return;
  }

  const activeId = getCurrentTrack()?.id;

  tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (track.id === activeId ? ' is-active' : '');

    const img = document.createElement('img');
    img.className = 'track-art';
    img.src = track.art || '';
    img.alt = track.title;
    img.loading = 'lazy';

    const meta = document.createElement('div');
    meta.className = 'track-meta';

    const title = document.createElement('div');
    title.className = 'track-title';
    title.textContent = track.title;

    const artist = document.createElement('div');
    artist.className = 'track-artist';
    artist.textContent = track.artist;

    meta.append(title, artist);

    const duration = document.createElement('div');
    duration.className = 'track-duration';
    duration.textContent = repository.formatTime(track.duration);

    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'favorite-btn' + (isFav(track.id) ? ' is-fav' : '');
    favorite.textContent = isFav(track.id) ? '♥' : '♡';
    favorite.title = 'Favorit';
    favorite.setAttribute('aria-label', isFav(track.id) ? 'Hapus favorit' : 'Tambahkan favorit');
    favorite.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFav(track);
    });

    const actions = document.createElement('div');
    actions.className = 'track-actions';
    const queueButton = document.createElement('button');
    queueButton.type = 'button';
    queueButton.className = 'track-action';
    queueButton.textContent = '+';
    queueButton.title = 'Tambahkan ke antrean';
    queueButton.setAttribute('aria-label', `Tambahkan ${track.title} ke antrean`);
    queueButton.addEventListener('click', (event) => { event.stopPropagation(); addToQueue(track); });
    const playlistButton = document.createElement('button');
    playlistButton.type = 'button';
    playlistButton.className = 'track-action';
    playlistButton.textContent = '⋯';
    playlistButton.title = 'Tambahkan ke playlist';
    playlistButton.setAttribute('aria-label', `Tambahkan ${track.title} ke playlist`);
    playlistButton.addEventListener('click', (event) => { event.stopPropagation(); addToPlaylist(track); });
    actions.append(queueButton, playlistButton);

    row.append(img, meta, duration, actions, favorite);
    row.addEventListener('click', () => playFrom(tracks, tracks.indexOf(track)));
    list.appendChild(row);
  });
}

function playFrom(list: Track[], index: number) {
  if (!list.length) return;

  const safeIndex = clampIndex(index, list.length);
  if (safeIndex < 0) return;

  appState.queue = list.slice();
  appState.qi = safeIndex;
  activeStreamTrackId = null;
  streamAttempt = 0;
  appState.history = [];
  resetAutoSkipState();

  if (appState.shuffle) {
    rebuildShuffleOrder();
  }
  playCurrent(false);
}

function playCurrent(resetRetryState = false) {
  const track = getCurrentTrack();
  const audio = getAudio();

  if (!track || !audio) return;

  if (resetRetryState) {
    resetAutoSkipState();
  }

  let nextPlaybackUrl: string;
  try {
    if (activeStreamTrackId !== track.id) { activeStreamTrackId = track.id; streamAttempt = 0; }
    nextPlaybackUrl = repository.streamUrls(track)[streamAttempt] || repository.streamUrl(track.id);
  } catch {
    setStatus('Data lagu tidak valid. Pilih lagu lain.', 'warn');
    updatePlaybackUi();
    return;
  }

  if (playbackSuccessTimer !== null) {
    window.clearTimeout(playbackSuccessTimer);
    playbackSuccessTimer = null;
  }

  if (audio.src !== nextPlaybackUrl) {
    audio.src = nextPlaybackUrl;
  }

  audio.load();
  const playbackPromise = audio.play();
  playbackPromise.catch((error) => {
    const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: string }).name) : '';
    const message = name === 'NotAllowedError'
      ? 'Pemutaran diblokir browser. Tekan Play untuk mencoba lagi.'
      : 'Lagu tidak bisa diputar. Coba lagu lain.';
    setStatus(message, 'warn');
    updatePlaybackUi();
  });

  const art = document.querySelector('#art') as HTMLImageElement | null;
  const nowTitle = document.querySelector('#nowTitle');
  const nowArtist = document.querySelector('#nowArtist');

  if (art) {
    art.src = track.art || '';
    art.alt = track.title;
  }

  if (nowTitle) nowTitle.textContent = track.title;
  if (nowArtist) nowArtist.textContent = track.artist;

  document.title = `${track.title} · Asylum`;
  setMediaSession(track);
  updatePlayerMeta();
  refresh();
}

function nextTrack(auto: boolean) {
  const audio = getAudio();
  if (!appState.queue.length) {
    if (audio) audio.pause();
    return;
  }

  if (appState.repeat === 'one' && auto) {
    audio?.pause();
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => setStatus('Lagu tidak bisa diputar ulang saat ini.', 'warn'));
    }
    return;
  }

  const currentIndex = appState.qi;
  const nextIndex = getNextIndex(
    appState.queue.length,
    currentIndex,
    appState.repeat,
    appState.shuffle,
    appState.shuffleOrder,
    !auto
  );

  if (nextIndex === -1) {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    updatePlaybackUi();
    return;
  }

  if (currentIndex >= 0 && (appState.history.length === 0 || appState.history[appState.history.length - 1] !== currentIndex)) {
    appState.history.push(currentIndex);
  }

  appState.qi = nextIndex;
  playCurrent(!auto);
}

function prevTrack() {
  const audio = getAudio();
  if (!appState.queue.length) return;

  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    audio.play().catch(() => setStatus('Lagu tidak bisa dimulai ulang saat ini.', 'warn'));
    return;
  }

  const previousIndex = appState.history.length > 0
    ? appState.history.pop() ?? -1
    : getPreviousIndex(appState.queue.length, appState.qi, [], appState.repeat, appState.shuffle, appState.shuffleOrder);

  if (previousIndex === -1 || previousIndex === appState.qi) {
    return;
  }

  appState.qi = previousIndex;
  playCurrent(true);
}

function toggleFav(track: Track) {
  const exists = isFav(track.id);
  appState.favs = exists
    ? appState.favs.filter((item) => item.id !== track.id)
    : [...appState.favs, track];
  save('asylum_favs', appState.favs);
  refresh();
  renderPlaylistNav();
}

function setMediaSession(track: Track) {
  const mediaSession = navigator.mediaSession;
  if (!mediaSession || typeof MediaMetadata === 'undefined') return;

  const artwork = track.artBig ? [{ src: track.artBig, sizes: '480x480' }] : [];
  mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork
  });

  mediaSession.setActionHandler('play', () => {
    const audio = getAudio();
    if (audio && audio.paused) {
      audio.play().catch(() => setStatus('Pemutaran diblokir browser. Tekan Play untuk mencoba lagi.', 'warn'));
    }
  });

  mediaSession.setActionHandler('pause', () => {
    getAudio()?.pause();
  });
  mediaSession.setActionHandler('previoustrack', prevTrack);
  mediaSession.setActionHandler('nexttrack', () => nextTrack(false));
}

renderShell();
