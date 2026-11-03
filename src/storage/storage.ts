import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Playlist } from '../types';

const SONGS_KEY = '@metronomo_songs_v1';
const PLAYLISTS_KEY = '@metronomo_playlists_v1';
const SETTINGS_KEY = '@metronomo_settings_v1';

/**
 * Serializes AsyncStorage read-modify-write operations so concurrent saves
 * or background syncs never overwrite newly created songs or playlists.
 */
let storageQueue: Promise<unknown> = Promise.resolve();

function enqueueStorageMutation<T>(task: () => Promise<T>): Promise<T> {
  const next = storageQueue.then(task, task);
  storageQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export const INITIAL_SONGS: Song[] = [
  {
    id: 'seed-1',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    bpm: 117,
    timeSignature: '4/4',
    subdivision: 1,
    key: 'F#m',
    notes: 'Groove reto de bateria marcante, bumbo e caixa firmes.',
    duration: '04:54',
    soundType: 'woodblock',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'seed-2',
    title: 'Take Five',
    artist: 'Dave Brubeck',
    bpm: 174,
    timeSignature: '5/4',
    subdivision: 1,
    key: 'Ebm',
    notes: 'Compasso 5/4 dividido em 3 + 2. Bateria no prato de condução.',
    duration: '05:24',
    soundType: 'mechanical',
    createdAt: Date.now() - 900000,
  },
  {
    id: 'seed-3',
    title: 'Hold the Line',
    artist: 'Toto',
    bpm: 97,
    timeSignature: '12/8',
    subdivision: 3,
    key: 'F#m',
    notes: 'Shuffle em tercinas no piano, levada pesada de rock.',
    duration: '03:56',
    soundType: 'rimshot',
    createdAt: Date.now() - 800000,
  },
  {
    id: 'seed-4',
    title: 'Another One Bites the Dust',
    artist: 'Queen',
    bpm: 110,
    timeSignature: '4/4',
    subdivision: 1,
    key: 'Em',
    notes: 'Linha de baixo icônica. Manter o tempo cravado.',
    duration: '03:35',
    soundType: 'beep',
    createdAt: Date.now() - 700000,
  },
  {
    id: 'seed-5',
    title: 'Garota de Ipanema',
    artist: 'Tom Jobim & Vinicius',
    bpm: 128,
    timeSignature: '2/4',
    subdivision: 2,
    key: 'F',
    notes: 'Levada clássica de Bossa Nova com síncope no violão.',
    duration: '03:15',
    soundType: 'woodblock',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'seed-6',
    title: 'We Are the Champions',
    artist: 'Queen',
    bpm: 64,
    timeSignature: '6/8',
    subdivision: 3,
    key: 'Cm',
    notes: 'Balada épica em 6/8 (2 pulsos principais subdivididos em 3).',
    duration: '02:59',
    soundType: 'woodblock',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'seed-7',
    title: 'Master of Puppets',
    artist: 'Metallica',
    bpm: 212,
    timeSignature: '4/4',
    subdivision: 1,
    key: 'Em',
    notes: 'Downpicking rápido na guitarra base. Manter precisão no andamento.',
    duration: '08:35',
    soundType: 'rimshot',
    createdAt: Date.now() - 400000,
  },
  {
    id: 'seed-8',
    title: 'Money',
    artist: 'Pink Floyd',
    bpm: 122,
    timeSignature: '7/4',
    subdivision: 1,
    key: 'Bm',
    notes: 'Compasso ímpar 7/4 no riff de baixo. Solo muda para 4/4.',
    duration: '06:22',
    soundType: 'mechanical',
    createdAt: Date.now() - 300000,
  },
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Repertório Show Rock & Pop',
    description: 'Setlist preparado para apresentação de fim de semana',
    songIds: ['seed-4', 'seed-1', 'seed-3', 'seed-6'],
    createdAt: Date.now() - 200000,
  },
  {
    id: 'playlist-2',
    name: 'Estudos de Compassos Ímpares & Compostos',
    description: 'Músicas para treinar percepção rítmica e contagem',
    songIds: ['seed-2', 'seed-8', 'seed-3', 'seed-6', 'seed-5'],
    createdAt: Date.now() - 100000,
  },
];

async function readSongsRaw(): Promise<Song[]> {
  try {
    const data = await AsyncStorage.getItem(SONGS_KEY);
    if (!data) {
      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(INITIAL_SONGS));
      return INITIAL_SONGS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_SONGS;
  } catch (err) {
    console.warn('Erro ao carregar músicas do storage:', err);
    return INITIAL_SONGS;
  }
}

async function readPlaylistsRaw(): Promise<Playlist[]> {
  try {
    const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
    if (!data) {
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(INITIAL_PLAYLISTS));
      return INITIAL_PLAYLISTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_PLAYLISTS;
  } catch (err) {
    console.warn('Erro ao carregar playlists do storage:', err);
    return INITIAL_PLAYLISTS;
  }
}

export const StorageService = {
  // SONGS
  async getSongs(): Promise<Song[]> {
    return enqueueStorageMutation(() => readSongsRaw());
  },

  async setSongs(songs: Song[]): Promise<void> {
    return enqueueStorageMutation(async () => {
      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
    });
  },

  async saveSong(song: Song): Promise<Song[]> {
    return enqueueStorageMutation(async () => {
      const songs = await readSongsRaw();
      const existingIndex = songs.findIndex(
        (s) =>
          s.id === song.id ||
          Boolean(song.cloudId && (s.id === song.cloudId || s.cloudId === song.cloudId))
      );

      let updated: Song[];
      if (existingIndex >= 0) {
        const previousSong = songs[existingIndex];
        const mergedSong: Song = {
          ...previousSong,
          ...song,
          cloudId: song.cloudId || previousSong.cloudId,
          userId: song.userId || previousSong.userId,
        };
        updated = [...songs];
        updated[existingIndex] = mergedSong;

        // If the song ID was promoted (e.g. from temporary ID to cloud UUID), keep playlist references intact
        if (previousSong.id !== mergedSong.id) {
          const playlists = await readPlaylistsRaw();
          let playlistsChanged = false;
          const updatedPlaylists = playlists.map((p) => {
            if (!p.songIds.includes(previousSong.id)) return p;
            playlistsChanged = true;
            return {
              ...p,
              songIds: p.songIds.map((id) => (id === previousSong.id ? mergedSong.id : id)),
            };
          });
          if (playlistsChanged) {
            await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
          }
        }
      } else {
        updated = [song, ...songs];
      }

      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(updated));
      return updated;
    });
  },

  async deleteSong(songId: string): Promise<Song[]> {
    return enqueueStorageMutation(async () => {
      const songs = await readSongsRaw();
      const target = songs.find((s) => s.id === songId || s.cloudId === songId);
      const updated = songs.filter((s) => s.id !== songId && s.cloudId !== songId);
      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(updated));

      // Also remove reference from playlists
      const playlists = await readPlaylistsRaw();
      const updatedPlaylists = playlists.map((p) => ({
        ...p,
        songIds: p.songIds.filter(
          (id) => id !== songId && (!target?.cloudId || id !== target.cloudId) && (!target?.id || id !== target.id)
        ),
      }));
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));

      return updated;
    });
  },

  // PLAYLISTS
  async getPlaylists(): Promise<Playlist[]> {
    return enqueueStorageMutation(() => readPlaylistsRaw());
  },

  async setPlaylists(playlists: Playlist[]): Promise<void> {
    return enqueueStorageMutation(async () => {
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    });
  },

  async savePlaylist(playlist: Playlist): Promise<Playlist[]> {
    return enqueueStorageMutation(async () => {
      const playlists = await readPlaylistsRaw();
      const existingIndex = playlists.findIndex(
        (p) =>
          p.id === playlist.id ||
          Boolean(playlist.cloudId && (p.id === playlist.cloudId || p.cloudId === playlist.cloudId))
      );
      let updated: Playlist[];
      if (existingIndex >= 0) {
        const previous = playlists[existingIndex];
        updated = [...playlists];
        updated[existingIndex] = {
          ...previous,
          ...playlist,
          cloudId: playlist.cloudId || previous.cloudId,
          userId: playlist.userId || previous.userId,
        };
      } else {
        updated = [playlist, ...playlists];
      }
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  },

  async deletePlaylist(playlistId: string): Promise<Playlist[]> {
    return enqueueStorageMutation(async () => {
      const playlists = await readPlaylistsRaw();
      const updated = playlists.filter((p) => p.id !== playlistId && p.cloudId !== playlistId);
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  },

  async addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist[]> {
    return enqueueStorageMutation(async () => {
      const playlists = await readPlaylistsRaw();
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return playlists;

      if (!target.songIds.includes(songId)) {
        target.songIds.push(songId);
      }
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      return [...playlists];
    });
  },

  async removeSongFromPlaylist(playlistId: string, songIndex: number): Promise<Playlist[]> {
    return enqueueStorageMutation(async () => {
      const playlists = await readPlaylistsRaw();
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return playlists;

      target.songIds.splice(songIndex, 1);
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      return [...playlists];
    });
  },

  async reorderPlaylistSongs(playlistId: string, fromIndex: number, toIndex: number): Promise<Playlist[]> {
    return enqueueStorageMutation(async () => {
      const playlists = await readPlaylistsRaw();
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return playlists;

      if (toIndex < 0 || toIndex >= target.songIds.length) return playlists;

      const [movedId] = target.songIds.splice(fromIndex, 1);
      target.songIds.splice(toIndex, 0, movedId);

      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      return [...playlists];
    });
  },

  // BACKUP & RESTORE
  async exportBackup(): Promise<string> {
    const songs = await this.getSongs();
    const playlists = await this.getPlaylists();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs,
      playlists,
    };
    return JSON.stringify(payload, null, 2);
  },

  async importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    return enqueueStorageMutation(async () => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed.songs) || !Array.isArray(parsed.playlists)) {
          return { success: false, message: 'Formato de arquivo JSON inválido para backup.' };
        }
        await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(parsed.songs));
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(parsed.playlists));
        return { success: true, message: 'Dados restaurados com sucesso!' };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha desconhecida';
        return { success: false, message: `Erro ao importar: ${message}` };
      }
    });
  },

  async resetToDefaults(): Promise<void> {
    return enqueueStorageMutation(async () => {
      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(INITIAL_SONGS));
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(INITIAL_PLAYLISTS));
    });
  },

  async clearSessionCache(): Promise<void> {
    return enqueueStorageMutation(async () => {
      try {
        await Promise.all([
          AsyncStorage.removeItem(SONGS_KEY),
          AsyncStorage.removeItem(PLAYLISTS_KEY),
          AsyncStorage.removeItem(SETTINGS_KEY),
        ]);
      } catch (err) {
        console.warn('Erro ao limpar cache local de sessão:', err);
      }
    });
  },
};
