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
import { useTheme } from '../theme/ThemeContext';

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
  const { currentTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shares, setShares] = useState<SongShareRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadShares = async () => {
    if (!song) return;
    try {
      const targetId = song.cloudId || song.id;
      const list = await CloudLibraryService.getSharesForSong(targetId);
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

  const btnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.headerTitle, { color: currentTheme.accent }]}>🔗 Compartilhar Música</Text>
              <Text style={[styles.songTitle, { color: currentTheme.text }]} numberOfLines={1}>
                {song.title}{' '}
                <Text style={[styles.artistName, { color: currentTheme.textSecondary }]}>
                  ({song.artist})
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Text style={[styles.instruction, { color: currentTheme.textSecondary }]}>
            Compartilhe esta faixa com colegas de banda ou equipe de louvor:
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.cardElevated,
                  borderColor: currentTheme.border,
                  color: currentTheme.text,
                },
              ]}
              placeholder="E-mail do músico (ex: batera@beatsync.com)"
              placeholderTextColor={currentTheme.textMuted}
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
            <View
              style={[
                styles.checkbox,
                { borderColor: currentTheme.border },
                canEdit && {
                  backgroundColor: currentTheme.accent,
                  borderColor: currentTheme.accent,
                },
              ]}
            >
              <Text style={[styles.checkMark, { color: btnTextColor }]}>{canEdit ? '✓' : ''}</Text>
            </View>
            <Text style={[styles.permText, { color: currentTheme.textSecondary }]}>
              Permitir que este usuário edite o BPM e notas
            </Text>
          </TouchableOpacity>

          {/* Action button */}
          <TouchableOpacity
            style={[
              styles.shareBtn,
              { backgroundColor: currentTheme.accent },
              isLoading && styles.btnDisabled,
            ]}
            onPress={handleShare}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={btnTextColor} />
            ) : (
              <Text style={[styles.shareBtnText, { color: btnTextColor }]}>
                Enviar Compartilhamento
              </Text>
            )}
          </TouchableOpacity>

          {/* Status feedback */}
          {statusMessage && (
            <View
              style={[
                styles.statusBox,
                statusMessage.isError
                  ? {
                      backgroundColor: currentTheme.isDark ? '#381215' : '#FEE2E2',
                      borderColor: currentTheme.danger,
                    }
                  : {
                      backgroundColor: currentTheme.isDark ? '#062E1E' : '#DCFCE7',
                      borderColor: currentTheme.success,
                    },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: statusMessage.isError ? currentTheme.danger : currentTheme.success },
                ]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Existing shares */}
          <View style={[styles.sharesListSection, { borderTopColor: currentTheme.border }]}>
            <Text style={[styles.sharesListTitle, { color: currentTheme.textSecondary }]}>
              Usuários com acesso:
            </Text>
            {shares.length === 0 ? (
              <Text style={[styles.emptyShares, { color: currentTheme.textMuted }]}>
                Nenhum compartilhamento ativo no momento.
              </Text>
            ) : (
              <FlatList
                data={shares}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 130 }}
                renderItem={({ item }) => (
                  <View style={[styles.shareItem, { borderBottomColor: currentTheme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shareItemEmail, { color: currentTheme.text }]}>
                        {item.shared_with_email}
                      </Text>
                      <Text style={[styles.shareItemPerm, { color: currentTheme.textSecondary }]}>
                        {item.can_edit ? 'Pode editar' : 'Apenas visualização'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevoke(item.id, item.shared_with_email)}
                      style={[
                        styles.revokeBtn,
                        {
                          backgroundColor: currentTheme.isDark ? '#2A171B' : '#FEE2E2',
                          borderColor: currentTheme.danger,
                        },
                      ]}
                    >
                      <Text style={[styles.revokeBtnText, { color: currentTheme.danger }]}>Revogar</Text>
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  artistName: {},
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
  },
  instruction: {
    fontSize: 12,
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '900',
  },
  permText: {
    fontSize: 12,
  },
  shareBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  statusBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sharesListSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sharesListTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyShares: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  shareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  shareItemEmail: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareItemPerm: {
    fontSize: 10,
  },
  revokeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  revokeBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
