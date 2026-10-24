import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Playlist, MetronomeState } from '../types';

const SONGS_KEY = '@metronomo_songs_v1';
const PLAYLISTS_KEY = '@metronomo_playlists_v1';
const SETTINGS_KEY = '@metronomo_settings_v1';

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

export const StorageService = {
  // SONGS
  async getSongs(): Promise<Song[]> {
    try {
      const data = await AsyncStorage.getItem(SONGS_KEY);
      if (!data) {
        await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(INITIAL_SONGS));
        return INITIAL_SONGS;
      }
      return JSON.parse(data);
    } catch (err) {
      console.warn('Erro ao carregar músicas do storage:', err);
      return INITIAL_SONGS;
    }
  },

  async saveSong(song: Song): Promise<Song[]> {
    const songs = await this.getSongs();
    const existingIndex = songs.findIndex((s) => s.id === song.id);
    let updated: Song[];
    if (existingIndex >= 0) {
      updated = [...songs];
      updated[existingIndex] = song;
    } else {
      updated = [song, ...songs];
    }
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(updated));
    return updated;
  },

  async deleteSong(songId: string): Promise<Song[]> {
    const songs = await this.getSongs();
    const updated = songs.filter((s) => s.id !== songId);
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(updated));

    // Also remove reference from playlists
    const playlists = await this.getPlaylists();
    const updatedPlaylists = playlists.map((p) => ({
      ...p,
      songIds: p.songIds.filter((id) => id !== songId),
    }));
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));

    return updated;
  },

  // PLAYLISTS
  async getPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
      if (!data) {
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(INITIAL_PLAYLISTS));
        return INITIAL_PLAYLISTS;
      }
      return JSON.parse(data);
    } catch (err) {
      console.warn('Erro ao carregar playlists do storage:', err);
      return INITIAL_PLAYLISTS;
    }
  },

  async savePlaylist(playlist: Playlist): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    const existingIndex = playlists.findIndex((p) => p.id === playlist.id);
    let updated: Playlist[];
    if (existingIndex >= 0) {
      updated = [...playlists];
      updated[existingIndex] = playlist;
    } else {
      updated = [playlist, ...playlists];
    }
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    return updated;
  },

  async deletePlaylist(playlistId: string): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    const updated = playlists.filter((p) => p.id !== playlistId);
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    return updated;
  },

  async addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return playlists;

    if (!target.songIds.includes(songId)) {
      target.songIds.push(songId);
    }
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    return [...playlists];
  },

  async removeSongFromPlaylist(playlistId: string, songIndex: number): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return playlists;

    target.songIds.splice(songIndex, 1);
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    return [...playlists];
  },

  async reorderPlaylistSongs(playlistId: string, fromIndex: number, toIndex: number): Promise<Playlist[]> {
    const playlists = await this.getPlaylists();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return playlists;

    if (toIndex < 0 || toIndex >= target.songIds.length) return playlists;

    const [movedId] = target.songIds.splice(fromIndex, 1);
    target.songIds.splice(toIndex, 0, movedId);

    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    return [...playlists];
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
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.songs) || !Array.isArray(parsed.playlists)) {
        return { success: false, message: 'Formato de arquivo JSON inválido para backup.' };
      }
      await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(parsed.songs));
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(parsed.playlists));
      return { success: true, message: 'Dados restaurados com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Erro ao importar: ${err.message}` };
    }
  },

  async resetToDefaults(): Promise<void> {
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(INITIAL_SONGS));
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(INITIAL_PLAYLISTS));
  },
};
