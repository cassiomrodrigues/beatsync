import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/supabaseClient';

export interface AuthSession {
  email: string;
  role: 'admin' | 'user';
  name: string;
  loggedAt: number;
  userId?: string;
}

export interface UserInvite {
  id: string;
  email: string;
  role: 'admin' | 'musician' | 'band_leader';
  status: 'active' | 'pending';
  invitedAt: number;
  invitedBy: string;
  notes?: string;
}

interface UserInviteRow {
  id: string;
  email: string;
  role: 'admin' | 'musician' | 'band_leader';
  status: 'active' | 'pending';
  invited_by: string;
  notes: string | null;
  created_at: string;
}

const AUTH_STORAGE_KEY = '@beatsync_session_v1';
const INVITES_STORAGE_KEY = '@beatsync_invites_v1';
const MASTER_ADMIN_EMAIL = 'teste@beatsync.com';

const INITIAL_INVITES: UserInvite[] = [
  {
    id: 'inv-1',
    email: 'baterista@beatsync.com',
    role: 'musician',
    status: 'active',
    invitedAt: Date.now() - 86400000 * 2,
    invitedBy: MASTER_ADMIN_EMAIL,
    notes: 'Bateria - Ministério de Louvor',
  },
  {
    id: 'inv-2',
    email: 'tecladista@beatsync.com',
    role: 'musician',
    status: 'pending',
    invitedAt: Date.now() - 86400000,
    invitedBy: MASTER_ADMIN_EMAIL,
    notes: 'Teclados / Arranjos',
  },
];

function mapInviteRow(row: UserInviteRow): UserInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedAt: new Date(row.created_at).getTime(),
    invitedBy: row.invited_by,
    notes: row.notes || undefined,
  };
}

export const AuthGuardService = {
  /**
   * Realiza login integrado com Supabase Auth e verificação de convites (user_invites)
   */
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; session?: AuthSession; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Verifica convite/autorização na tabela user_invites (ou cache local se offline)
    const invites = await this.getInvites();
    const foundInvite = invites.find((inv) => inv.email.toLowerCase() === cleanEmail);
    const isMasterEmail = cleanEmail === MASTER_ADMIN_EMAIL;

    if (foundInvite && foundInvite.status !== 'active' && !isMasterEmail) {
      return {
        success: false,
        message: 'Seu convite ainda está pendente de ativação pelo administrador.',
      };
    }

    if (!foundInvite && !isMasterEmail) {
      return {
        success: false,
        message: 'Acesso restrito. E-mail não autorizado na lista de convites.',
      };
    }

    // 2. Autentica no Supabase Auth
    let authUser = null;
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (!signInError && signInData?.user) {
      authUser = signInData.user;
    } else if (foundInvite && foundInvite.status === 'active') {
      // Caso o músico convidado esteja entrando pela primeira vez, provisiona a conta no Supabase Auth
      // (a trigger trg_auto_confirm_invited_user confirma automaticamente e-mails ativos)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            display_name: cleanEmail.split('@')[0],
            role: foundInvite.role,
          },
        },
      });

      if (!signUpError && signUpData?.user) {
        if (!signUpData.session) {
          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass,
          });
          authUser = retry.data?.user || signUpData.user;
        } else {
          authUser = signUpData.user;
        }
      } else {
        return {
          success: false,
          message: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        };
      }
    } else {
      return {
        success: false,
        message: 'Credenciais inválidas. Verifique seu e-mail e senha.',
      };
    }

    const resolvedRole: 'admin' | 'user' =
      isMasterEmail || foundInvite?.role === 'admin' ? 'admin' : 'user';
    const displayName =
      (authUser?.user_metadata?.display_name as string | undefined) ||
      (isMasterEmail ? 'Administrador BeatSync' : cleanEmail.split('@')[0]);

    const session: AuthSession = {
      email: cleanEmail,
      role: resolvedRole,
      name: displayName,
      loggedAt: Date.now(),
      userId: authUser?.id,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  },

  /**
   * Obtém a sessão atual sincronizada com o Supabase Auth
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data } = await supabase.auth.getSession();
      const sbUser = data?.session?.user;

      if (sbUser?.email) {
        const cleanEmail = sbUser.email.toLowerCase();
        const isMasterEmail = cleanEmail === MASTER_ADMIN_EMAIL;
        const metaRole = sbUser.user_metadata?.role;
        const cachedJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        const cached = cachedJson ? (JSON.parse(cachedJson) as AuthSession) : null;

        const session: AuthSession = {
          email: cleanEmail,
          role: isMasterEmail || metaRole === 'admin' || cached?.role === 'admin' ? 'admin' : 'user',
          name:
            (sbUser.user_metadata?.display_name as string | undefined) ||
            cached?.name ||
            cleanEmail.split('@')[0],
          loggedAt: cached?.loggedAt || Date.now(),
          userId: sbUser.id,
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        return session;
      }

      const json = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!json) return null;
      return JSON.parse(json) as AuthSession;
    } catch {
      return null;
    }
  },

  /**
   * Realiza logout limpando a sessão local e do Supabase Auth
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signOut
    }
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },

  /**
   * Lista todos os convites / usuários autorizados do Supabase (com fallback local)
   */
  async getInvites(): Promise<UserInvite[]> {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('id, email, role, status, invited_by, notes, created_at')
        .neq('email', MASTER_ADMIN_EMAIL)
        .order('created_at', { ascending: false })
        .returns<UserInviteRow[]>();

      if (!error && data) {
        const mapped = data.map(mapInviteRow);
        await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch {
      // Fallback to local cache when offline
    }

    try {
      const json = await AsyncStorage.getItem(INVITES_STORAGE_KEY);
      if (!json) {
        await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(INITIAL_INVITES));
        return INITIAL_INVITES;
      }
      return JSON.parse(json) as UserInvite[];
    } catch {
      return INITIAL_INVITES;
    }
  },

  /**
   * Cadastra / convida um novo e-mail autorizado no Supabase
   */
  async createInvite(
    email: string,
    role: 'admin' | 'musician' | 'band_leader',
    notes?: string
  ): Promise<UserInvite> {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === MASTER_ADMIN_EMAIL) {
      throw new Error('Este e-mail já pertence ao administrador master.');
    }

    const session = await this.getSession();
    const invitedBy = session?.email || MASTER_ADMIN_EMAIL;

    const { data, error } = await supabase
      .from('user_invites')
      .insert({
        email: cleanEmail,
        role,
        status: 'active',
        invited_by: invitedBy,
        notes: notes?.trim() || null,
      })
      .select('id, email, role, status, invited_by, notes, created_at')
      .single<UserInviteRow>();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Este e-mail já possui convite ou acesso cadastrado.');
      }
      throw new Error(error.message || 'Não foi possível salvar o convite na nuvem.');
    }

    const created = mapInviteRow(data);
    const current = await this.getInvites();
    const updated = [created, ...current.filter((i) => i.id !== created.id)];
    await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
    return created;
  },

  /**
   * Ativa ou suspende um convite no Supabase
   */
  async toggleInviteStatus(inviteId: string): Promise<UserInvite[]> {
    const invites = await this.getInvites();
    const target = invites.find((inv) => inv.id === inviteId);
    if (!target) return invites;

    const nextStatus: 'active' | 'pending' = target.status === 'active' ? 'pending' : 'active';

    const { error } = await supabase
      .from('user_invites')
      .update({ status: nextStatus })
      .eq('id', inviteId);

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar status do convite.');
    }

    return this.getInvites();
  },

  /**
   * Remove / revoga um convite no Supabase
   */
  async deleteInvite(inviteId: string): Promise<UserInvite[]> {
    const { error } = await supabase.from('user_invites').delete().eq('id', inviteId);
    if (error) {
      throw new Error(error.message || 'Erro ao revogar convite.');
    }
    return this.getInvites();
  },
};
