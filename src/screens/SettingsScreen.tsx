import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StorageService } from '../storage/storage';
import { useTheme, ThemeId } from '../theme/ThemeContext';
import { AuthService } from '../supabase/supabaseClient';
import { CloudLibraryService } from '../supabase/cloudLibrary';
import { AuthModal } from '../components/AuthModal';
import { User } from '@supabase/supabase-js';

interface SettingsScreenProps {
  onDataReset: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onDataReset,
  onLogout,
  onOpenAdmin,
  isAdmin = false,
}) => {
  const { currentTheme, setThemeId, themes } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  useEffect(() => {
    AuthService.getCurrentUser().then(setCurrentUser);
    const sub = AuthService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    return () => {
      sub?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      setCurrentUser(null);
      alert('Sessão encerrada com sucesso.');
    } catch (e: any) {
      alert(`Erro ao sair: ${e.message}`);
    }
  };

  const handleSyncToCloud = async () => {
    if (!currentUser) {
      setIsAuthModalVisible(true);
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const localSongs = await StorageService.getSongs();
      let count = 0;
      for (const song of localSongs) {
        await CloudLibraryService.uploadSongToCloud(song, Boolean(song.isPublic));
        count++;
      }
      setSyncStatus(`✅ ${count} músicas sincronizadas com sua conta no Supabase!`);
    } catch (e: any) {
      setSyncStatus(`❌ Falha na sincronização: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

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
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.text }]}>Configurações & Nuvem</Text>
        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          BeatSync PWA • Temas OLED, Supabase & Cloudflare
        </Text>
      </View>

      {/* Admin Panel Quick Access (if logged in as admin) */}
      {isAdmin && onOpenAdmin && (
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.accent, borderWidth: 1.5 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.cardHeader, { color: currentTheme.accent, marginBottom: 0 }]}>👑 PAINEL DE CONTROLE ADMIN</Text>
            <View style={{ backgroundColor: currentTheme.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>ACESSO MASTER</Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>
            Gerencie os convites e aprove novos e-mails de músicos autorizados a acessar o BeatSync.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenAdmin}
            style={[styles.primaryBtn, { backgroundColor: currentTheme.accent }]}
          >
            <Text style={styles.primaryBtnText}>Abrir Gestão de Convites & Usuários</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account & Cloud Sync Section */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>🔐 CONTA & ACESSO SUPABASE</Text>

        {currentUser ? (
          <View>
            <View style={styles.userInfoRow}>
              <View style={[styles.userAvatar, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.userAvatarText}>
                  {(currentUser.email || 'M').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userEmail, { color: currentTheme.text }]}>{currentUser.email}</Text>
                <Text style={[styles.userBadge, { color: currentTheme.success }]}>
                  ● Conectado ao Supabase (Cloud Auth)
                </Text>
              </View>
            </View>

            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                onPress={handleSyncToCloud}
                disabled={isSyncing}
                style={[styles.syncBtn, { backgroundColor: currentTheme.accent }]}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.syncBtnText}>☁️ Sincronizar Músicas na Nuvem</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleSignOut();
                  if (onLogout) onLogout();
                }}
                style={[styles.signOutBtn, { borderColor: currentTheme.danger }]}
              >
                <Text style={[styles.signOutBtnText, { color: currentTheme.danger }]}>Sair</Text>
              </TouchableOpacity>
            </View>

            {syncStatus && (
              <Text
                style={[
                  styles.syncStatusText,
                  syncStatus.startsWith('✅') ? { color: currentTheme.success } : { color: currentTheme.danger },
                ]}
              >
                {syncStatus}
              </Text>
            )}

            {onLogout && (
              <TouchableOpacity
                onPress={onLogout}
                style={[styles.dangerBtn, { borderColor: currentTheme.danger, marginTop: 12 }]}
              >
                <Text style={[styles.dangerBtnText, { color: currentTheme.danger }]}>
                  🔒 Bloquear App & Trocar de Usuário
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            <Text style={[styles.authPromoText, { color: currentTheme.textSecondary }]}>
              Crie uma conta gratuita para sincronizar suas setlists, publicar faixas na Biblioteca Global e compartilhar músicas com sua banda.
            </Text>
            <TouchableOpacity
              onPress={() => setIsAuthModalVisible(true)}
              style={[styles.loginBtn, { backgroundColor: currentTheme.accent }]}
            >
              <Text style={styles.loginBtnText}>Entrar ou Criar Conta com E-mail</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selectable Themes Section */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>
          🎨 TEMAS & FILOSOFIA DE DESIGN
        </Text>
        <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>
          Selecione o tema ideal para a iluminação do seu ambiente de palco, ensaio ou culto:
        </Text>

        <View style={styles.themeGrid}>
          {themes.map((t) => {
            const isSelected = currentTheme.id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setThemeId(t.id as ThemeId)}
                activeOpacity={0.8}
                style={[
                  styles.themeCard,
                  { backgroundColor: t.isOled ? '#000000' : '#141824', borderColor: isSelected ? t.accent : currentTheme.border },
                  isSelected && { borderWidth: 2 },
                ]}
              >
                <View style={styles.themeCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.themeColorDot,
                        { backgroundColor: t.accent },
                      ]}
                    />
                    <Text style={[styles.themeName, { color: t.text }]}>{t.name}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.activePill, { backgroundColor: t.accent }]}>
                      <Text style={styles.activePillText}>ATIVO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.themeTagline, { color: t.textSecondary }]}>
                  {t.tagline}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cloudflare Pages & Deployment Status */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>
          ⚡ PUBLICAÇÃO & HOSPEDAGEM
        </Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Hospedagem PWA:</Text>
          <Text style={[styles.infoValue, { color: currentTheme.accent }]}>Cloudflare Pages</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Subdomínio Ativo:</Text>
          <Text style={[styles.infoValue, { color: currentTheme.text }]}>beatsync-75q.pages.dev</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Banco & Autenticação:</Text>
          <Text style={[styles.infoValue, { color: currentTheme.success }]}>Supabase PostgreSQL (RLS Ativo)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Prevenção de Bloqueio:</Text>
          <Text style={[styles.infoValue, { color: currentTheme.text }]}>Screen Wake Lock Ativo no Player</Text>
        </View>
      </View>

      {/* Guide / How to use */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>💡 GUIA RÁPIDO DO MÚSICO</Text>
        <View style={styles.tipRow}>
          <Text style={[styles.tipBullet, { color: currentTheme.accent }]}>1.</Text>
          <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
            <Text style={[styles.tipHighlight, { color: currentTheme.text }]}>Biblioteca Particular & Global:</Text> cadastre suas canções com BPM, fórmula de compasso e publique na biblioteca global ou compartilhe por e-mail.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={[styles.tipBullet, { color: currentTheme.accent }]}>2.</Text>
          <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
            <Text style={[styles.tipHighlight, { color: currentTheme.text }]}>Playlists / Setlists:</Text> monte o roteiro do show e ordene as músicas.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={[styles.tipBullet, { color: currentTheme.accent }]}>3.</Text>
          <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
            <Text style={[styles.tipHighlight, { color: currentTheme.text }]}>Modo Show (Ao Vivo):</Text> texto gigante, troca de música com 1 toque e tela sem desligar (Wake Lock).
          </Text>
        </View>
      </View>

      {/* Backup JSON Card */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>📦 BACKUP MANUAL (OFFLINE)</Text>
        <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>
          Exporte um arquivo de segurança do seu repertório para guardar no computador ou transferir para outro celular:
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleExportBackup}
          style={[styles.primaryBtn, { backgroundColor: currentTheme.accent }]}
        >
          <Text style={styles.primaryBtnText}>Gerar Backup JSON</Text>
        </TouchableOpacity>

        {backupStatus && (
          <Text style={[styles.statusText, { color: currentTheme.text }]}>{backupStatus}</Text>
        )}

        {backupText.length > 0 && (
          <TextInput
            style={[styles.jsonBox, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border, color: currentTheme.text }]}
            multiline
            editable={false}
            value={backupText}
            selectTextOnFocus
          />
        )}

        <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />

        <Text style={[styles.sectionSubtitle, { color: currentTheme.text }]}>Restaurar de um Backup JSON:</Text>
        <TextInput
          style={[styles.inputJson, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border, color: currentTheme.text }]}
          placeholder="Cole aqui o texto JSON do backup..."
          placeholderTextColor={currentTheme.textMuted}
          multiline
          numberOfLines={3}
          value={importText}
          onChangeText={setImportText}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleImportBackup}
          style={[styles.secondaryBtn, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}
        >
          <Text style={[styles.secondaryBtnText, { color: currentTheme.text }]}>Importar Backup</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Defaults */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.danger }]}>⚠️ RESTAURAR EXEMPLOS ORIGINAIS</Text>
        <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>
          Restaura a biblioteca inicial de demonstração (Take Five, Billie Jean, etc.). Suas edições atuais serão substituídas.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleResetDefaults}
          style={[styles.dangerBtn, { borderColor: currentTheme.danger }]}
        >
          <Text style={[styles.dangerBtnText, { color: currentTheme.danger }]}>Restaurar Padrões de Fábrica</Text>
        </TouchableOpacity>
      </View>

      {/* App Version Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: currentTheme.textMuted }]}>
          BeatSync v1.0.0 • Progressive Web App (PWA)
        </Text>
        <Text style={[styles.footerSub, { color: currentTheme.textMuted }]}>
          Desenvolvido com precisão Web Audio API para músicos e palcos
        </Text>
      </View>

      {/* Auth Modal */}
      <AuthModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '700',
  },
  userBadge: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  syncBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
  },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncStatusText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  authPromoText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  loginBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  themeGrid: {
    gap: 10,
  },
  themeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '800',
  },
  activePill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activePillText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  themeTagline: {
    fontSize: 11,
    marginLeft: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    width: 20,
    fontWeight: '800',
    fontSize: 13,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  tipHighlight: {
    fontWeight: '700',
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 12,
    marginVertical: 8,
  },
  jsonBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    height: 100,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputJson: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
    height: 60,
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerSub: {
    fontSize: 10,
    marginTop: 4,
  },
});
