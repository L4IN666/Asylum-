import type { Track } from '../types';

const API_BASES = ['https://api.audius.co/v1', 'https://discoveryprovider.audius.co/v1'];
const APP_NAME = 'Asylum';
const REQUEST_TIMEOUT_MS = 12000;
const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID?.trim() ?? '';
type JamendoTrack = { id?: unknown; name?: unknown; artist_name?: unknown; album_image?: unknown; image?: unknown; duration?: unknown; audio?: unknown };

export class TrackRepository {
  private asString(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      return value.trim() || fallback;
    }

    return fallback;
  }

  private mapTrack(value: unknown): Track | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const track = value as Record<string, unknown>;
    const rawId = typeof track.id === 'string' ? track.id.trim() : '';
    if (!rawId) {
      return null;
    }

    const artwork = track.artwork && typeof track.artwork === 'object' && !Array.isArray(track.artwork)
      ? track.artwork as Record<string, unknown>
      : {};
    const user = track.user && typeof track.user === 'object' && !Array.isArray(track.user)
      ? track.user as Record<string, unknown>
      : {};
    const durationValue = Number(track.duration ?? 0);

    const title = this.asString(track.title, 'Unknown Track');
    const artist = this.asString(user.name, 'Unknown Artist');
    const art = this.asString(artwork['150x150'] ?? artwork['480x480'], '');
    const artBig = this.asString(artwork['480x480'] ?? artwork['150x150'], '');

    return {
      id: rawId,
      title,
      artist,
      art,
      artBig,
      duration: Number.isFinite(durationValue) ? Math.max(0, durationValue) : 0,
      provider: 'audius'
    };
  }

  private async api(path: string): Promise<Track[]> {
    const errors: string[] = [];

    for (const base of API_BASES) {
      const separator = path.includes('?') ? '&' : '?';
      const url = `${base}${path}${separator}app_name=${APP_NAME}`;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = (await response.json()) as { data?: unknown };
        if (!json || typeof json !== 'object' || !Array.isArray(json.data)) {
          throw new Error('Respons API tidak valid');
        }

        return json.data
          .map((item) => this.mapTrack(item))
          .filter((track): track is Track => track !== null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          errors.push('waktu request habis');
        } else {
          errors.push(error instanceof Error ? error.message : 'request gagal');
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw new Error(`Sumber musik tidak merespons (${errors.join('; ')}). Coba lagi beberapa saat.`);
  }

  private async jamendo(path: string): Promise<Track[]> {
    if (!JAMENDO_CLIENT_ID) return [];
    const separator = path.includes('?') ? '&' : '?';
    const url = `https://api.jamendo.com/v3.0/${path}${separator}client_id=${encodeURIComponent(JAMENDO_CLIENT_ID)}&format=json&limit=30&audioformat=mp32`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Jamendo HTTP ${response.status}`);
      const json = await response.json() as { results?: unknown };
      if (!json || !Array.isArray(json.results)) throw new Error('Respons Jamendo tidak valid.');
      return json.results.map((item: unknown): Track | null => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const track = item as JamendoTrack;
        const id = typeof track.id === 'string' || typeof track.id === 'number' ? String(track.id) : '';
        const audioUrl = typeof track.audio === 'string' ? track.audio : '';
        if (!id || !audioUrl) return null;
        const title = typeof track.name === 'string' && track.name.trim() ? track.name.trim() : 'Unknown Track';
        const artist = typeof track.artist_name === 'string' && track.artist_name.trim() ? track.artist_name.trim() : 'Unknown Artist';
        const art = typeof track.album_image === 'string' ? track.album_image : (typeof track.image === 'string' ? track.image : '');
        const duration = Number(track.duration ?? 0);
        return { id: `jamendo:${id}`, title, artist, art, artBig: art, duration: Number.isFinite(duration) ? Math.max(0, duration) : 0, provider: 'jamendo', audioUrl };
      }).filter((track: Track | null): track is Track => track !== null);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async combineSources(primaryRequest: Promise<Track[]>, jamendoPath: string): Promise<Track[]> {
    const [primaryResult, secondaryResult] = await Promise.allSettled([
      primaryRequest,
      JAMENDO_CLIENT_ID ? this.jamendo(jamendoPath) : Promise.resolve([] as Track[])
    ]);

    const primary = primaryResult.status === 'fulfilled' ? primaryResult.value : [];
    const secondary = secondaryResult.status === 'fulfilled' ? secondaryResult.value : [];
    if (primary.length || secondary.length) {
      const seen = new Set(primary.map((track) => `${track.provider}:${track.id}`));
      return [...primary, ...secondary.filter((track) => !seen.has(`${track.provider}:${track.id}`))];
    }

    if (primaryResult.status === 'rejected') throw primaryResult.reason;
    if (secondaryResult.status === 'rejected') throw secondaryResult.reason;
    return [];
  }

  public formatTime(value: number): string {
    const total = Math.max(0, Math.floor(value || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  public streamUrls(trackOrId: Track | string): string[] {
    if (typeof trackOrId !== 'string') {
      if (trackOrId.provider === 'jamendo' && trackOrId.audioUrl) return [trackOrId.audioUrl];
      return this.streamUrls(trackOrId.id);
    }
    const trackedId = trackOrId.trim();
    if (!trackedId) throw new Error('Track ID tidak valid.');
    const rawId = trackedId.startsWith('jamendo:') ? trackedId.slice('jamendo:'.length) : trackedId;
    const encodedId = encodeURIComponent(rawId);
    return API_BASES.map((base) => `${base}/tracks/${encodedId}/stream?app_name=${APP_NAME}`);
  }

  public streamUrl(id: string): string {
    return this.streamUrls(id)[0];
  }

  public async getTrending(genre: string): Promise<Track[]> {
    const genreQuery = genre === 'Semua' ? '' : `&genre=${encodeURIComponent(genre)}`;
    const jamendoTags = genre === 'Semua' ? '' : `&tags=${encodeURIComponent(genre.toLowerCase().replace(/\//g, ' '))}`;
    return this.combineSources(this.api(`/tracks/trending?limit=30${genreQuery}`), `tracks/?order=popularity_total${jamendoTags}`);
  }

  public async search(query: string): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];
    const jamendoQuery = `tracks/?search=${encodeURIComponent(q)}&order=relevance`;
    return this.combineSources(this.api(`/tracks/search?limit=30&query=${encodeURIComponent(q)}`), jamendoQuery);
  }
}
