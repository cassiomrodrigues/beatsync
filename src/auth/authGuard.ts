import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthSession {
  email: string;
  role: 'admin' | 'user';
  name: string;
  loggedAt: number;
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

const AUTH_STORAGE_KEY = '@beatsync_session_v1';
const INVITES_STORAGE_KEY = '@beatsync_invites_v1';

// Initial master admin credentials defined by user
export const MASTER_ADMIN = {
  email: 'teste@beatsync.com',
  password: 'Beatsync@2026#',
  role: 'admin' as const,
  name: 'Administrador BeatSync',
};

// Initial default invite samples
const INITIAL_INVITES: UserInvite[] = [
  {
    id: 'inv-1',
    email: 'baterista@beatsync.com',
    role: 'musician',
    status: 'active',
    invitedAt: Date.now() - 86400000 * 2,
    invitedBy: 'teste@beatsync.com',
    notes: 'Bateria - Ministério de Louvor',
  },
  {
    id: 'inv-2',
    email: 'tecladista@beatsync.com',
    role: 'musician',
    status: 'pending',
    invitedAt: Date.now() - 86400000,
    invitedBy: 'teste@beatsync.com',
    notes: 'Teclados / Arranjos',
  },
];

export const AuthGuardService = {
  /**
   * Realiza login no BeatSync
   */
  async login(email: string, password: string): Promise<{ success: boolean; session?: AuthSession; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check master admin credentials
    if (cleanEmail === MASTER_ADMIN.email.toLowerCase() && cleanPass === MASTER_ADMIN.password) {
      const session: AuthSession = {
        email: MASTER_ADMIN.email,
        role: 'admin',
        name: MASTER_ADMIN.name,
        loggedAt: Date.now(),
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return { success: true, session };
    }

    // Check authorized invites list
    const invites = await this.getInvites();
    const foundInvite = invites.find((inv) => inv.email.toLowerCase() === cleanEmail);

    if (foundInvite) {
      if (foundInvite.status !== 'active') {
        return {
          success: false,
          message: 'Seu convite ainda está pendente de ativação pelo administrador.',
        };
      }
      // For invited users, permit login if password matches default pattern or invite password
      if (cleanPass === MASTER_ADMIN.password || cleanPass === 'BeatSync@Acesso#') {
        const session: AuthSession = {
          email: foundInvite.email,
          role: foundInvite.role === 'admin' ? 'admin' : 'user',
          name: foundInvite.email.split('@')[0],
          loggedAt: Date.now(),
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        return { success: true, session };
      } else {
        return { success: false, message: 'Senha incorreta para este usuário convidado.' };
      }
    }

    return {
      success: false,
      message: 'Acesso restrito. E-mail ou senha não autorizados.',
    };
  },

  /**
   * Obtém a sessão atual salva
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const json = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!json) return null;
      return JSON.parse(json) as AuthSession;
    } catch {
      return null;
    }
  },

  /**
   * Realiza logout limpando a sessão
   */
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },

  /**
   * Lista todos os convites / usuários autorizados
   */
  async getInvites(): Promise<UserInvite[]> {
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
   * Cadastra / convida um novo e-mail autorizado
   */
  async createInvite(
    email: string,
    role: 'admin' | 'musician' | 'band_leader',
    notes?: string
  ): Promise<UserInvite> {
    const cleanEmail = email.trim().toLowerCase();
    const invites = await this.getInvites();

    const exists = invites.some((inv) => inv.email.toLowerCase() === cleanEmail);
    if (exists || cleanEmail === MASTER_ADMIN.email.toLowerCase()) {
      throw new Error('Este e-mail já possui convite ou acesso cadastrado.');
    }

    const session = await this.getSession();

    const newInvite: UserInvite = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      role,
      status: 'pending',
      invitedAt: Date.now(),
      invitedBy: session?.email || MASTER_ADMIN.email,
      notes: notes?.trim() || undefined,
    };

    const updated = [newInvite, ...invites];
    await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
    return newInvite;
  },

  /**
   * Ativa ou suspende um convite
   */
  async toggleInviteStatus(inviteId: string): Promise<UserInvite[]> {
    const invites = await this.getInvites();
    const updated = invites.map((inv) => {
      if (inv.id === inviteId) {
        return {
          ...inv,
          status: (inv.status === 'active' ? 'pending' : 'active') as 'active' | 'pending',
        };
      }
      return inv;
    });
    await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Remove / revoga um convite
   */
  async deleteInvite(inviteId: string): Promise<UserInvite[]> {
    const invites = await this.getInvites();
    const updated = invites.filter((inv) => inv.id !== inviteId);
    await AsyncStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
};
