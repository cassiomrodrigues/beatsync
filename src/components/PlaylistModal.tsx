import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Playlist } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface PlaylistModalProps {
  visible: boolean;
  playlistToEdit: Playlist | null;
  onClose: () => void;
  onSave: (playlist: Playlist) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  visible,
  playlistToEdit,
  onClose,
  onSave,
}) => {
  const { currentTheme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (playlistToEdit) {
      setName(playlistToEdit.name);
      setDescription(playlistToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [playlistToEdit, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Por favor, informe o nome da playlist / setlist.');
      return;
    }

    const saved: Playlist = {
      id: playlistToEdit ? playlistToEdit.id : `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      songIds: playlistToEdit ? playlistToEdit.songIds : [],
      cloudId: playlistToEdit?.cloudId,
      userId: playlistToEdit?.userId,
      isPublic: playlistToEdit?.isPublic,
      createdAt: playlistToEdit ? playlistToEdit.createdAt : Date.now(),
    };

    onSave(saved);
    onClose();
  };

  const btnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
            <Text style={[styles.title, { color: currentTheme.text }]}>
              {playlistToEdit ? 'Editar Playlist' : 'Nova Playlist / Setlist'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.closeBtn, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Nome da Playlist *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.cardElevated,
                  borderColor: error ? currentTheme.danger : currentTheme.border,
                  color: currentTheme.text,
                },
              ]}
              placeholder="Ex: Show Sábado no Bar, Ensaio Rock, Estudos..."
              placeholderTextColor={currentTheme.textMuted}
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError('');
              }}
            />
            {!!error && <Text style={[styles.errorText, { color: currentTheme.danger }]}>{error}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Descrição / Anotações</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: currentTheme.cardElevated,
                  borderColor: currentTheme.border,
                  color: currentTheme.text,
                },
              ]}
              placeholder="Ex: Repertório acústico para barzinho, afinação padrão..."
              placeholderTextColor={currentTheme.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: currentTheme.accent }]}
          >
            <Text style={[styles.saveBtnText, { color: btnTextColor }]}>
              {playlistToEdit ? 'Atualizar Playlist' : 'Criar Playlist'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
