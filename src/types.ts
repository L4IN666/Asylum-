export type TabName = 'explore' | 'fav' | 'queue';
export type RepeatMode = 'off' | 'all' | 'one';

export interface Track {
  id: string;
  title: string;
  artist: string;
  art: string;
  artBig: string;
  duration: number;
}
