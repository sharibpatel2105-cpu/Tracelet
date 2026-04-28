import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function ParentApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [pushToken, setPushToken] = useState('');
  const [locationText, setLocationText] = useState('Waiting for child location');
  const [alertText, setAlertText] = useState('No active alerts');

  const dashboardTitle = useMemo(() => {
    return sessionReady ? 'Parent dashboard connected' : 'Sign in to connect';
  }, [sessionReady]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
      if (data.session) {
        subscribeRealtime().catch((error) => console.error(error));
      }
    });
  }, []);

  async function ensureProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No signed-in user');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single();
    if (error || !profile?.family_id) throw new Error('Profile missing family_id');
    return { user, familyId: profile.family_id };
  }

  async function registerPushToken() {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    setPushToken(token);
    const { user } = await ensureProfile();
    await supabase.from('device_tokens').upsert({
      user_id: user.id,
      expo_push_token: token,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' : 'android',
    });
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
    setSessionReady(true);
    await registerPushToken();
    await subscribeRealtime();
  }

  async function subscribeRealtime() {
    const { familyId } = await ensureProfile();

    const { data: latest } = await supabase
      .from('live_locations')
      .select('*')
      .eq('family_id', familyId)
      .order('captured_at', { ascending: false })
      .limit(1);
    if (latest?.[0]) {
      setLocationText(
        `${Number(latest[0].latitude).toFixed(5)}, ${Number(latest[0].longitude).toFixed(5)} at ${new Date(latest[0].captured_at).toLocaleTimeString()}`
      );
    }

    supabase
      .channel(`parent-live-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.new) {
            setLocationText(
              `${Number(payload.new.latitude).toFixed(5)}, ${Number(payload.new.longitude).toFixed(5)} at ${new Date(payload.new.captured_at).toLocaleTimeString()}`
            );
          }
        }
      )
      .subscribe();

    supabase
      .channel(`parent-alerts-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.new?.type) {
            setAlertText(String(payload.new.type).replaceAll('_', ' '));
          }
        }
      )
      .subscribe();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Parent mobile</Text>
        <Text style={styles.title}>Tracelet Parent</Text>

        {!sessionReady ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sign in</Text>
            <TextInput
              style={styles.input}
              placeholder="parent email"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.primary} onPress={signIn}>
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.banner, styles.bannerLive]}>
          <Text style={styles.bannerTitle}>{dashboardTitle}</Text>
          <Text style={styles.body}>Push token: {pushToken || 'not registered yet'}</Text>
          <Text style={styles.body}>This app is built for alerts, live location view, and background notification delivery.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Child live location</Text>
          <Text style={styles.location}>{locationText}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Active alert</Text>
          <Text style={styles.alert}>{alertText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7fbfb' },
  container: { padding: 20, gap: 16 },
  eyebrow: { fontSize: 12, color: '#5e6a70', fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', color: '#172126' },
  banner: { backgroundColor: '#eef8f6', borderRadius: 12, padding: 16, gap: 8 },
  bannerLive: { backgroundColor: '#ebfaf1' },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#172126' },
  body: { color: '#405057', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#172126' },
  input: {
    borderWidth: 1,
    borderColor: '#d9e3e5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  location: { fontSize: 22, fontWeight: '800', color: '#0e7c7b' },
  alert: { fontSize: 20, fontWeight: '800', color: '#c83f49' },
  primary: { backgroundColor: '#0e7c7b', borderRadius: 12, padding: 14 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
