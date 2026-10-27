import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AuthService } from '../supabase/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const data = await AuthService.signUp(cleanEmail, password, displayName);
        if (data.user) {
          onSuccess(data.user);
          onClose();
        } else {
          setErrorMessage('Cadastro realizado! Verifique seu e-mail caso a confirmação seja solicitada.');
        }
      } else {
        const data = await AuthService.signIn(cleanEmail, password);
        if (data.user) {
          onSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Falha ao autenticar.';
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else if (msg.includes('User already registered')) {
        setErrorMessage('Este e-mail já está cadastrado. Tente entrar.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {isSignUp ? '🎵 Criar Conta BeatSync' : '🔐 Entrar no BeatSync'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isSignUp
                  ? 'Sincronize seu repertório e acesse a Biblioteca Global'
                  : 'Acesse suas músicas e setlists em qualquer dispositivo'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome ou Banda</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva ou Ministério de Louvor"
                placeholderTextColor="#687394"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu-email@exemplo.com"
              placeholderTextColor="#687394"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo de 6 dígitos"
              placeholderTextColor="#687394"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0E1017" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isSignUp ? 'Criar Minha Conta' : 'Entrar na Minha Conta'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch Mode */}
          <TouchableOpacity
            style={styles.switchModeBtn}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.switchModeText}>
              {isSignUp
                ? 'Já possui uma conta? Entrar agora'
                : 'Novo no BeatSync? Cadastre-se gratuitamente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#151824',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262D42',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#00E5FF',
    fontSize: 19,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#8A96BA',
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#8A96BA',
    fontSize: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#B0BAD6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0E1018',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A324A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#351114',
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0E1017',
    fontWeight: '800',
    fontSize: 14,
  },
  switchModeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    color: '#8A96BA',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
