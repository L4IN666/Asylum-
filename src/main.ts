import './styles.css';
import { TrackRepository } from './classes/TrackRepository';
import type { RepeatMode, TabName, Track } from './types';

const GENRES = ['Semua', 'Electronic', 'Hip-Hop/Rap', 'Pop', 'Lo-Fi', 'Rock', 'R&B/Soul', 'Jazz', 'Acoustic', 'Ambient'];

const repository = new TrackRepository();
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
  favs: load('asylum_favs', []) as Track[]
};

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

function renderShell() {
  appRoot.innerHTML = `
    <div class="spotify-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">◉</span> Asylum</div>

        <nav class="nav">
          <button class="nav-item active">Home</button>
          <button class="nav-item">Search</button>
          <button class="nav-item">Your Library</button>
        </nav>

        <div class="library-box">
          <div class="library-head">Playlists</div>
          <div class="library-list">
            <button class="library-item active">Liked Songs</button>
            <button class="library-item">Chill</button>
            <button class="library-item">Focus</button>
            <button class="library-item">Late Night</button>
          </div>
        </div>
      </aside>

      <div class="content">
        <header class="topbar">
          <div class="nav-arrows">
            <button class="arrow">❮</button>
            <button class="arrow">❯</button>
          </div>

          <form class="search-form" id="searchForm">
            <input class="search-input" type="search" id="q" placeholder="Search songs, artists..." />
            <button class="primary-btn" type="submit">Search</button>
          </form>

          <div class="profile-pill">S</div>
        </header>

        <main class="main-panel">
          <section class="spot-hero">
            <div class="hero-copy">
              <p class="eyebrow">Featured</p>
              <h1>Good evening</h1>
              <p>Fresh tracks and calm sounds to set the mood for your day.</p>
            </div>

            <div class="hero-stats">
              <div class="stat">
                <strong>12</strong>
                <span>Saved</span>
              </div>
              <div class="stat">
                <strong>3</strong>
                <span>Playlists</span>
              </div>
              <div class="stat">
                <strong>7</strong>
                <span>Fresh picks</span>
              </div>
              <div class="stat">
                <strong>HD</strong>
                <span>Audio</span>
              </div>
            </div>
          </section>

          <div class="tabs">
            <button class="tab on" data-tab="explore">Explore</button>
            <button class="tab" data-tab="fav">Favorites</button>
            <button class="tab" data-tab="queue">Queue</button>
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
        <img id="art" alt="" />
        <div class="track-meta">
          <div class="track-title" id="nowTitle">No song selected</div>
          <div class="track-artist" id="nowArtist">Choose a track to play</div>
        </div>
      </div>

      <div class="player-controls">
        <div class="control-buttons">
          <button id="shuffle" title="Shuffle">⇄</button>
          <button id="prev" title="Previous">⏮</button>
          <button id="play" class="play-button" title="Play/Pause">▶</button>
          <button id="next" title="Next">⏭</button>
          <button id="repeat" title="Repeat">↻</button>
        </div>
        <div class="player-seek">
          <span id="cur">0:00</span>
          <input type="range" id="seek" min="0" max="1000" value="0" />
          <span id="tot">0:00</span>
        </div>
      </div>

      <div class="player-volume">
        <span>🔊</span>
        <input type="range" id="vol" min="0" max="100" value="80" />
      </div>
    </footer>

    <audio id="audio" preload="none"></audio>
  `;

  bindEvents();
}

function bindEvents() {
  const searchForm = document.querySelector('#searchForm');
  const qInput = document.querySelector('#q');
  const playButton = document.querySelector('#play');
  const nextButton = document.querySelector('#next');
  const prevButton = document.querySelector('#prev');
  const shuffleButton = document.querySelector('#shuffle');
  const repeatButton = document.querySelector('#repeat');
  const seekInput = document.querySelector('#seek');
  const volumeInput = document.querySelector('#vol');
  const audio = document.querySelector('#audio') as HTMLAudioElement;

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = (qInput as HTMLInputElement | null)?.value.trim() ?? '';
    if (value) {
      doSearch(value);
    }
  });

  playButton?.addEventListener('click', () => {
    if (!audio.src) {
      if (appState.results.length) {
        playFrom(appState.results, 0);
      }
      return;
    }

    audio.paused ? audio.play() : audio.pause();
  });

  nextButton?.addEventListener('click', () => nextTrack(false));
  prevButton?.addEventListener('click', () => prevTrack());

  shuffleButton?.addEventListener('click', () => {
    appState.shuffle = !appState.shuffle;
    shuffleButton.classList.toggle('is-on', appState.shuffle);
  });

  repeatButton?.addEventListener('click', () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const currentIndex = order.indexOf(appState.repeat);
    appState.repeat = order[(currentIndex + 1) % order.length];
    repeatButton.textContent = appState.repeat === 'one' ? '↻1' : '↻';
    repeatButton.classList.toggle('is-on', appState.repeat !== 'off');
  });

  seekInput?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    if (audio.duration) {
      audio.currentTime = (Number(target.value) / 1000) * audio.duration;
    }
  });

  volumeInput?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value) / 100;
    audio.volume = value;
    save('asylum_vol', target.value);
  });

  audio.volume = Number(load('asylum_vol', 80)) / 100;
  (volumeInput as HTMLInputElement | null)!.value = String(load('asylum_vol', 80));

  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      const current = button.getAttribute('data-tab') as TabName;
      setTab(current);
    });
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'INPUT' && target.getAttribute('type') === 'search') return;
    if (event.code === 'Space') {
      event.preventDefault();
      const playBtn = playButton as HTMLButtonElement | null;
      playBtn?.click();
    }
  });

  audio.onplay = () => {
    const playButton = document.querySelector('#play');
    if (playButton) {
      playButton.textContent = '⏸';
    }
  };

  audio.onpause = () => {
    const playButton = document.querySelector('#play');
    if (playButton) {
      playButton.textContent = '▶';
    }
  };

  audio.onended = () => nextTrack(true);
  audio.onerror = () => {
    if (audio.src) {
      nextTrack(true);
    }
  };

  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const current = document.querySelector('#cur');
    const total = document.querySelector('#tot');
    const seek = document.querySelector('#seek') as HTMLInputElement | null;

    if (current) current.textContent = repository.formatTime(audio.currentTime);
    if (total) total.textContent = repository.formatTime(audio.duration);
    if (seek) seek.value = String((audio.currentTime / audio.duration) * 1000);
  };

  renderChips();
  loadTrending();
}

function isFav(id: string): boolean {
  return appState.favs.some((track) => track.id === id);
}

function setTab(name: TabName) {
  appState.tab = name;
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('on', button.getAttribute('data-tab') === name);
  });

  const chips = document.querySelector('#chips') as HTMLElement | null;
  if (chips) {
    chips.style.display = name === 'explore' ? '' : 'none';
  }

  refresh();
}

function renderChips() {
  const box = document.querySelector('#chips');
  if (!box) return;

  box.innerHTML = '';
  GENRES.forEach((item) => {
    const button = document.createElement('button');
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

function showStatus(message: string) {
  const list = document.querySelector('#list');
  if (!list) return;

  list.innerHTML = `<div class="status">${message}</div>`;
}

async function loadTrending() {
  if (appState.tab !== 'explore') return;
  setExploreTitle(appState.genre === 'Semua' ? 'Trending' : `Trending · ${appState.genre}`);
  showStatus('Memuat...');

  try {
    appState.results = await repository.getTrending(appState.genre);
    refresh();
  } catch (error) {
    showStatus(`Gagal memuat lagu (${error instanceof Error ? error.message : 'unknown error'}).`);
  }
}

async function doSearch(query: string) {
  setExploreTitle(`Hasil untuk "${query}"`);
  setTab('explore');
  showStatus('Mencari...');

  try {
    appState.results = await repository.search(query);
    refresh();
  } catch (error) {
    showStatus(`Pencarian gagal (${error instanceof Error ? error.message : 'unknown error'}).`);
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

  const activeId = appState.queue[appState.qi]?.id;

  tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (track.id === activeId ? ' is-active' : '');

    const img = document.createElement('img');
    img.className = 'track-art';
    img.src = track.art;
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
    favorite.className = 'favorite-btn' + (isFav(track.id) ? ' is-fav' : '');
    favorite.textContent = isFav(track.id) ? '♥' : '♡';
    favorite.title = 'Favorit';
    favorite.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFav(track);
    });

    row.append(img, meta, duration, favorite);
    row.addEventListener('click', () => playFrom(tracks, tracks.indexOf(track)));
    list.appendChild(row);
  });
}

function playFrom(list: Track[], index: number) {
  appState.queue = list.slice();
  appState.qi = index;
  playCurrent();
}

function playCurrent() {
  const track = appState.queue[appState.qi];
  const audio = document.querySelector('#audio') as HTMLAudioElement;

  if (!track || !audio) return;

  audio.src = repository.streamUrl(track.id);
  audio.play().catch(() => {});

  const art = document.querySelector('#art') as HTMLImageElement | null;
  const nowTitle = document.querySelector('#nowTitle');
  const nowArtist = document.querySelector('#nowArtist');

  if (art) art.src = track.art;
  if (nowTitle) nowTitle.textContent = track.title;
  if (nowArtist) nowArtist.textContent = track.artist;

  document.title = `${track.title} · Asylum`;
  setMediaSession(track);
  refresh();
}

function nextTrack(auto: boolean) {
  if (!appState.queue.length) return;

  if (auto && appState.repeat === 'one') {
    const audio = document.querySelector('#audio') as HTMLAudioElement | null;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    return;
  }

  if (appState.shuffle && appState.queue.length > 1) {
    let nextIndex = appState.qi;
    do {
      nextIndex = Math.floor(Math.random() * appState.queue.length);
    } while (nextIndex === appState.qi);
    appState.qi = nextIndex;
  } else if (appState.qi + 1 < appState.queue.length) {
    appState.qi += 1;
  } else if (appState.repeat === 'all' || !auto) {
    appState.qi = 0;
  } else {
    return;
  }

  playCurrent();
}

function prevTrack() {
  const audio = document.querySelector('#audio') as HTMLAudioElement | null;
  if (!appState.queue.length) return;
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  appState.qi = appState.qi > 0 ? appState.qi - 1 : appState.queue.length - 1;
  playCurrent();
}

function toggleFav(track: Track) {
  const exists = isFav(track.id);
  appState.favs = exists
    ? appState.favs.filter((item) => item.id !== track.id)
    : [...appState.favs, track];
  save('asylum_favs', appState.favs);
  refresh();
}

function setMediaSession(track: Track) {
  const mediaSession = navigator.mediaSession;
  if (!mediaSession) return;

  mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork: track.artBig ? [{ src: track.artBig, sizes: '480x480' }] : []
  });

  mediaSession.setActionHandler('play', () => {
    const audio = document.querySelector('#audio') as HTMLAudioElement | null;
    audio?.play().catch(() => {});
  });

  mediaSession.setActionHandler('pause', () => {
    const audio = document.querySelector('#audio') as HTMLAudioElement | null;
    audio?.pause();
  });
  mediaSession.setActionHandler('previoustrack', prevTrack);
  mediaSession.setActionHandler('nexttrack', () => nextTrack(false));
}

renderShell();
