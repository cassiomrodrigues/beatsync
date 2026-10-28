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
import { useTheme } from '../theme/ThemeContext';

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
  const { currentTheme } = useTheme();
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

  const selectedFill = currentTheme.isOled ? '#000000' : currentTheme.navActive;
  const btnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
            <Text style={[styles.title, { color: currentTheme.text }]}>Fórmula de Compasso</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.closeBtn, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: currentTheme.accent }]}>Compassos Comuns</Text>
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
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: isSelected ? selectedFill : currentTheme.cardElevated,
                        borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetLabel,
                        { color: isSelected ? currentTheme.accent : currentTheme.text },
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text style={[styles.presetDesc, { color: currentTheme.textSecondary }]}>
                      {p.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: currentTheme.accent, marginTop: 20 }]}>
              Personalizado
            </Text>
            <View
              style={[
                styles.customBox,
                { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
              ]}
            >
              <View style={styles.selectorRow}>
                {/* Numerator */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorColLabel, { color: currentTheme.textSecondary }]}>
                    Tempos (Numerador)
                  </Text>
                  <View
                    style={[
                      styles.stepper,
                      { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setCustomNum(Math.max(1, customNum - 1))}
                      style={styles.stepperBtn}
                    >
                      <Text style={[styles.stepperBtnText, { color: currentTheme.accent }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepperValue, { color: currentTheme.text }]}>{customNum}</Text>
                    <TouchableOpacity
                      onPress={() => setCustomNum(Math.min(16, customNum + 1))}
                      style={styles.stepperBtn}
                    >
                      <Text style={[styles.stepperBtnText, { color: currentTheme.accent }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.divisionSlash, { color: currentTheme.textMuted }]}>/</Text>

                {/* Denominator */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorColLabel, { color: currentTheme.textSecondary }]}>
                    Unidade (Denominador)
                  </Text>
                  <View style={styles.denRow}>
                    {[2, 4, 8, 16].map((d) => {
                      const isDenSelected = customDen === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setCustomDen(d)}
                          style={[
                            styles.denOption,
                            {
                              backgroundColor: isDenSelected
                                ? currentTheme.accent
                                : currentTheme.card,
                              borderColor: isDenSelected
                                ? currentTheme.accent
                                : currentTheme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.denOptionText,
                              { color: isDenSelected ? btnTextColor : currentTheme.text },
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleApplyCustom}
                style={[styles.applyBtn, { backgroundColor: currentTheme.accent }]}
              >
                <Text style={[styles.applyBtnText, { color: btnTextColor }]}>
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
    borderWidth: 1,
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    marginBottom: 10,
  },
  sectionTitle: {
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
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: 18,
    fontWeight: '800',
    width: 60,
  },
  presetDesc: {
    fontSize: 13,
    flex: 1,
  },
  customBox: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
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
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
  },
  divisionSlash: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 14,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  denRow: {
    flexDirection: 'row',
    gap: 6,
  },
  denOption: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  denOptionText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  applyBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
