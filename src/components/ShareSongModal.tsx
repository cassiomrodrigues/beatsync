import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Song } from '../types';
import { CloudLibraryService, SongShareRow } from '../supabase/cloudLibrary';
import { AuthService } from '../supabase/supabaseClient';

interface ShareSongModalProps {
  visible: boolean;
  song: Song | null;
  onClose: () => void;
}

export const ShareSongModal: React.FC<ShareSongModalProps> = ({
  visible,
  song,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shares, setShares] = useState<SongShareRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadShares = async () => {
    if (!song) return;
    try {
      const list = await CloudLibraryService.getSharesForSong(song.id);
      setShares(list);
    } catch {
      // Ignore if not synced yet
    }
  };

  useEffect(() => {
    if (visible && song) {
      setEmail('');
      setCanEdit(false);
      setStatusMessage(null);
      loadShares();
    }
  }, [visible, song]);

  const handleShare = async () => {
    if (!song) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMessage({ text: 'Por favor, insira um e-mail válido.', isError: true });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('Você precisa fazer login no BeatSync para compartilhar músicas.');
      }

      // First ensure song is synced to Supabase
      const uploaded = await CloudLibraryService.uploadSongToCloud(song, Boolean(song.isPublic));
      await CloudLibraryService.shareSongWithEmail(uploaded.id, cleanEmail, canEdit);

      setStatusMessage({ text: `Música compartilhada com ${cleanEmail}!`, isError: false });
      setEmail('');
      await loadShares();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao compartilhar música.', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (shareId: string, shareEmail: string) => {
    const doRevoke = async () => {
      try {
        await CloudLibraryService.revokeShare(shareId);
        loadShares();
      } catch (err: any) {
        alert(`Erro ao remover compartilhamento: ${err.message}`);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja revogar o acesso de ${shareEmail}?`)) {
        doRevoke();
      }
    } else {
      Alert.alert('Revogar Compartilhamento', `Deseja revogar o acesso de ${shareEmail}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revogar', style: 'destructive', onPress: doRevoke },
      ]);
    }
  };

  if (!song) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🔗 Compartilhar Música</Text>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title} <Text style={styles.artistName}>({song.artist})</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Text style={styles.instruction}>
            Compartilhe esta faixa com colegas de banda ou equipe de louvor:
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="E-mail do músico (ex: batera@beatsync.com)"
              placeholderTextColor="#687394"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Edit permission toggle */}
          <TouchableOpacity
            style={styles.permRow}
            activeOpacity={0.8}
            onPress={() => setCanEdit(!canEdit)}
          >
            <View style={[styles.checkbox, canEdit && styles.checkboxActive]}>
              <Text style={styles.checkMark}>{canEdit ? '✓' : ''}</Text>
            </View>
            <Text style={styles.permText}>Permitir que este usuário edite o BPM e notas</Text>
          </TouchableOpacity>

          {/* Action button */}
          <TouchableOpacity
            style={[styles.shareBtn, isLoading && styles.btnDisabled]}
            onPress={handleShare}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0E1017" />
            ) : (
              <Text style={styles.shareBtnText}>Enviar Compartilhamento</Text>
            )}
          </TouchableOpacity>

          {/* Status feedback */}
          {statusMessage && (
            <View
              style={[
                styles.statusBox,
                statusMessage.isError ? styles.statusError : styles.statusSuccess,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  statusMessage.isError ? styles.statusTextError : styles.statusTextSuccess,
                ]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Existing shares */}
          <View style={styles.sharesListSection}>
            <Text style={styles.sharesListTitle}>Usuários com acesso:</Text>
            {shares.length === 0 ? (
              <Text style={styles.emptyShares}>Nenhum compartilhamento ativo no momento.</Text>
            ) : (
              <FlatList
                data={shares}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 130 }}
                renderItem={({ item }) => (
                  <View style={styles.shareItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareItemEmail}>{item.shared_with_email}</Text>
                      <Text style={styles.shareItemPerm}>
                        {item.can_edit ? 'Pode editar' : 'Apenas visualização'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevoke(item.id, item.shared_with_email)}
                      style={styles.revokeBtn}
                    >
                      <Text style={styles.revokeBtnText}>Revogar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#161926',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262D42',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '800',
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  artistName: {
    color: '#8A96BA',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#8A96BA',
    fontSize: 18,
  },
  instruction: {
    color: '#8A96BA',
    fontSize: 12,
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0F121C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2B334B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4A5578',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  checkMark: {
    color: '#0E1017',
    fontSize: 12,
    fontWeight: '900',
  },
  permText: {
    color: '#B2BBD4',
    fontSize: 12,
  },
  shareBtn: {
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    color: '#0E1017',
    fontWeight: '800',
    fontSize: 13,
  },
  statusBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: '#062E1E',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  statusError: {
    backgroundColor: '#381215',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#69F0AE',
  },
  statusTextError: {
    color: '#FF8A80',
  },
  sharesListSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#262D42',
  },
  sharesListTitle: {
    color: '#7682A4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyShares: {
    color: '#535C77',
    fontSize: 11,
    fontStyle: 'italic',
  },
  shareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2133',
  },
  shareItemEmail: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  shareItemPerm: {
    color: '#7682A4',
    fontSize: 10,
  },
  revokeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2A171B',
  },
  revokeBtnText: {
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '700',
  },
});
