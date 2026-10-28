import { supabase, AuthService } from './supabaseClient';
import { Song, Playlist, UserSettings, BeatState, SoundType, Subdivision } from '../types';

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
  accent_pattern: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudPlaylistRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  song_ids: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudUserSettingsRow {
  user_id: string;
  theme_id: string;
  default_sound_type: string;
  flash_enabled: boolean;
  haptics_enabled: boolean;
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

/** Explicit projections: avoids `select('*')` over-fetching and schema drift. */
const SONG_COLUMNS =
  'id, user_id, title, artist, bpm, time_signature, subdivision, key, notes, duration, sound_type, accent_pattern, is_public, created_at, updated_at';

const PLAYLIST_COLUMNS =
  'id, user_id, name, description, song_ids, is_public, created_at, updated_at';

const USER_SETTINGS_COLUMNS =
  'user_id, theme_id, default_sound_type, flash_enabled, haptics_enabled, created_at, updated_at';

const GLOBAL_LIBRARY_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves the Supabase row id for a song (persisted cloudId, or a UUID-shaped local id). */
function resolveSongCloudId(song: Song, currentUserId: string): string | undefined {
  // Only reuse cloudId if the song belongs to the current user (or has no owner recorded yet)
  if (song.userId && song.userId !== currentUserId) {
    return undefined;
  }
  if (song.cloudId && UUID_PATTERN.test(song.cloudId)) return song.cloudId;
  return UUID_PATTERN.test(song.id) ? song.id : undefined;
}

/** Resolves the Supabase row id for a playlist (persisted cloudId, or a UUID-shaped local id). */
function resolvePlaylistCloudId(playlist: Playlist, currentUserId: string): string | undefined {
  if (playlist.userId && playlist.userId !== currentUserId) {
    return undefined;
  }
  if (playlist.cloudId && UUID_PATTERN.test(playlist.cloudId)) return playlist.cloudId;
  return UUID_PATTERN.test(playlist.id) ? playlist.id : undefined;
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

function mapRowToPlaylist(row: CloudPlaylistRow): Playlist {
  const parsedSongIds = Array.isArray(row.song_ids)
    ? row.song_ids.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    songIds: parsedSongIds,
    cloudId: row.id,
    userId: row.user_id,
    isPublic: row.is_public,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapRowToUserSettings(row: CloudUserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    themeId: row.theme_id || 'oled_zero',
    defaultSoundType: (row.default_sound_type as SoundType) || 'woodblock',
    flashEnabled: typeof row.flash_enabled === 'boolean' ? row.flash_enabled : true,
    hapticsEnabled: typeof row.haptics_enabled === 'boolean' ? row.haptics_enabled : true,
    updatedAt: row.updated_at,
  };
}

export const CloudLibraryService = {
  /**
   * Salva ou atualiza uma música na nuvem (Supabase) vinculada exclusivamente ao auth.uid()
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

    const cloudId = resolveSongCloudId(song, user.id);

    if (cloudId) {
      // Try updating existing row owned by current user
      const { data: updatedData, error: updateError } = await supabase
        .from('songs')
        .upsert({ id: cloudId, ...payload }, { onConflict: 'id' })
        .select(SONG_COLUMNS)
        .single<CloudSongRow>();

      if (!updateError && updatedData) {
        return mapRowToSong(updatedData);
      }
      // If upsert failed because the UUID belonged to another user in RLS, insert a fresh row for this user
    }

    const { data, error } = await supabase
      .from('songs')
      .insert(payload)
      .select(SONG_COLUMNS)
      .single<CloudSongRow>();

    if (error) throw error;
    return mapRowToSong(data);
  },

  /**
   * Remove uma música na nuvem (apenas se pertencer ao auth.uid() atual)
   */
  async deleteSongFromCloud(song: Song | string): Promise<void> {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const candidateId =
      typeof song === 'string'
        ? UUID_PATTERN.test(song)
          ? song
          : undefined
        : resolveSongCloudId(song, user.id);

    if (!candidateId) return;

    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', candidateId)
      .eq('user_id', user.id);

    if (error) throw error;
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
   * Salva ou atualiza uma playlist na nuvem (Supabase) vinculada ao auth.uid()
   */
  async uploadPlaylistToCloud(playlist: Playlist): Promise<Playlist> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('Você precisa estar autenticado para salvar playlists na nuvem.');
    }

    const payload = {
      user_id: user.id,
      name: playlist.name,
      description: playlist.description || '',
      song_ids: playlist.songIds || [],
      is_public: Boolean(playlist.isPublic),
      updated_at: new Date().toISOString(),
    };

    const cloudId = resolvePlaylistCloudId(playlist, user.id);

    if (cloudId) {
      const { data: updatedData, error: updateError } = await supabase
        .from('playlists')
        .upsert({ id: cloudId, ...payload }, { onConflict: 'id' })
        .select(PLAYLIST_COLUMNS)
        .single<CloudPlaylistRow>();

      if (!updateError && updatedData) {
        return mapRowToPlaylist(updatedData);
      }
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert(payload)
      .select(PLAYLIST_COLUMNS)
      .single<CloudPlaylistRow>();

    if (error) throw error;
    return mapRowToPlaylist(data);
  },

  /**
   * Remove uma playlist na nuvem (apenas se pertencer ao auth.uid() atual)
   */
  async deletePlaylistFromCloud(playlist: Playlist | string): Promise<void> {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const candidateId =
      typeof playlist === 'string'
        ? UUID_PATTERN.test(playlist)
          ? playlist
          : undefined
        : resolvePlaylistCloudId(playlist, user.id);

    if (!candidateId) return;

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', candidateId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Busca as playlists do próprio usuário na nuvem
   */
  async fetchMyPlaylists(): Promise<Playlist[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('playlists')
      .select(PLAYLIST_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<CloudPlaylistRow[]>();

    if (error) throw error;
    return (data || []).map((row) => mapRowToPlaylist(row));
  },

  /**
   * Busca as preferências do usuário (`user_settings`) no Supabase.
   * Cria o registro padrão automaticamente se ainda não existir para este `auth.uid()`.
   */
  async fetchUserSettings(userId?: string): Promise<UserSettings | null> {
    const resolvedUserId = userId || (await AuthService.getCurrentUser())?.id;
    if (!resolvedUserId) return null;

    const { data, error } = await supabase
      .from('user_settings')
      .select(USER_SETTINGS_COLUMNS)
      .eq('user_id', resolvedUserId)
      .maybeSingle<CloudUserSettingsRow>();

    if (error) throw error;

    if (data) {
      return mapRowToUserSettings(data);
    }

    // Provision default settings row on first access
    const defaultPayload = {
      user_id: resolvedUserId,
      theme_id: 'oled_zero',
      default_sound_type: 'woodblock',
      flash_enabled: true,
      haptics_enabled: true,
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from('user_settings')
      .upsert(defaultPayload, { onConflict: 'user_id' })
      .select(USER_SETTINGS_COLUMNS)
      .single<CloudUserSettingsRow>();

    if (insertError) throw insertError;
    return mapRowToUserSettings(created);
  },

  /**
   * Salva ou atualiza as configurações do usuário (`user_settings`) no Supabase
   */
  async saveUserSettings(
    partial: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>,
    userId?: string
  ): Promise<UserSettings | null> {
    const resolvedUserId = userId || (await AuthService.getCurrentUser())?.id;
    if (!resolvedUserId) return null;

    const updatePayload: Record<string, unknown> = {
      user_id: resolvedUserId,
      updated_at: new Date().toISOString(),
    };

    if (partial.themeId !== undefined) updatePayload.theme_id = partial.themeId;
    if (partial.defaultSoundType !== undefined) updatePayload.default_sound_type = partial.defaultSoundType;
    if (partial.flashEnabled !== undefined) updatePayload.flash_enabled = partial.flashEnabled;
    if (partial.hapticsEnabled !== undefined) updatePayload.haptics_enabled = partial.hapticsEnabled;

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(updatePayload, { onConflict: 'user_id' })
      .select(USER_SETTINGS_COLUMNS)
      .single<CloudUserSettingsRow>();

    if (error) throw error;
    return mapRowToUserSettings(data);
  },

  /**
   * Busca músicas da Biblioteca Global
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

    const { data: shares, error: shareError } = await supabase
      .from('song_shares')
      .select('song_id, shared_by, can_edit')
      .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email.toLowerCase()}`);

    if (shareError || !shares || shares.length === 0) return [];

    const songIds = shares.map((s) => s.song_id);
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select(SONG_COLUMNS)
      .in('id', songIds)
      .returns<CloudSongRow[]>();

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
      .select('id, song_id, shared_by, shared_with_email, shared_with_user_id, can_edit, created_at')
      .eq('song_id', songId)
      .returns<SongShareRow[]>();

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
