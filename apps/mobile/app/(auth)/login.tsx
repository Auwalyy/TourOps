import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { errorMessage } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e, 'Could not sign you in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
          <View className="items-center">
            <Logo size={56} />
            <Text className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
              TourOps
            </Text>
            <Text className="mt-1 text-[13px] text-neutral-500">
              Travel, visa and Hajj operations
            </Text>
          </View>

          <View className="mt-10 gap-4">
            <Input
              label="Email"
              placeholder="you@agency.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error ? (
              <View className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <Text className="text-[13px] text-red-700">{error}</Text>
              </View>
            ) : null}

            <Button onPress={submit} loading={busy} fullWidth>
              Sign in
            </Button>
          </View>

          <Text className="mt-8 text-center text-xs text-neutral-400">
            Ask your agency owner for an account.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
