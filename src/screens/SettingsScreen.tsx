import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { StorageService } from '../storage/storage';

interface SettingsScreenProps {
  onDataReset: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onDataReset }) => {
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      const data = await StorageService.exportBackup();
      setBackupText(data);
      setBackupStatus('✅ Backup gerado com sucesso! Copie o texto abaixo.');
    } catch (err: any) {
      setBackupStatus(`❌ Erro ao exportar: ${err.message}`);
    }
  };

  const handleImportBackup = async () => {
    if (!importText.trim()) {
      alert('Cole o texto JSON do backup no campo de texto.');
      return;
    }

    const res = await StorageService.importBackup(importText.trim());
    if (res.success) {
      alert('Backup importado com sucesso!');
      setImportText('');
      onDataReset();
    } else {
      alert(`Falha ao importar: ${res.message}`);
    }
  };

  const handleResetDefaults = async () => {
    const runReset = async () => {
      await StorageService.resetToDefaults();
      onDataReset();
      alert('Biblioteca restaurada para o repertório inicial.');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja restaurar as músicas e playlists padrão de exemplo?')) {
        runReset();
      }
    } else {
      Alert.alert(
        'Restaurar Padrões',
        'Deseja restaurar as músicas e playlists padrão de exemplo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restaurar', onPress: runReset },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Configurações & Backup</Text>
        <Text style={styles.subtitle}>Gerencie seus dados e preferências do Metrônomo Pro</Text>
      </View>

      {/* Guide / How to use */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>💡 GUIA RÁPIDO DO MÚSICO</Text>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>1.</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipHighlight}>Biblioteca de Músicas:</Text> cadastre suas canções com BPM, fórmula de compasso (ex: 4/4, 6/8, 5/4), tom e observações de arranjo.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>2.</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipHighlight}>Playlists / Setlists:</Text> crie o roteiro do seu show ou rotina de estudo e adicione as músicas na ordem em que serão tocadas.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>3.</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipHighlight}>Modo Show (Ao Vivo):</Text> use na estante de partitura ou suporte de celular no palco. Texto grande, troca de música com 1 toque e metrônomo instantâneo!
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>4.</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipHighlight}>Tap Tempo:</Text> dê 3 ou mais toques no botão TAP TEMPO para identificar o andamento de qualquer música que estiver ouvindo.
          </Text>
        </View>
      </View>

      {/* Export / Backup Section */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>📦 BACKUP & COMPARTILHAMENTO (JSON)</Text>
        <Text style={styles.cardDesc}>
          Exporte todo o seu repertório e playlists para salvar com segurança ou compartilhar com os outros integrantes da sua banda.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleExportBackup}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>Exportar Backup Agora</Text>
        </TouchableOpacity>

        {backupStatus && <Text style={styles.statusText}>{backupStatus}</Text>}

        {backupText.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={styles.jsonBox}
              multiline
              editable={false}
              value={backupText}
              selectTextOnFocus
            />
          </View>
        )}
      </View>

      {/* Import Section */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>📥 RESTAURAR / IMPORTAR BACKUP</Text>
        <Text style={styles.cardDesc}>
          Cole abaixo o texto JSON exportado de outro aparelho para carregar a biblioteca de músicas e playlists.
        </Text>

        <TextInput
          style={[styles.jsonBox, { height: 90 }]}
          multiline
          placeholder="Cole o código JSON do backup aqui..."
          placeholderTextColor="#687394"
          value={importText}
          onChangeText={setImportText}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleImportBackup}
          style={[styles.actionBtn, styles.importBtn]}
        >
          <Text style={styles.actionBtnText}>Importar e Restaurar</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Section */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>⚙️ RESTAURAR DADOS DE EXEMPLO</Text>
        <Text style={styles.cardDesc}>
          Restaura a biblioteca inicial contendo clássicos do Rock, Bossa Nova, Pop e Jazz em diferentes compassos (4/4, 5/4, 6/8, 7/4, 12/8).
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleResetDefaults}
          style={styles.resetBtn}
        >
          <Text style={styles.resetBtnText}>Restaurar Músicas Iniciais</Text>
        </TouchableOpacity>
      </View>

      {/* App Version Info */}
      <View style={styles.footerBox}>
        <Text style={styles.footerTitle}>Metrônomo Pro • iOS & Android</Text>
        <Text style={styles.footerSub}>Desenvolvido com precisão de estúdio e áudio jitter-free</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1017',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8A92B2',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#161924',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C40',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardDesc: {
    color: '#9EABC7',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  tipBullet: {
    color: '#00E5FF',
    fontWeight: '800',
    width: 20,
    fontSize: 13,
  },
  tipText: {
    color: '#BAC4DE',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  tipHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  importBtn: {
    marginTop: 10,
    backgroundColor: '#00E676',
  },
  actionBtnText: {
    color: '#09101D',
    fontSize: 14,
    fontWeight: '800',
  },
  statusText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  jsonBox: {
    backgroundColor: '#10121C',
    borderWidth: 1,
    borderColor: '#282F48',
    borderRadius: 10,
    color: '#A0B0D0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    padding: 10,
    height: 120,
    textAlignVertical: 'top',
  },
  resetBtn: {
    backgroundColor: '#202538',
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
  footerBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  footerTitle: {
    color: '#657194',
    fontSize: 13,
    fontWeight: '700',
  },
  footerSub: {
    color: '#4B5470',
    fontSize: 11,
    marginTop: 2,
  },
});
