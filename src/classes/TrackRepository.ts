import type { Track } from '../types';

const API = 'https://api.audius.co/v1';
const APP_NAME = 'Asylum';

export class TrackRepository {
  private mapTrack(track: Record<string, any>): Track {
    return {
      id: String(track.id),
      title: String(track.title ?? 'Unknown Track'),
      artist: String(track.user?.name ?? 'Unknown Artist'),
      art: String(track.artwork?.['150x150'] || track.artwork?.['480x480'] || ''),
      artBig: String(track.artwork?.['480x480'] || track.artwork?.['150x150'] || ''),
      duration: Number(track.duration || 0)
    };
  }

  private async api(path: string): Promise<Track[]> {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${API}${path}${separator}app_name=${APP_NAME}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    return (json.data || []).map((item: Record<string, any>) => this.mapTrack(item));
  }

  public formatTime(value: number): string {
    const total = Math.floor(value || 0);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  public streamUrl(id: string): string {
    return `${API}/tracks/${id}/stream?app_name=${APP_NAME}`;
  }

  public async getTrending(genre: string): Promise<Track[]> {
    const genreQuery = genre === 'Semua' ? '' : `&genre=${encodeURIComponent(genre)}`;
    return this.api(`/tracks/trending?limit=30${genreQuery}`);
  }

  public async search(query: string): Promise<Track[]> {
    return this.api(`/tracks/search?limit=30&query=${encodeURIComponent(query)}`);
  }
}
