import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackRepository } from './classes/TrackRepository';

describe('TrackRepository', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters invalid records and keeps valid items', async () => {
    const repo = new TrackRepository();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'track-1',
            title: 'Valid Track',
            user: { name: 'Artist A' },
            artwork: { '150x150': 'https://example.com/a.jpg' },
            duration: 120
          },
          { id: '', title: 'Broken' },
          null,
          'not-a-track-object',
          { id: 'track-2', title: 'Another', user: { name: 'Artist B' }, duration: 'bad' }
        ]
      })
    });

    vi.stubGlobal('fetch', fetchMock);
    const result = await repo.search('sample');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('track-1');
    expect(result[1].id).toBe('track-2');
  });

  it('rejects empty stream ids and invalid API payloads', async () => {
    const repo = new TrackRepository();

    expect(() => repo.streamUrl('')).toThrow('Track ID tidak valid.');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ignored: true })
    }));

    await expect(repo.search('bad')).rejects.toThrow('Sumber musik tidak merespons');
  });
});
