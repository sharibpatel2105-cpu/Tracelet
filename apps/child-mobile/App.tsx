import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const LOCATION_TASK = 'tracelet-child-background-location';

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

type FamilyGeofence = {
  shape_type: 'circle' | 'polygon';
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  points?: Array<{ latitude: number; longitude: number }> | null;
};

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const earthRadius = 6371000;
  const latDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lonDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latA = (a.latitude * Math.PI) / 180;
  const latB = (b.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function pointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i].longitude);
    const yi = Number(polygon[i].latitude);
    const xj = Number(polygon[j].longitude);
    const yj = Number(polygon[j].latitude);
    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isInsideGeofence(
  location: { latitude: number; longitude: number } | null,
  geofence: FamilyGeofence | null
) {
  if (!location || !geofence) return null;
  if (geofence.shape_type === 'polygon' && Array.isArray(geofence.points) && geofence.points.length >= 3) {
    return pointInPolygon(location, geofence.points);
  }
  return (
    distanceMeters(location, {
      latitude: Number(geofence.center_latitude),
      longitude: Number(geofence.center_longitude),
    }) <= Number(geofence.radius_meters)
  );
}

function geofenceSummary(geofence: FamilyGeofence | null) {
  if (!geofence) {
    return {
      title: 'No safe zone yet',
      detail: 'This updates when the parent saves or edits a family safe zone.',
    };
  }

  const centerText = `${Number(geofence.center_latitude).toFixed(5)}, ${Number(geofence.center_longitude).toFixed(5)}`;
  if (geofence.shape_type === 'polygon') {
    const pointCount = Array.isArray(geofence.points) ? geofence.points.length : 0;
    return {
      title: `Polygon safe zone`,
      detail: `${pointCount} points around ${centerText}`,
    };
  }

  return {
    title: `Circle safe zone`,
    detail: `${Math.round(Number(geofence.radius_meters))}m radius around ${centerText}`,
  };
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error', error);
    return;
  }

  const locations = data?.locations;
  if (!locations?.length) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return;

  const latest = locations[locations.length - 1];
  await supabase.from('live_locations').insert({
    family_id: profile.family_id,
    child_user_id: user.id,
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    accuracy: latest.coords.accuracy,
    speed: latest.coords.speed,
    heading: latest.coords.heading,
    source: 'background',
    is_live: true,
    captured_at: new Date(latest.timestamp).toISOString(),
  });
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function ChildApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [locationText, setLocationText] = useState('No live location yet');
  const [statusText, setStatusText] = useState('Signed out');
  const [pushToken, setPushToken] = useState('');
  const [geofence, setGeofence] = useState<FamilyGeofence | null>(null);
  const [geofenceTitle, setGeofenceTitle] = useState('No safe zone yet');
  const [geofenceDetail, setGeofenceDetail] = useState(
    'This updates when the parent saves or edits a family safe zone.'
  );
  const [geofenceStatus, setGeofenceStatus] = useState('Waiting for parent');
  const latestLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const geofenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
      if (data.session) {
        setStatusText('Signed in');
        syncGeofenceState().catch((error) => console.error(error));
      }
    });
    return () => {
      if (geofenceChannelRef.current) {
        supabase.removeChannel(geofenceChannelRef.current).catch((error) => console.error(error));
        geofenceChannelRef.current = null;
      }
    };
  }, []);

  const liveBanner = useMemo(() => {
    return isSharing ? 'Live location sharing is on' : 'Location sharing is off';
  }, [isSharing]);

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
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
    setStatusText('Signed in');
    await registerPushToken();
    await syncGeofenceState();
  }

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

  async function pushForegroundLocation(location: Location.LocationObject) {
    const { user, familyId } = await ensureProfile();
    latestLocationRef.current = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    await supabase.from('live_locations').insert({
      family_id: familyId,
      child_user_id: user.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      source: 'foreground',
      is_live: true,
      captured_at: new Date(location.timestamp).toISOString(),
    });
    setLocationText(`${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
    updateGeofenceStatus(geofence, latestLocationRef.current);
  }

  function updateGeofenceStatus(
    nextGeofence: FamilyGeofence | null,
    location = latestLocationRef.current
  ) {
    const summary = geofenceSummary(nextGeofence);
    setGeofenceTitle(summary.title);
    setGeofenceDetail(summary.detail);

    if (!nextGeofence) {
      setGeofenceStatus('Waiting for parent');
      return;
    }

    const inside = isInsideGeofence(location, nextGeofence);
    if (inside === null) {
      setGeofenceStatus('Zone ready');
      return;
    }
    setGeofenceStatus(inside ? 'Inside safe zone' : 'Outside safe zone');
  }

  async function syncGeofenceState() {
    const { familyId } = await ensureProfile();

    const { data, error } = await supabase
      .from('family_geofences')
      .select('*')
      .eq('family_id', familyId)
      .maybeSingle();
    if (error) throw error;

    const nextGeofence = (data as FamilyGeofence | null) ?? null;
    setGeofence(nextGeofence);
    updateGeofenceStatus(nextGeofence);

    if (geofenceChannelRef.current) {
      await supabase.removeChannel(geofenceChannelRef.current);
      geofenceChannelRef.current = null;
    }

    geofenceChannelRef.current = supabase
      .channel(`child-geofences-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_geofences',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const updatedGeofence =
            payload.eventType === 'DELETE' ? null : ((payload.new as FamilyGeofence | null) ?? null);
          setGeofence(updatedGeofence);
          updateGeofenceStatus(updatedGeofence);
        }
      )
      .subscribe();
  }

  async function startLiveSharing() {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      Alert.alert('Permission needed', 'Foreground location permission is required.');
      return;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') {
      Alert.alert('Background not granted', 'Location will only update while the app stays active.');
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await pushForegroundLocation(current);

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Tracelet live sharing',
        notificationBody: 'Location sharing is active for your family safety group.',
      },
    });

    setIsSharing(true);
    setStatusText('Live location active');
  }

  async function stopLiveSharing() {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    setIsSharing(false);
    setStatusText('Live sharing paused');
  }

  async function sendSos() {
    const { user, familyId } = await ensureProfile();
    await supabase.from('alerts').insert({
      family_id: familyId,
      child_user_id: user.id,
      type: 'sos',
      payload: {
        locationText,
        source: 'child-mobile',
      },
    });
    Alert.alert('SOS sent', 'The parent web and mobile apps can now receive this alert.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Child mobile</Text>
        <Text style={styles.title}>Tracelet Child</Text>

        {!sessionReady ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sign in</Text>
            <TextInput
              style={styles.input}
              placeholder="child email"
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

        <View style={[styles.banner, isSharing ? styles.bannerLive : null]}>
          <Text style={styles.bannerTitle}>{liveBanner}</Text>
          <Text style={styles.body}>{statusText}</Text>
          <Text style={styles.body}>Push token: {pushToken || 'not registered yet'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Latest location</Text>
          <Text style={styles.location}>{locationText}</Text>
          <Text style={styles.body}>
            This app uses Expo Location and TaskManager to send consent-based live and background updates to Supabase.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Parent safe zone</Text>
          <Text style={styles.zoneStatus}>{geofenceStatus}</Text>
          <Text style={styles.zoneTitle}>{geofenceTitle}</Text>
          <Text style={styles.body}>{geofenceDetail}</Text>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.primaryWide} onPress={startLiveSharing}>
            <Text style={styles.primaryText}>Start live sharing</Text>
          </Pressable>
          <Pressable style={styles.secondaryWide} onPress={stopLiveSharing}>
            <Text style={styles.secondaryText}>Pause</Text>
          </Pressable>
        </View>

        <Pressable style={styles.sos} onPress={sendSos}>
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
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
  zoneStatus: { fontSize: 16, fontWeight: '800', color: '#0e7c7b' },
  zoneTitle: { fontSize: 20, fontWeight: '800', color: '#172126' },
  row: { flexDirection: 'row', gap: 12 },
  primary: { backgroundColor: '#0e7c7b', borderRadius: 12, padding: 14 },
  primaryWide: { flex: 1, backgroundColor: '#0e7c7b', borderRadius: 12, padding: 14 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondaryWide: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 14 },
  secondaryText: { color: '#172126', textAlign: 'center', fontWeight: '700' },
  sos: {
    backgroundColor: '#c83f49',
    borderRadius: 999,
    paddingVertical: 26,
    alignItems: 'center',
  },
  sosText: { color: '#fff', fontSize: 30, fontWeight: '800' },
});
