import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AuthGuardService, UserInvite, AuthSession } from '../auth/authGuard';
import { useTheme } from '../theme/ThemeContext';

interface AdminScreenProps {
  currentSession: AuthSession;
  onExitAdmin?: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ currentSession, onExitAdmin }) => {
  const { currentTheme } = useTheme();
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'musician' | 'band_leader' | 'admin'>('musician');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await AuthGuardService.getInvites();
      setInvites(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvite = async () => {
    setFeedback(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedback({ text: 'Por favor, insira um e-mail válido.', isError: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await AuthGuardService.createInvite(cleanEmail, newRole, newNotes);
      setInvites([created, ...invites]);
      setNewEmail('');
      setNewNotes('');
      setFeedback({ text: `Convite gerado com sucesso para ${cleanEmail}!`, isError: false });
    } catch (e: any) {
      setFeedback({ text: e.message || 'Erro ao cadastrar convite.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (invite: UserInvite) => {
    try {
      const updated = await AuthGuardService.toggleInviteStatus(invite.id);
      setInvites(updated);
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  const handleDeleteInvite = async (invite: UserInvite) => {
    const doDelete = async () => {
      try {
        const updated = await AuthGuardService.deleteInvite(invite.id);
        setInvites(updated);
      } catch (e: any) {
        alert(`Erro: ${e.message}`);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja revogar o acesso de ${invite.email}?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Revogar Acesso', `Deseja revogar o acesso de ${invite.email}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revogar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const activeCount = invites.filter((i) => i.status === 'active').length;
  const pendingCount = invites.filter((i) => i.status === 'pending').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: currentTheme.text }]}>Painel Administrativo</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Gestão de Convites & Controle de Acesso ao BeatSync
          </Text>
        </View>
        {onExitAdmin && (
          <TouchableOpacity onPress={onExitAdmin} style={[styles.exitBtn, { borderColor: currentTheme.border }]}>
            <Text style={[styles.exitBtnText, { color: currentTheme.textSecondary }]}>Voltar ao App</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <Text style={[styles.metricValue, { color: currentTheme.accent }]}>{invites.length + 1}</Text>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>Total de Acessos</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <Text style={[styles.metricValue, { color: currentTheme.success }]}>{activeCount + 1}</Text>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>Acessos Ativos</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <Text style={[styles.metricValue, { color: '#FFA000' }]}>{pendingCount}</Text>
          <Text style={[styles.metricLabel, { color: currentTheme.textSecondary }]}>Convites Pendentes</Text>
        </View>
      </View>

      {/* Master Admin Card */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>👑 ADMINISTRADOR MASTER DO SISTEMA</Text>
        <View style={styles.adminInfoRow}>
          <View style={[styles.adminAvatar, { backgroundColor: currentTheme.accent }]}>
            <Text style={styles.adminAvatarText}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminEmailText, { color: currentTheme.text }]}>teste@beatsync.com</Text>
            <Text style={[styles.adminRoleText, { color: currentTheme.success }]}>
              ● Acesso Total Irrestrito (Master Superadmin)
            </Text>
          </View>
          <View style={styles.protectedPill}>
            <Text style={styles.protectedPillText}>PROTEGIDO</Text>
          </View>
        </View>
      </View>

      {/* New Invite Form */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardHeader, { color: currentTheme.accent }]}>➕ CONVIDAR / AUTORIZAR NOVO E-MAIL</Text>
        <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>
          Cadastre os e-mails de músicos, produtores ou líderes de ministério que terão permissão de acesso ao BeatSync:
        </Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: currentTheme.textSecondary }]}>E-mail do Músico</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border, color: currentTheme.text },
            ]}
            placeholder="exemplo@igreja-ou-banda.com"
            placeholderTextColor={currentTheme.textMuted}
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Role Selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Função / Tipo de Perfil</Text>
          <View style={styles.rolesRow}>
            {[
              { id: 'musician', label: '🎵 Músico' },
              { id: 'band_leader', label: '🎼 Líder / Maestro' },
              { id: 'admin', label: '⚙️ Admin Auxiliar' },
            ].map((r) => {
              const isSelected = newRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setNewRole(r.id as any)}
                  style={[
                    styles.roleChip,
                    { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                    isSelected && { borderColor: currentTheme.accent, backgroundColor: currentTheme.isOled ? '#151515' : '#11354A' },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: currentTheme.textSecondary },
                      isSelected && { color: currentTheme.accent, fontWeight: '800' },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: currentTheme.textSecondary }]}>Observações (Opcional)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border, color: currentTheme.text },
            ]}
            placeholder="Ex: Bateria principal no culto de domingo; Guitarra solo..."
            placeholderTextColor={currentTheme.textMuted}
            value={newNotes}
            onChangeText={setNewNotes}
          />
        </View>

        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              feedback.isError ? styles.feedbackError : styles.feedbackSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.isError ? styles.feedbackTextError : styles.feedbackTextSuccess,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCreateInvite}
          disabled={isSubmitting}
          style={[styles.submitBtn, { backgroundColor: currentTheme.accent }]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Criar e Autorizar Acesso</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Invites List */}
      <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
        <View style={styles.listHeaderRow}>
          <Text style={[styles.cardHeader, { color: currentTheme.accent, marginBottom: 0 }]}>
            📋 LISTAGEM DE CONVITES & ACESSOS ({invites.length})
          </Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
            <Text style={[styles.refreshText, { color: currentTheme.textSecondary }]}>🔄 Atualizar</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={currentTheme.accent} />
          </View>
        ) : invites.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textMuted }]}>
            Nenhum convite cadastrado ainda. Use o formulário acima para adicionar membros.
          </Text>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {invites.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.inviteItem,
                  { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                ]}
              >
                <View style={styles.inviteMainRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.inviteEmail, { color: currentTheme.text }]}>{item.email}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'active' ? styles.statusActive : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === 'active' ? styles.statusActiveText : styles.statusPendingText,
                          ]}
                        >
                          {item.status === 'active' ? 'ATIVO' : 'PENDENTE'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.inviteDetails, { color: currentTheme.textSecondary }]}>
                      Função: {item.role === 'admin' ? 'Administrador' : item.role === 'band_leader' ? 'Líder / Arranjador' : 'Músico'}
                      {item.notes ? ` • ${item.notes}` : ''}
                    </Text>

                    <Text style={[styles.inviteDate, { color: currentTheme.textMuted }]}>
                      Criado em: {new Date(item.invitedAt).toLocaleDateString('pt-BR')} por {item.invitedBy}
                    </Text>
                  </View>

                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(item)}
                      style={[
                        styles.actionBtn,
                        item.status === 'active' ? styles.btnSuspend : styles.btnActivate,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          item.status === 'active' ? styles.btnSuspendText : styles.btnActivateText,
                        ]}
                      >
                        {item.status === 'active' ? 'Suspender' : 'Ativar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteInvite(item)}
                      style={[styles.actionBtn, styles.btnRevoke]}
                    >
                      <Text style={styles.btnRevokeText}>Revogar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  adminBadge: {
    backgroundColor: '#00E5FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  exitBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exitBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  adminInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  adminEmailText: {
    fontSize: 14,
    fontWeight: '800',
  },
  adminRoleText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  protectedPill: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  protectedPillText: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackBox: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  feedbackSuccess: {
    backgroundColor: '#092917',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  feedbackError: {
    backgroundColor: '#2F0D0F',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: '#00E676',
  },
  feedbackTextError: {
    color: '#FF5252',
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshBtn: {
    padding: 4,
  },
  refreshText: {
    fontSize: 11,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  inviteItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  inviteMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  inviteEmail: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#0A2B19',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  statusPending: {
    backgroundColor: '#30210A',
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statusActiveText: {
    color: '#00E676',
  },
  statusPendingText: {
    color: '#FFA000',
  },
  inviteDetails: {
    fontSize: 11,
    marginTop: 4,
  },
  inviteDate: {
    fontSize: 10,
    marginTop: 2,
  },
  actionsCol: {
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  btnActivate: {
    backgroundColor: '#0D361F',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  btnActivateText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  btnSuspend: {
    backgroundColor: '#332308',
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  btnSuspendText: {
    color: '#FFA000',
    fontSize: 10,
    fontWeight: '700',
  },
  btnRevoke: {
    backgroundColor: '#2E0E12',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  btnRevokeText: {
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '700',
  },
});
