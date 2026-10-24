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
      createdAt: playlistToEdit ? playlistToEdit.createdAt : Date.now(),
    };

    onSave(saved);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {playlistToEdit ? 'Editar Playlist' : 'Nova Playlist / Setlist'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Playlist *</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="Ex: Show Sábado no Bar, Ensaio Rock, Estudos..."
              placeholderTextColor="#636B84"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError('');
              }}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição / Anotações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Repertório acústico para barzinho, afinação padrão..."
              placeholderTextColor="#636B84"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>
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
    backgroundColor: '#181A24',
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
    borderBottomColor: '#282B3C',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#8A8A9E',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#A0A6BF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 11,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#09101D',
    fontSize: 15,
    fontWeight: '800',
  },
});
