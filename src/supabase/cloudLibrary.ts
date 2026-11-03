import { supabase, AuthService } from './supabaseClient';
import {
  Song,
  Playlist,
  UserSettings,
  AuditLog,
  AuditAction,
  BeatState,
  SoundType,
  Subdivision,
} from '../types';

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

export interface CloudAuditLogRow {
  id: string;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
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

const AUDIT_LOG_COLUMNS =
  'id, table_name, record_id, action, user_id, old_data, new_data, created_at';

const GLOBAL_LIBRARY_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generates an RFC 4122 v4 UUID so locally created songs and playlists
 * already carry a valid primary key for atomic `.upsert()` in Supabase.
 */
export function generateUUID(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomNibble = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Resolves the authenticated Supabase user ID without unnecessary network roundtrips
 * when an active session is already available locally.
 */
async function resolveAuthenticatedUserId(explicitUserId?: string): Promise<string | null> {
  if (explicitUserId && UUID_PATTERN.test(explicitUserId)) {
    return explicitUserId;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) {
      return sessionData.session.user.id;
    }
  } catch {
    // Fallback to getCurrentUser below
  }
  const user = await AuthService.getCurrentUser();
  return user?.id || null;
}

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

function getSongSignature(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
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
    isPublic: Boolean(row.is_public),
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
    isPublic: Boolean(row.is_public),
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

function mapRowToAuditLog(row: CloudAuditLogRow): AuditLog {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    userId: row.user_id,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  };
}

export const CloudLibraryService = {
  /**
   * Salva ou atualiza uma música na nuvem (Supabase) via UPSERT atômico vinculada ao auth.uid()
   */
  async uploadSongToCloud(song: Song, isPublic?: boolean, userId?: string): Promise<Song> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) {
      throw new Error('Você precisa estar autenticado para salvar músicas na nuvem.');
    }

    const effectiveIsPublic = typeof isPublic === 'boolean' ? isPublic : Boolean(song.isPublic);
    const targetId = resolveSongCloudId(song, resolvedUserId) || generateUUID();

    const payload = {
      id: targetId,
      user_id: resolvedUserId,
      title: song.title.trim(),
      artist: (song.artist || '').trim(),
      bpm: song.bpm,
      time_signature: song.timeSignature || '4/4',
      subdivision: song.subdivision || 1,
      key: song.key || null,
      notes: song.notes || null,
      duration: song.duration || null,
      sound_type: song.soundType || 'woodblock',
      accent_pattern: song.accentPattern || ['accent', 'normal', 'normal', 'normal'],
      is_public: effectiveIsPublic,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedData, error: upsertError } = await supabase
      .from('songs')
      .upsert(payload, { onConflict: 'id' })
      .select(SONG_COLUMNS)
      .single<CloudSongRow>();

    if (!upsertError && upsertedData) {
      return mapRowToSong(upsertedData);
    }

    // If the candidate UUID collided with another user's row under RLS, generate a fresh UUID and upsert
    const fallbackPayload = {
      ...payload,
      id: generateUUID(),
    };

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('songs')
      .upsert(fallbackPayload, { onConflict: 'id' })
      .select(SONG_COLUMNS)
      .single<CloudSongRow>();

    if (fallbackError) throw fallbackError;
    return mapRowToSong(fallbackData);
  },

  /**
   * Remove uma música na nuvem (apenas se pertencer ao auth.uid() atual)
   */
  async deleteSongFromCloud(song: Song | string, userId?: string): Promise<void> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) return;

    const candidateId =
      typeof song === 'string'
        ? UUID_PATTERN.test(song)
          ? song
          : undefined
        : resolveSongCloudId(song, resolvedUserId);

    if (!candidateId) return;

    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', candidateId)
      .eq('user_id', resolvedUserId);

    if (error) throw error;
  },

  /**
   * Busca as músicas do próprio usuário na nuvem
   */
  async fetchMySongs(userId?: string): Promise<Song[]> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) return [];

    const { data, error } = await supabase
      .from('songs')
      .select(SONG_COLUMNS)
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .returns<CloudSongRow[]>();

    if (error) throw error;
    return (data || []).map((row) => mapRowToSong(row));
  },

  /**
   * Salva ou atualiza uma playlist na nuvem (Supabase) via UPSERT atômico vinculada ao auth.uid()
   */
  async uploadPlaylistToCloud(playlist: Playlist, userId?: string): Promise<Playlist> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) {
      throw new Error('Você precisa estar autenticado para salvar playlists na nuvem.');
    }

    const targetId = resolvePlaylistCloudId(playlist, resolvedUserId) || generateUUID();

    const payload = {
      id: targetId,
      user_id: resolvedUserId,
      name: playlist.name.trim(),
      description: playlist.description || '',
      song_ids: playlist.songIds || [],
      is_public: Boolean(playlist.isPublic),
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedData, error: upsertError } = await supabase
      .from('playlists')
      .upsert(payload, { onConflict: 'id' })
      .select(PLAYLIST_COLUMNS)
      .single<CloudPlaylistRow>();

    if (!upsertError && upsertedData) {
      return mapRowToPlaylist(upsertedData);
    }

    const fallbackPayload = {
      ...payload,
      id: generateUUID(),
    };

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('playlists')
      .upsert(fallbackPayload, { onConflict: 'id' })
      .select(PLAYLIST_COLUMNS)
      .single<CloudPlaylistRow>();

    if (fallbackError) throw fallbackError;
    return mapRowToPlaylist(fallbackData);
  },

  /**
   * Remove uma playlist na nuvem (apenas se pertencer ao auth.uid() atual)
   */
  async deletePlaylistFromCloud(playlist: Playlist | string, userId?: string): Promise<void> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) return;

    const candidateId =
      typeof playlist === 'string'
        ? UUID_PATTERN.test(playlist)
          ? playlist
          : undefined
        : resolvePlaylistCloudId(playlist, resolvedUserId);

    if (!candidateId) return;

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', candidateId)
      .eq('user_id', resolvedUserId);

    if (error) throw error;
  },

  /**
   * Busca as playlists do próprio usuário na nuvem
   */
  async fetchMyPlaylists(userId?: string): Promise<Playlist[]> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) return [];

    const { data, error } = await supabase
      .from('playlists')
      .select(PLAYLIST_COLUMNS)
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .returns<CloudPlaylistRow[]>();

    if (error) throw error;
    return (data || []).map((row) => mapRowToPlaylist(row));
  },

  /**
   * Sincronização bidirecional Local <-> Nuvem sem perda de dados:
   * - Busca músicas e playlists do usuário no Supabase;
   * - Faz upload automático (upsert) de músicas/playlists criadas localmente que ainda não estão na nuvem;
   * - Preserva o repertório local (incluindo seeds não sincronizadas) evitando descarte acidental;
   * - Atualiza referências de IDs nas playlists quando músicas locais recebem UUID na nuvem.
   */
  async syncLocalAndCloudLibrary(
    localSongs: Song[],
    localPlaylists: Playlist[],
    userId?: string
  ): Promise<{ songs: Song[]; playlists: Playlist[] }> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
    if (!resolvedUserId) {
      return { songs: localSongs, playlists: localPlaylists };
    }

    const [cloudSongs, cloudPlaylists] = await Promise.all([
      this.fetchMySongs(resolvedUserId).catch((err) => {
        console.warn('Falha ao buscar músicas da nuvem durante sync:', err);
        return [] as Song[];
      }),
      this.fetchMyPlaylists(resolvedUserId).catch((err) => {
        console.warn('Falha ao buscar playlists da nuvem durante sync:', err);
        return [] as Playlist[];
      }),
    ]);

    const cloudSongsById = new Map<string, Song>();
    const cloudSongsBySig = new Map<string, Song>();
    for (const cs of cloudSongs) {
      cloudSongsById.set(cs.id, cs);
      cloudSongsBySig.set(getSongSignature(cs.title, cs.artist), cs);
    }

    const songIdRemap = new Map<string, string>();
    const retainedLocalSongs: Song[] = [];

    for (const ls of localSongs) {
      const matchedById =
        cloudSongsById.get(ls.id) || (ls.cloudId ? cloudSongsById.get(ls.cloudId) : undefined);

      if (matchedById) {
        if (ls.id !== matchedById.id) {
          songIdRemap.set(ls.id, matchedById.id);
        }
        continue;
      }

      const isSeedSong = ls.id.startsWith('seed-');
      if (isSeedSong) {
        const matchedSeedBySig = cloudSongsBySig.get(getSongSignature(ls.title, ls.artist));
        if (matchedSeedBySig) {
          songIdRemap.set(ls.id, matchedSeedBySig.id);
          continue;
        }
        // Keep un-uploaded seed songs locally so saving a new song never wipes out the rest of the library
        retainedLocalSongs.push(ls);
        continue;
      }

      // User-authored song not yet present in cloudSongs: upsert it to Supabase now so it is never lost
      try {
        const uploaded = await this.uploadSongToCloud(ls, Boolean(ls.isPublic), resolvedUserId);
        if (ls.id !== uploaded.id) {
          songIdRemap.set(ls.id, uploaded.id);
        }
        cloudSongsById.set(uploaded.id, uploaded);
      } catch (err) {
        console.warn('Mantendo música local pendente de sincronização:', err);
        retainedLocalSongs.push(ls);
      }
    }

    const mergedSongs: Song[] = [
      ...Array.from(cloudSongsById.values()),
      ...retainedLocalSongs,
    ].sort((a, b) => b.createdAt - a.createdAt);

    // Reconcile playlists and apply songIdRemap
    const cloudPlaylistsById = new Map<string, Playlist>();
    const cloudPlaylistsByName = new Map<string, Playlist>();
    for (const cp of cloudPlaylists) {
      const remappedSongIds = cp.songIds.map((id) => songIdRemap.get(id) || id);
      const normalized = { ...cp, songIds: remappedSongIds };
      cloudPlaylistsById.set(cp.id, normalized);
      cloudPlaylistsByName.set(cp.name.trim().toLowerCase(), normalized);
    }

    const retainedLocalPlaylists: Playlist[] = [];

    for (const lp of localPlaylists) {
      const remappedSongIds = lp.songIds.map((id) => songIdRemap.get(id) || id);
      const updatedLocalPlaylist: Playlist = { ...lp, songIds: remappedSongIds };

      const matchedById =
        cloudPlaylistsById.get(lp.id) ||
        (lp.cloudId ? cloudPlaylistsById.get(lp.cloudId) : undefined);

      if (matchedById) {
        continue;
      }

      const isDefaultPlaylist = lp.id.startsWith('playlist-') && !UUID_PATTERN.test(lp.id);
      if (isDefaultPlaylist) {
        const matchedByName = cloudPlaylistsByName.get(lp.name.trim().toLowerCase());
        if (matchedByName) {
          continue;
        }
        retainedLocalPlaylists.push(updatedLocalPlaylist);
        continue;
      }

      try {
        const uploadedPlaylist = await this.uploadPlaylistToCloud(
          updatedLocalPlaylist,
          resolvedUserId
        );
        cloudPlaylistsById.set(uploadedPlaylist.id, uploadedPlaylist);
      } catch (err) {
        console.warn('Mantendo playlist local pendente de sincronização:', err);
        retainedLocalPlaylists.push(updatedLocalPlaylist);
      }
    }

    const mergedPlaylists: Playlist[] = [
      ...Array.from(cloudPlaylistsById.values()),
      ...retainedLocalPlaylists,
    ].sort((a, b) => b.createdAt - a.createdAt);

    return {
      songs: mergedSongs,
      playlists: mergedPlaylists,
    };
  },

  /**
   * Busca as preferências do usuário (`user_settings`) no Supabase.
   * Cria o registro padrão automaticamente se ainda não existir para este `auth.uid()`.
   */
  async fetchUserSettings(userId?: string): Promise<UserSettings | null> {
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
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
    const resolvedUserId = await resolveAuthenticatedUserId(userId);
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
   * Busca músicas da Biblioteca Global (is_public = true) visíveis para qualquer usuário logado
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
   * Consulta os registros da tabela de auditoria (`audit_logs`)
   */
  async fetchAuditLogs(limit = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(AUDIT_LOG_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<CloudAuditLogRow[]>();

    if (error) throw error;
    return (data || []).map(mapRowToAuditLog);
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
