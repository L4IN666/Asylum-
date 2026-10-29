export type TabName = 'explore' | 'search' | 'library' | 'fav' | 'queue' | 'playlist';
export type RepeatMode = 'off' | 'all' | 'one';

export interface Track {
  id: string;
  title: string;
  artist: string;
  art: string;
  artBig: string;
  duration: number;
  provider?: 'audius' | 'jamendo';
  audioUrl?: string;
}
