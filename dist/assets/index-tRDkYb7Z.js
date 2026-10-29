(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))c(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const u of a.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&c(u)}).observe(document,{childList:!0,subtree:!0});function r(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function c(s){if(s.ep)return;s.ep=!0;const a=r(s);fetch(s.href,a)}})();const q="https://api.audius.co/v1",x="Asylum";class ${mapTrack(t){var r,c,s,a,u;return{id:String(t.id),title:String(t.title??"Unknown Track"),artist:String(((r=t.user)==null?void 0:r.name)??"Unknown Artist"),art:String(((c=t.artwork)==null?void 0:c["150x150"])||((s=t.artwork)==null?void 0:s["480x480"])||""),artBig:String(((a=t.artwork)==null?void 0:a["480x480"])||((u=t.artwork)==null?void 0:u["150x150"])||""),duration:Number(t.duration||0)}}async api(t){const r=t.includes("?")?"&":"?",c=await fetch(`${q}${t}${r}app_name=${x}`);if(!c.ok)throw new Error(`HTTP ${c.status}`);return((await c.json()).data||[]).map(a=>this.mapTrack(a))}formatTime(t){const r=Math.floor(t||0),c=Math.floor(r/60),s=r%60;return`${c}:${String(s).padStart(2,"0")}`}streamUrl(t){return`${q}/tracks/${t}/stream?app_name=${x}`}async getTrending(t){const r=t==="Semua"?"":`&genre=${encodeURIComponent(t)}`;return this.api(`/tracks/trending?limit=30${r}`)}async search(t){return this.api(`/tracks/search?limit=30&query=${encodeURIComponent(t)}`)}}const P=["Semua","Electronic","Hip-Hop/Rap","Pop","Lo-Fi","Rock","R&B/Soul","Jazz","Acoustic","Ambient"],f=new $,w=document.querySelector("#app");if(!w)throw new Error("Root element #app not found");const H=w,n={tab:"explore",genre:"Semua",results:[],queue:[],qi:-1,shuffle:!1,repeat:"off",favs:h("asylum_favs",[])};function h(e,t){try{const r=localStorage.getItem(e);return r?JSON.parse(r):t}catch{return t}}function T(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function F(){H.innerHTML=`
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
  `,O()}function O(){const e=document.querySelector("#searchForm"),t=document.querySelector("#q"),r=document.querySelector("#play"),c=document.querySelector("#next"),s=document.querySelector("#prev"),a=document.querySelector("#shuffle"),u=document.querySelector("#repeat"),m=document.querySelector("#seek"),p=document.querySelector("#vol"),i=document.querySelector("#audio");e==null||e.addEventListener("submit",o=>{o.preventDefault();const l=(t==null?void 0:t.value.trim())??"";l&&R(l)}),r==null||r.addEventListener("click",()=>{if(!i.src){n.results.length&&N(n.results,0);return}i.paused?i.play():i.pause()}),c==null||c.addEventListener("click",()=>y(!1)),s==null||s.addEventListener("click",()=>C()),a==null||a.addEventListener("click",()=>{n.shuffle=!n.shuffle,a.classList.toggle("is-on",n.shuffle)}),u==null||u.addEventListener("click",()=>{const o=["off","all","one"],l=o.indexOf(n.repeat);n.repeat=o[(l+1)%o.length],u.textContent=n.repeat==="one"?"↻1":"↻",u.classList.toggle("is-on",n.repeat!=="off")}),m==null||m.addEventListener("input",o=>{const l=o.target;i.duration&&(i.currentTime=Number(l.value)/1e3*i.duration)}),p==null||p.addEventListener("input",o=>{const l=o.target,d=Number(l.value)/100;i.volume=d,T("asylum_vol",l.value)}),i.volume=Number(h("asylum_vol",80))/100,p.value=String(h("asylum_vol",80)),document.querySelectorAll(".tab").forEach(o=>{o.addEventListener("click",()=>{const l=o.getAttribute("data-tab");E(l)})}),document.addEventListener("keydown",o=>{const l=o.target;if(!(l&&l.tagName==="INPUT"&&l.getAttribute("type")==="search")&&o.code==="Space"){o.preventDefault();const d=r;d==null||d.click()}}),i.onplay=()=>{const o=document.querySelector("#play");o&&(o.textContent="⏸")},i.onpause=()=>{const o=document.querySelector("#play");o&&(o.textContent="▶")},i.onended=()=>y(!0),i.onerror=()=>{i.src&&y(!0)},i.ontimeupdate=()=>{if(!i.duration)return;const o=document.querySelector("#cur"),l=document.querySelector("#tot"),d=document.querySelector("#seek");o&&(o.textContent=f.formatTime(i.currentTime)),l&&(l.textContent=f.formatTime(i.duration)),d&&(d.value=String(i.currentTime/i.duration*1e3))},L(),A()}function b(e){return n.favs.some(t=>t.id===e)}function E(e){n.tab=e,document.querySelectorAll(".tab").forEach(r=>{r.classList.toggle("on",r.getAttribute("data-tab")===e)});const t=document.querySelector("#chips");t&&(t.style.display=e==="explore"?"":"none"),v()}function L(){const e=document.querySelector("#chips");e&&(e.innerHTML="",P.forEach(t=>{const r=document.createElement("button");r.className="chip"+(t===n.genre?" on":""),r.textContent=t,r.addEventListener("click",()=>{n.genre=t;const c=document.querySelector("#q");c&&(c.value=""),A(),L()}),e.appendChild(r)}))}function k(e){const t=document.querySelector("#heading");t&&(t.dataset.explore=e,n.tab==="explore"&&(t.textContent=e))}function g(e){const t=document.querySelector("#list");t&&(t.innerHTML=`<div class="status">${e}</div>`)}async function A(){if(n.tab==="explore"){k(n.genre==="Semua"?"Trending":`Trending · ${n.genre}`),g("Memuat...");try{n.results=await f.getTrending(n.genre),v()}catch(e){g(`Gagal memuat lagu (${e instanceof Error?e.message:"unknown error"}).`)}}}async function R(e){k(`Hasil untuk "${e}"`),E("explore"),g("Mencari...");try{n.results=await f.search(e),v()}catch(t){g(`Pencarian gagal (${t instanceof Error?t.message:"unknown error"}).`)}}function v(){const e=document.querySelector("#heading"),t=document.querySelector("#list");if(!e||!t)return;const r=I();e.textContent=r.title,_(r.list,r.emptyMessage)}function I(){var e;return n.tab==="fav"?{title:"Favorit",list:n.favs,emptyMessage:"Belum ada favorit. Tekan ♡ pada lagu untuk menyimpannya."}:n.tab==="queue"?{title:"Antrean",list:n.queue,emptyMessage:"Antrean kosong."}:{title:((e=document.querySelector("#heading"))==null?void 0:e.dataset.explore)||"Trending",list:n.results,emptyMessage:"Tidak ada hasil."}}function _(e,t){var s;const r=document.querySelector("#list");if(!r)return;if(r.innerHTML="",!e.length){r.innerHTML=`<div class="status">${t}</div>`;return}const c=(s=n.queue[n.qi])==null?void 0:s.id;e.forEach(a=>{const u=document.createElement("div");u.className="track-row"+(a.id===c?" is-active":"");const m=document.createElement("img");m.className="track-art",m.src=a.art,m.alt=a.title,m.loading="lazy";const p=document.createElement("div");p.className="track-meta";const i=document.createElement("div");i.className="track-title",i.textContent=a.title;const o=document.createElement("div");o.className="track-artist",o.textContent=a.artist,p.append(i,o);const l=document.createElement("div");l.className="track-duration",l.textContent=f.formatTime(a.duration);const d=document.createElement("button");d.className="favorite-btn"+(b(a.id)?" is-fav":""),d.textContent=b(a.id)?"♥":"♡",d.title="Favorit",d.addEventListener("click",M=>{M.stopPropagation(),U(a)}),u.append(m,p,l,d),u.addEventListener("click",()=>N(e,e.indexOf(a))),r.appendChild(u)})}function N(e,t){n.queue=e.slice(),n.qi=t,S()}function S(){const e=n.queue[n.qi],t=document.querySelector("#audio");if(!e||!t)return;t.src=f.streamUrl(e.id),t.play().catch(()=>{});const r=document.querySelector("#art"),c=document.querySelector("#nowTitle"),s=document.querySelector("#nowArtist");r&&(r.src=e.art),c&&(c.textContent=e.title),s&&(s.textContent=e.artist),document.title=`${e.title} · Asylum`,z(e),v()}function y(e){if(n.queue.length){if(e&&n.repeat==="one"){const t=document.querySelector("#audio");t&&(t.currentTime=0,t.play().catch(()=>{}));return}if(n.shuffle&&n.queue.length>1){let t=n.qi;do t=Math.floor(Math.random()*n.queue.length);while(t===n.qi);n.qi=t}else if(n.qi+1<n.queue.length)n.qi+=1;else if(n.repeat==="all"||!e)n.qi=0;else return;S()}}function C(){const e=document.querySelector("#audio");if(n.queue.length){if(e&&e.currentTime>3){e.currentTime=0;return}n.qi=n.qi>0?n.qi-1:n.queue.length-1,S()}}function U(e){const t=b(e.id);n.favs=t?n.favs.filter(r=>r.id!==e.id):[...n.favs,e],T("asylum_favs",n.favs),v()}function z(e){const t=navigator.mediaSession;t&&(t.metadata=new MediaMetadata({title:e.title,artist:e.artist,artwork:e.artBig?[{src:e.artBig,sizes:"480x480"}]:[]}),t.setActionHandler("play",()=>{const r=document.querySelector("#audio");r==null||r.play().catch(()=>{})}),t.setActionHandler("pause",()=>{const r=document.querySelector("#audio");r==null||r.pause()}),t.setActionHandler("previoustrack",C),t.setActionHandler("nexttrack",()=>y(!1)))}F();
