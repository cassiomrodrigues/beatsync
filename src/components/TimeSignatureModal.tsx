import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TimeSignature } from '../types';

interface TimeSignatureModalProps {
  visible: boolean;
  current: TimeSignature;
  onClose: () => void;
  onSelect: (ts: TimeSignature) => void;
}

const PRESETS: { num: number; den: number; label: string; desc: string }[] = [
  { num: 2, den: 4, label: '2/4', desc: 'Binário (Samba, Marcha, Bossa)' },
  { num: 3, den: 4, label: '3/4', desc: 'Ternário (Valsa, Balada)' },
  { num: 4, den: 4, label: '4/4', desc: 'Quaternário Padrão (Rock, Pop, Funk)' },
  { num: 5, den: 4, label: '5/4', desc: 'Ímpar (Jazz contemporâneo, Take Five)' },
  { num: 6, den: 8, label: '6/8', desc: 'Composto binário (Slow Rock, Blues, Baladas)' },
  { num: 7, den: 8, label: '7/8', desc: 'Ímpar / Progressivo (Rush, Dream Theater)' },
  { num: 9, den: 8, label: '9/8', desc: 'Composto ternário' },
  { num: 12, den: 8, label: '12/8', desc: 'Composto quaternário (Blues shuffle, Soul)' },
];

export const TimeSignatureModal: React.FC<TimeSignatureModalProps> = ({
  visible,
  current,
  onClose,
  onSelect,
}) => {
  const [customNum, setCustomNum] = useState(current.numerator);
  const [customDen, setCustomDen] = useState(current.denominator);

  const handleApplyCustom = () => {
    onSelect({
      numerator: customNum,
      denominator: customDen,
      label: `${customNum}/${customDen}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Fórmula de Compasso</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Compassos Comuns</Text>
            <View style={styles.presetsGrid}>
              {PRESETS.map((p) => {
                const isSelected =
                  current.numerator === p.num && current.denominator === p.den;
                return (
                  <TouchableOpacity
                    key={p.label}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect({
                        numerator: p.num,
                        denominator: p.den,
                        label: p.label,
                      });
                      onClose();
                    }}
                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  >
                    <Text
                      style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}
                    >
                      {p.label}
                    </Text>
                    <Text style={styles.presetDesc}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Personalizado</Text>
            <View style={styles.customBox}>
              <View style={styles.selectorRow}>
                {/* Numerator */}
                <View style={styles.selectorCol}>
                  <Text style={styles.selectorColLabel}>Tempos (Numerador)</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => setCustomNum(Math.max(1, customNum - 1))}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{customNum}</Text>
                    <TouchableOpacity
                      onPress={() => setCustomNum(Math.min(16, customNum + 1))}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.divisionSlash}>/</Text>

                {/* Denominator */}
                <View style={styles.selectorCol}>
                  <Text style={styles.selectorColLabel}>Unidade (Denominador)</Text>
                  <View style={styles.denRow}>
                    {[2, 4, 8, 16].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setCustomDen(d)}
                        style={[
                          styles.denOption,
                          customDen === d && styles.denOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.denOptionText,
                            customDen === d && styles.denOptionTextSelected,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleApplyCustom}
                style={styles.applyBtn}
              >
                <Text style={styles.applyBtnText}>
                  Aplicar {customNum}/{customDen}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
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
  scrollView: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  presetsGrid: {
    gap: 8,
  },
  presetCard: {
    backgroundColor: '#202436',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F344D',
  },
  presetCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#153145',
  },
  presetLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    width: 60,
  },
  presetLabelSelected: {
    color: '#00E5FF',
  },
  presetDesc: {
    color: '#A0A6BF',
    fontSize: 13,
    flex: 1,
  },
  customBox: {
    backgroundColor: '#202436',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2F344D',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  selectorCol: {
    alignItems: 'center',
  },
  selectorColLabel: {
    color: '#8A8A9E',
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
  },
  divisionSlash: {
    color: '#5C6382',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 14,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161824',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D4566',
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepperBtnText: {
    color: '#00E5FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepperValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  denRow: {
    flexDirection: 'row',
    gap: 6,
  },
  denOption: {
    backgroundColor: '#161824',
    borderWidth: 1,
    borderColor: '#3D4566',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  denOptionSelected: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  denOptionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  denOptionTextSelected: {
    color: '#0D1117',
  },
  applyBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#0A101D',
    fontSize: 14,
    fontWeight: '800',
  },
});
