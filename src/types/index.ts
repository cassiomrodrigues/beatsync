export type SoundType = 'beep' | 'woodblock' | 'rimshot' | 'mechanical';

export type BeatState = 'accent' | 'normal' | 'ghost' | 'mute';

export interface TimeSignature {
  numerator: number;   // e.g. 4
  denominator: number; // e.g. 4
  label: string;       // e.g. "4/4"
}

export type Subdivision = 1 | 2 | 3 | 4; // 1 = quarter, 2 = 8th, 3 = triplet, 4 = 16th

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  timeSignature: string;       // e.g. "4/4", "3/4", "6/8"
  subdivision?: Subdivision;   // default 1
  key?: string;                // e.g. "Am", "C", "G#"
  notes?: string;              // stage notes, intro, outro, etc.
  duration?: string;           // e.g. "03:45"
  soundType?: SoundType;
  accentPattern?: BeatState[];
  isPublic?: boolean;          // Public in Global Library
  cloudId?: string;            // Supabase row UUID (songs.id) once synced to the cloud
  userId?: string;             // Owner user ID in Supabase
  isShared?: boolean;          // If shared with current user
  sharedBy?: string;           // Email or ID of sharer
  createdAt: number;
}

export interface PlaylistSongItem {
  songId: string;
  customBpm?: number;
  customNotes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[]; // ordered array of Song ids
  cloudId?: string;  // Supabase row UUID (playlists.id) once synced to the cloud
  userId?: string;   // Owner user ID in Supabase (auth.uid())
  isPublic?: boolean;
  createdAt: number;
}

export interface UserSettings {
  userId: string;
  themeId: string;
  defaultSoundType: SoundType;
  flashEnabled: boolean;
  hapticsEnabled: boolean;
  updatedAt?: string;
}

export interface MetronomeState {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  soundType: SoundType;
  volume: number;          // 0 to 1
  isMuted: boolean;
  flashEnabled: boolean;
  hapticsEnabled: boolean;
  countInBars: number;     // 0 = none, 1 = 1 bar, 2 = 2 bars
  accentPattern: BeatState[]; // one per beat in measure
}
