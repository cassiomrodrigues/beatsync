import { supabase, AuthService } from './supabaseClient';
import { Song, BeatState, SoundType, Subdivision } from '../types';

export interface CloudSongRow {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  bpm: number;
  time_signature: string;
  subdivision: number;
  key: string | null;
  notes: string | null;
  duration: string | null;
  sound_type: string;
  accent_pattern: any;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SongShareRow {
  id: string;
  song_id: string;
  shared_by: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  can_edit: boolean;
  created_at: string;
}

/** Explicit projection: avoids `select('*')` over-fetching and schema drift. */
const SONG_COLUMNS =
  'id, user_id, title, artist, bpm, time_signature, subdivision, key, notes, duration, sound_type, accent_pattern, is_public, created_at, updated_at';

const GLOBAL_LIBRARY_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves the Supabase row id for a song (persisted cloudId, or a UUID-shaped local id). */
function resolveCloudId(song: Song): string | undefined {
  if (song.cloudId && UUID_PATTERN.test(song.cloudId)) return song.cloudId;
  return UUID_PATTERN.test(song.id) ? song.id : undefined;
}

function mapRowToSong(row: CloudSongRow, isShared = false, sharedBy?: string): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist || '',
    bpm: row.bpm,
    timeSignature: row.time_signature || '4/4',
    subdivision: (row.subdivision as Subdivision) || 1,
    key: row.key || undefined,
    notes: row.notes || undefined,
    duration: row.duration || undefined,
    soundType: (row.sound_type as SoundType) || 'woodblock',
    accentPattern: Array.isArray(row.accent_pattern) ? (row.accent_pattern as BeatState[]) : undefined,
    isPublic: row.is_public,
    cloudId: row.id,
    userId: row.user_id,
    isShared,
    sharedBy,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export const CloudLibraryService = {
  /**
   * Salva ou atualiza uma música na nuvem (Supabase)
   */
  async uploadSongToCloud(song: Song, isPublic = false): Promise<Song> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('Você precisa estar autenticado para salvar músicas na nuvem.');
    }

    const payload = {
      user_id: user.id,
      title: song.title,
      artist: song.artist,
      bpm: song.bpm,
      time_signature: song.timeSignature,
      subdivision: song.subdivision || 1,
      key: song.key || null,
      notes: song.notes || null,
      duration: song.duration || null,
      sound_type: song.soundType || 'woodblock',
      accent_pattern: song.accentPattern || ['accent', 'normal', 'normal', 'normal'],
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    };

    // Reuse the persisted Supabase UUID (cloudId) so re-saves update the same row
    // instead of inserting duplicates (e.g. when toggling public/private).
    const cloudId = resolveCloudId(song);

    const query = cloudId
      ? supabase.from('songs').upsert({ id: cloudId, ...payload }, { onConflict: 'id' })
      : supabase.from('songs').insert(payload);

    const { data, error } = await query.select(SONG_COLUMNS).single<CloudSongRow>();
    if (error) throw error;

    return mapRowToSong(data);
  },

  /**
   * Busca as músicas do próprio usuário na nuvem
   */
  async fetchMySongs(): Promise<Song[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('songs')
      .select(SONG_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<CloudSongRow[]>();

    if (error) throw error;
    return (data || []).map((row) => mapRowToSong(row));
  },

  /**
   * Busca músicas da Biblioteca Global (públicas para toda a comunidade de músicos).
   * Usa o índice parcial idx_songs_public_created_at (WHERE is_public ORDER BY created_at DESC).
   */
  async fetchGlobalSongs(): Promise<Song[]> {
    const { data, error } = await supabase
      .from('songs')
      .select(SONG_COLUMNS)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(GLOBAL_LIBRARY_LIMIT)
      .returns<CloudSongRow[]>();

    if (error) throw error;
    return (data || []).map((row) => mapRowToSong(row));
  },

  /**
   * Compartilha uma música com outro usuário via e-mail
   */
  async shareSongWithEmail(songId: string, targetEmail: string, canEdit = false): Promise<void> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('Você precisa estar autenticado para compartilhar músicas.');
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('E-mail de destino inválido.');
    }

    const { error } = await supabase.from('song_shares').insert({
      song_id: songId,
      shared_by: user.id,
      shared_with_email: cleanEmail,
      can_edit: canEdit,
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error('Esta música já foi compartilhada com este e-mail.');
      }
      throw error;
    }
  },

  /**
   * Busca as músicas compartilhadas com o usuário logado
   */
  async fetchSharedWithMe(): Promise<Song[]> {
    const user = await AuthService.getCurrentUser();
    if (!user || !user.email) return [];

    // Get shares targeting current user
    const { data: shares, error: shareError } = await supabase
      .from('song_shares')
      .select('song_id, shared_by, can_edit')
      .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email.toLowerCase()}`);

    if (shareError || !shares || shares.length === 0) return [];

    const songIds = shares.map((s) => s.song_id);
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .in('id', songIds);

    if (songsError || !songsData) return [];

    return songsData.map((row) => {
      const shareInfo = shares.find((s) => s.song_id === row.id);
      return mapRowToSong(row, true, shareInfo?.shared_by);
    });
  },

  /**
   * Lista com quem uma música está compartilhada
   */
  async getSharesForSong(songId: string): Promise<SongShareRow[]> {
    const { data, error } = await supabase
      .from('song_shares')
      .select('*')
      .eq('song_id', songId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Remove compartilhamento
   */
  async revokeShare(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('song_shares')
      .delete()
      .eq('id', shareId);

    if (error) throw error;
  },
};
