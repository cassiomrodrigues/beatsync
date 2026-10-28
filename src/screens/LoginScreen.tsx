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
import { useTheme } from '../theme/ThemeContext';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { currentTheme } = useTheme();
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

  const btnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <StatusBar style={currentTheme.isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
          {/* Minimalist Logo & Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoBadge,
                { backgroundColor: currentTheme.card, borderColor: currentTheme.accent },
              ]}
            >
              <Text style={styles.logoIcon}>⏱</Text>
            </View>
            <Text style={[styles.brandTitle, { color: currentTheme.text }]}>BeatSync</Text>
            <Text style={[styles.brandSubtitle, { color: currentTheme.accent }]}>
              METRÔNOMO PROGRESSIVO PWA
            </Text>
            <View
              style={[
                styles.lockBadge,
                { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
              ]}
            >
              <Text style={[styles.lockBadgeText, { color: currentTheme.textMuted }]}>
                🔒 ACESSO RESTRITO EM PRODUÇÃO
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
            ]}
          >
            <Text style={[styles.inputLabel, { color: currentTheme.textSecondary }]}>
              E-mail Autorizado
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.cardElevated,
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                  },
                ]}
                placeholder="nome@beatsync.com"
                placeholderTextColor={currentTheme.textMuted}
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

            <Text style={[styles.inputLabel, { color: currentTheme.textSecondary }]}>
              Senha de Segurança
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.cardElevated,
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                    paddingRight: 44,
                  },
                ]}
                placeholder="••••••••••••"
                placeholderTextColor={currentTheme.textMuted}
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
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: currentTheme.isDark ? '#1C0607' : '#FEE2E2',
                    borderColor: currentTheme.danger,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: currentTheme.danger }]}>
                  ⚠️ {errorMessage}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
              style={[
                styles.loginBtn,
                { backgroundColor: currentTheme.accent },
                isLoading && styles.loginBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={btnTextColor} size="small" />
              ) : (
                <Text style={[styles.loginBtnText, { color: btnTextColor }]}>
                  Entrar no BeatSync
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={[styles.footerNote, { color: currentTheme.textMuted }]}>
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
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
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
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  lockBadge: {
    marginTop: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  formCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  inputLabel: {
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loginBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
  },
});
