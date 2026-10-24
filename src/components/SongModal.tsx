import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Song, SoundType, Subdivision } from '../types';

interface SongModalProps {
  visible: boolean;
  songToEdit: Song | null;
  onClose: () => void;
  onSave: (song: Song) => void;
}

const COMMON_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '5/4', '7/8', '12/8'];
const COMMON_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Am', 'Em', 'Dm', 'Bm', 'F#m', 'C#m', 'G#m'];

export const SongModal: React.FC<SongModalProps> = ({
  visible,
  songToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [soundType, setSoundType] = useState<SoundType>('woodblock');
  const [errors, setErrors] = useState<{ title?: string; artist?: string }>({});

  useEffect(() => {
    if (songToEdit) {
      setTitle(songToEdit.title);
      setArtist(songToEdit.artist);
      setBpm(songToEdit.bpm);
      setTimeSignature(songToEdit.timeSignature);
      setSubdivision(songToEdit.subdivision || 1);
      setKey(songToEdit.key || '');
      setNotes(songToEdit.notes || '');
      setDuration(songToEdit.duration || '');
      setSoundType(songToEdit.soundType || 'woodblock');
    } else {
      setTitle('');
      setArtist('');
      setBpm(120);
      setTimeSignature('4/4');
      setSubdivision(1);
      setKey('');
      setNotes('');
      setDuration('');
      setSoundType('woodblock');
    }
    setErrors({});
  }, [songToEdit, visible]);

  const handleSave = () => {
    const newErrors: { title?: string; artist?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Informe o nome da música.';
    }
    if (!artist.trim()) {
      newErrors.artist = 'Informe o nome do artista ou banda.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const savedSong: Song = {
      id: songToEdit ? songToEdit.id : `song-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      artist: artist.trim(),
      bpm: Number(bpm) || 120,
      timeSignature: timeSignature.trim() || '4/4',
      subdivision,
      key: key.trim() || undefined,
      notes: notes.trim() || undefined,
      duration: duration.trim() || undefined,
      soundType,
      createdAt: songToEdit ? songToEdit.createdAt : Date.now(),
    };

    onSave(savedSong);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {songToEdit ? 'Editar Música' : 'Nova Música na Biblioteca'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Song Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome da Música *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="Ex: Billie Jean, Take Five..."
                placeholderTextColor="#636B84"
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Artist */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Artista / Banda *</Text>
              <TextInput
                style={[styles.input, errors.artist && styles.inputError]}
                placeholder="Ex: Michael Jackson, Queen, Dave Brubeck..."
                placeholderTextColor="#636B84"
                value={artist}
                onChangeText={(val) => {
                  setArtist(val);
                  if (errors.artist) setErrors((prev) => ({ ...prev, artist: undefined }));
                }}
              />
              {errors.artist && <Text style={styles.errorText}>{errors.artist}</Text>}
            </View>

            {/* BPM & Compasso Row */}
            <View style={styles.row}>
              {/* BPM */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>BPM (Andamento)</Text>
                <View style={styles.bpmRow}>
                  <TouchableOpacity
                    onPress={() => setBpm(Math.max(20, bpm - 1))}
                    style={styles.bpmBtn}
                  >
                    <Text style={styles.bpmBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.bpmInput}
                    keyboardType="numeric"
                    value={String(bpm)}
                    onChangeText={(v) => {
                      const num = parseInt(v, 10);
                      if (!isNaN(num)) setBpm(Math.max(20, Math.min(320, num)));
                      else if (v === '') setBpm(0);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setBpm(Math.min(320, bpm + 1))}
                    style={styles.bpmBtn}
                  >
                    <Text style={styles.bpmBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compasso */}
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Compasso</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4/4"
                  placeholderTextColor="#636B84"
                  value={timeSignature}
                  onChangeText={setTimeSignature}
                />
              </View>
            </View>

            {/* Quick Time Signature Presets */}
            <View style={styles.chipsScroll}>
              {COMMON_SIGNATURES.map((sig) => (
                <TouchableOpacity
                  key={sig}
                  onPress={() => setTimeSignature(sig)}
                  style={[
                    styles.chip,
                    timeSignature === sig && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      timeSignature === sig && styles.chipTextSelected,
                    ]}
                  >
                    {sig}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subdivisão */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subdivisão Rítmica</Text>
              <View style={styles.subdivisionRow}>
                {[
                  { value: 1, label: '1/4 (Semínima)' },
                  { value: 2, label: '1/8 (Colcheia)' },
                  { value: 3, label: '1/8T (Tercina)' },
                  { value: 4, label: '1/16 (Semicolcheia)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setSubdivision(item.value as Subdivision)}
                    style={[
                      styles.subOption,
                      subdivision === item.value && styles.subOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subOptionText,
                        subdivision === item.value && styles.subOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tonalidade & Duração */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Tom (Tonalidade)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Am, C, G#m..."
                  placeholderTextColor="#636B84"
                  value={key}
                  onChangeText={setKey}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Duração Estimada</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 03:45"
                  placeholderTextColor="#636B84"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

            {/* Common keys quick row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {COMMON_KEYS.map((k) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setKey(k)}
                    style={[styles.smallChip, key === k && styles.chipSelected]}
                  >
                    <Text style={[styles.smallChipText, key === k && styles.chipTextSelected]}>
                      {k}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Som do Metrônomo para esta música */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timbre do Metrônomo</Text>
              <View style={styles.soundRow}>
                {[
                  { id: 'woodblock', label: 'Madeira' },
                  { id: 'beep', label: 'Beep' },
                  { id: 'rimshot', label: 'Rimshot' },
                  { id: 'mechanical', label: 'Mecânico' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSoundType(s.id as SoundType)}
                    style={[
                      styles.soundOption,
                      soundType === s.id && styles.soundOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.soundOptionText,
                        soundType === s.id && styles.soundOptionTextSelected,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notas / Observações de Palco */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observações de Palco / Arranjo</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Entrada após 2 compassos de bateria; Solo no tom de Mi menor..."
                placeholderTextColor="#636B84"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>
                {songToEdit ? 'Atualizar Música' : 'Salvar na Biblioteca'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '90%',
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
  formScroll: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
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
  row: {
    flexDirection: 'row',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 10,
  },
  bpmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bpmBtnText: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bpmInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chipsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#0D384D',
  },
  chipText: {
    color: '#A0A6BF',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#00E5FF',
  },
  smallChip: {
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  smallChipText: {
    color: '#A0A6BF',
    fontSize: 11,
    fontWeight: '600',
  },
  subdivisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  subOptionSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#0D384D',
  },
  subOptionText: {
    color: '#A0A6BF',
    fontSize: 12,
    fontWeight: '600',
  },
  subOptionTextSelected: {
    color: '#00E5FF',
  },
  soundRow: {
    flexDirection: 'row',
    gap: 6,
  },
  soundOption: {
    flex: 1,
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  soundOptionSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#0D384D',
  },
  soundOptionText: {
    color: '#A0A6BF',
    fontSize: 12,
    fontWeight: '600',
  },
  soundOptionTextSelected: {
    color: '#00E5FF',
  },
  saveBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#09101D',
    fontSize: 15,
    fontWeight: '800',
  },
});
