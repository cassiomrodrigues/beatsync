import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthGuardService, AuthSession } from '../auth/authGuard';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail de acesso.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthGuardService.login(email, password);
      if (result.success && result.session) {
        onLoginSuccess(result.session);
      } else {
        setErrorMessage(result.message || 'Credenciais inválidas.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Minimalist Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>⏱</Text>
            </View>
            <Text style={styles.brandTitle}>BeatSync</Text>
            <Text style={styles.brandSubtitle}>METRÔNOMO PROGRESSIVO PWA</Text>
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>🔒 ACESSO RESTRITO EM PRODUÇÃO</Text>
            </View>
          </View>

          {/* Form Card (OLED Zero Luz: deep black with subtle borders) */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>E-mail Autorizado</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="nome@beatsync.com"
                placeholderTextColor="#444444"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.inputLabel}>Senha de Segurança</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="••••••••••••"
                placeholderTextColor="#444444"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Entrar no BeatSync</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Ambiente protegido para ensaios e palcos • Visual OLED Zero Luz
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 2,
    marginTop: 4,
  },
  lockBadge: {
    marginTop: 12,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#222222',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockBadgeText: {
    color: '#777777',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  formCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#070707',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#181818',
    padding: 24,
  },
  inputLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 2,
  },
  eyeText: {
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: '#1C0607',
    borderWidth: 1,
    borderColor: '#5C1014',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerNote: {
    color: '#444444',
    fontSize: 11,
    textAlign: 'center',
  },
});
