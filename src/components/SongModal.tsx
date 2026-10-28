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
import { useTheme } from '../theme/ThemeContext';

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
  const { currentTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [soundType, setSoundType] = useState<SoundType>('woodblock');
  const [isPublic, setIsPublic] = useState(false);
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
      setIsPublic(Boolean(songToEdit.isPublic));
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
      setIsPublic(false);
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
      isPublic,
      createdAt: songToEdit ? songToEdit.createdAt : Date.now(),
      // Preserve cloud linkage so edits update the same Supabase row instead of duplicating it
      cloudId: songToEdit?.cloudId,
      userId: songToEdit?.userId,
    };

    onSave(savedSong);
    onClose();
  };

  const selectedFill = currentTheme.isOled ? '#000000' : currentTheme.navActive;
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
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
            <Text style={[styles.title, { color: currentTheme.text }]}>
              {songToEdit ? 'Editar Música' : 'Nova Música na Biblioteca'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.closeBtn, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Song Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Nome da Música *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.cardElevated,
                    borderColor: errors.title ? currentTheme.danger : currentTheme.border,
                    color: currentTheme.text,
                  },
                ]}
                placeholder="Ex: Billie Jean, Take Five..."
                placeholderTextColor={currentTheme.textMuted}
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {errors.title && (
                <Text style={[styles.errorText, { color: currentTheme.danger }]}>{errors.title}</Text>
              )}
            </View>

            {/* Artist */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Artista / Banda *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.cardElevated,
                    borderColor: errors.artist ? currentTheme.danger : currentTheme.border,
                    color: currentTheme.text,
                  },
                ]}
                placeholder="Ex: Michael Jackson, Queen, Dave Brubeck..."
                placeholderTextColor={currentTheme.textMuted}
                value={artist}
                onChangeText={(val) => {
                  setArtist(val);
                  if (errors.artist) setErrors((prev) => ({ ...prev, artist: undefined }));
                }}
              />
              {errors.artist && (
                <Text style={[styles.errorText, { color: currentTheme.danger }]}>{errors.artist}</Text>
              )}
            </View>

            {/* BPM & Compasso Row */}
            <View style={styles.row}>
              {/* BPM */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: currentTheme.textSecondary }]}>BPM (Andamento)</Text>
                <View
                  style={[
                    styles.bpmRow,
                    { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setBpm(Math.max(20, bpm - 1))}
                    style={styles.bpmBtn}
                  >
                    <Text style={[styles.bpmBtnText, { color: currentTheme.accent }]}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.bpmInput, { color: currentTheme.text }]}
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
                    <Text style={[styles.bpmBtnText, { color: currentTheme.accent }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compasso */}
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Compasso</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: currentTheme.cardElevated,
                      borderColor: currentTheme.border,
                      color: currentTheme.text,
                    },
                  ]}
                  placeholder="4/4"
                  placeholderTextColor={currentTheme.textMuted}
                  value={timeSignature}
                  onChangeText={setTimeSignature}
                />
              </View>
            </View>

            {/* Quick Time Signature Presets */}
            <View style={styles.chipsScroll}>
              {COMMON_SIGNATURES.map((sig) => {
                const isSelected = timeSignature === sig;
                return (
                  <TouchableOpacity
                    key={sig}
                    onPress={() => setTimeSignature(sig)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? selectedFill : currentTheme.cardElevated,
                        borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? currentTheme.accent : currentTheme.textSecondary },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {sig}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subdivisão */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Subdivisão Rítmica</Text>
              <View style={styles.subdivisionRow}>
                {[
                  { value: 1, label: '1/4 (Semínima)' },
                  { value: 2, label: '1/8 (Colcheia)' },
                  { value: 3, label: '1/8T (Tercina)' },
                  { value: 4, label: '1/16 (Semicolcheia)' },
                ].map((item) => {
                  const isSelected = subdivision === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setSubdivision(item.value as Subdivision)}
                      style={[
                        styles.subOption,
                        {
                          backgroundColor: isSelected ? selectedFill : currentTheme.cardElevated,
                          borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subOptionText,
                          { color: isSelected ? currentTheme.accent : currentTheme.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tonalidade & Duração */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Tom (Tonalidade)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: currentTheme.cardElevated,
                      borderColor: currentTheme.border,
                      color: currentTheme.text,
                    },
                  ]}
                  placeholder="Ex: Am, C, G#m..."
                  placeholderTextColor={currentTheme.textMuted}
                  value={key}
                  onChangeText={setKey}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Duração Estimada</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: currentTheme.cardElevated,
                      borderColor: currentTheme.border,
                      color: currentTheme.text,
                    },
                  ]}
                  placeholder="Ex: 03:45"
                  placeholderTextColor={currentTheme.textMuted}
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

            {/* Common keys quick row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {COMMON_KEYS.map((k) => {
                  const isSelected = key === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setKey(k)}
                      style={[
                        styles.smallChip,
                        {
                          backgroundColor: isSelected ? selectedFill : currentTheme.cardElevated,
                          borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.smallChipText,
                          { color: isSelected ? currentTheme.accent : currentTheme.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Som do Metrônomo para esta música */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Timbre do Metrônomo</Text>
              <View style={styles.soundRow}>
                {[
                  { id: 'woodblock', label: 'Madeira' },
                  { id: 'beep', label: 'Beep' },
                  { id: 'rimshot', label: 'Rimshot' },
                  { id: 'mechanical', label: 'Mecânico' },
                ].map((s) => {
                  const isSelected = soundType === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSoundType(s.id as SoundType)}
                      style={[
                        styles.soundOption,
                        {
                          backgroundColor: isSelected ? selectedFill : currentTheme.cardElevated,
                          borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.soundOptionText,
                          { color: isSelected ? currentTheme.accent : currentTheme.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notas / Observações de Palco */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>
                Observações de Palco / Arranjo
              </Text>
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
                placeholder="Ex: Entrada após 2 compassos de bateria; Solo no tom de Mi menor..."
                placeholderTextColor={currentTheme.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Visibilidade: Particular vs Biblioteca Global */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.textSecondary }]}>
                Visibilidade & Compartilhamento
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsPublic(!isPublic)}
                style={[
                  styles.visibilityCard,
                  {
                    backgroundColor: isPublic ? selectedFill : currentTheme.cardElevated,
                    borderColor: isPublic ? currentTheme.accent : currentTheme.border,
                  },
                ]}
              >
                <Text style={styles.visibilityIcon}>{isPublic ? '🌐' : '🔒'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.visibilityTitle,
                      { color: isPublic ? currentTheme.accent : currentTheme.text },
                    ]}
                  >
                    {isPublic ? 'Publicada na Biblioteca Global' : 'Música Particular (Apenas Eu)'}
                  </Text>
                  <Text style={[styles.visibilityDesc, { color: currentTheme.textSecondary }]}>
                    {isPublic
                      ? 'Visível para a comunidade BeatSync. Outros músicos podem pesquisar e importar.'
                      : 'Privada na sua biblioteca. Você também pode compartilhá-la diretamente com usuários específicos.'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleCircle,
                    { borderColor: isPublic ? currentTheme.accent : currentTheme.border },
                    isPublic && { backgroundColor: currentTheme.accent },
                  ]}
                >
                  <Text style={[styles.toggleCheck, { color: btnTextColor }]}>
                    {isPublic ? '✓' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: currentTheme.accent }]}
            >
              <Text style={[styles.saveBtnText, { color: btnTextColor }]}>
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
    borderWidth: 1,
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
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
  row: {
    flexDirection: 'row',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  bpmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bpmBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bpmInput: {
    flex: 1,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  smallChipText: {
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
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  subOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  soundRow: {
    flexDirection: 'row',
    gap: 6,
  },
  soundOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  soundOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  visibilityIcon: {
    fontSize: 24,
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  visibilityDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  toggleCheck: {
    fontSize: 14,
    fontWeight: '900',
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2235',
    borderWidth: 1,
    borderColor: '#2F3652',
    borderRadius: 12,
    padding: 12,
  },
  visibilityCardPublic: {
    borderColor: '#00E5FF',
    backgroundColor: '#0D2738',
  },
  visibilityIcon: {
    fontSize: 24,
  },
  visibilityTitle: {
    color: '#E0E6F8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  visibilityTitlePublic: {
    color: '#00E5FF',
  },
  visibilityDesc: {
    color: '#8A94B2',
    fontSize: 11,
    lineHeight: 15,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A5578',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  toggleCircleActive: {
    borderColor: '#00E5FF',
    backgroundColor: '#00E5FF',
  },
  toggleCheck: {
    color: '#0E1017',
    fontSize: 14,
    fontWeight: '900',
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
