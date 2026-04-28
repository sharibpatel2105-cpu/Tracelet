import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const defaultContacts = [{ name: "Emergency contact", route: "9930679739" }];
const supabaseUrl = window.CIRCLESAFE_SUPABASE_URL || "";
const supabaseAnonKey = window.CIRCLESAFE_SUPABASE_ANON_KEY || "";
const googleMapsApiKey = window.CIRCLESAFE_GOOGLE_MAPS_API_KEY || "";
const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "PASTE_SUPABASE_ANON_KEY_HERE";

const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

const state = {
  role: "",
  profile: null,
  familyId: "",
  latestLocation: null,
  contacts: defaultContacts,
  lastCheckin: "",
  timerEnd: null,
  timerInterval: null,
  activeAlert: "",
  isSharingLive: false,
  geofence: null,
  geofenceType: "none",
  alertFeed: [],
  riskScore: 18,
  riskLabel: "Low",
  signalList: [],
  liveChannel: null,
  alertChannel: null,
  geofenceChannel: null,
  geofencePollTimer: null,
  watchId: null,
  googleMapsReady: null,
  parentRefreshCadenceSeconds: 0,
  pendingParentLocation: null,
  parentRefreshTimer: null,
  parentGeofenceMode: "circle",
  polygonDraftPoints: [],
  parentPolygonDraftOverlay: null,
  parentMapClickListener: null,
  childMapInstance: null,
  parentMapInstance: null,
  childMarker: null,
  parentMarker: null,
  childGeofenceOverlay: null,
  parentGeofenceOverlay: null,
  geofenceOverlaySyncing: false,
  theme: "dark",
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  loadingScreen: $("loadingScreen"),
  progressBar: $("progressBar"),
  loginPanel: $("loginPanel"),
  loginForm: $("loginForm"),
  username: $("username"),
  password: $("password"),
  loginError: $("loginError"),
  logoutButton: $("logoutButton"),
  themeToggle: $("themeToggle"),
  childDashboard: $("childDashboard"),
  parentDashboard: $("parentDashboard"),
  locationStatus: $("locationStatus"),
  locationPrimary: $("locationPrimary"),
  locationSecondary: $("locationSecondary"),
  mapPulse: $("mapPulse"),
  shareLocation: $("shareLocation"),
  stopLocation: $("stopLocation"),
  childMapCanvas: $("childMapCanvas"),
  parentMapCanvas: $("parentMapCanvas"),
  childMapHint: $("childMapHint"),
  parentMapHint: $("parentMapHint"),
  childMapLink: $("childMapLink"),
  parentMapLink: $("parentMapLink"),
  sosButton: $("sosButton"),
  sosStatus: $("sosStatus"),
  sosMessage: $("sosMessage"),
  timerStatus: $("timerStatus"),
  timerDisplay: $("timerDisplay"),
  checkinMinutes: $("checkinMinutes"),
  startTimer: $("startTimer"),
  checkInNow: $("checkInNow"),
  missedCheckin: $("missedCheckin"),
  parentLocation: $("parentLocation"),
  parentCheckin: $("parentCheckin"),
  parentAlert: $("parentAlert"),
  childLiveBanner: $("childLiveBanner"),
  childLiveTitle: $("childLiveTitle"),
  childLiveText: $("childLiveText"),
  parentLiveBanner: $("parentLiveBanner"),
  parentLiveTitle: $("parentLiveTitle"),
  parentLiveText: $("parentLiveText"),
  geofenceRadius: $("geofenceRadius"),
  setGeofence: $("setGeofence"),
  clearGeofence: $("clearGeofence"),
  childGeofenceState: $("childGeofenceState"),
  childGeofenceCenter: $("childGeofenceCenter"),
  childGeofenceRadiusLabel: $("childGeofenceRadiusLabel"),
  childGeofenceHint: $("childGeofenceHint"),
  childGeofenceControls: $("childGeofenceControls"),
  childGeofenceAlert: $("childGeofenceAlert"),
  childGeofenceShape: $("childGeofenceShape"),
  childGeofenceCoordinates: $("childGeofenceCoordinates"),
  parentGeofenceState: $("parentGeofenceState"),
  parentGeofenceShape: $("parentGeofenceShape"),
  parentGeofenceCoordinates: $("parentGeofenceCoordinates"),
  riskPill: $("riskPill"),
  riskScore: $("riskScore"),
  riskSummary: $("riskSummary"),
  signalList: $("signalList"),
  alertCount: $("alertCount"),
  alertFeed: $("alertFeed"),
  childCoordinateText: $("childCoordinateText"),
  childZoneState: $("childZoneState"),
  parentCoordinateText: $("parentCoordinateText"),
  parentZoneState: $("parentZoneState"),
  parentRefreshControl: $("parentRefreshControl"),
  parentGeofenceModeControl: $("parentGeofenceModeControl"),
  finishPolygonButton: $("finishPolygonButton"),
  globalPresence: $("globalPresence"),
  childHeroState: $("childHeroState"),
  childHeroText: $("childHeroText"),
  childLiveMetric: $("childLiveMetric"),
  childFenceMetric: $("childFenceMetric"),
  childAlertMetric: $("childAlertMetric"),
  parentHeroState: $("parentHeroState"),
  parentHeroText: $("parentHeroText"),
  parentLiveMetric: $("parentLiveMetric"),
  parentRiskMetric: $("parentRiskMetric"),
  parentAlertMetric: $("parentAlertMetric"),
};

function applyTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = state.theme;
  if (elements.themeToggle) {
    elements.themeToggle.textContent = state.theme === "light" ? "Dark mode" : "Light mode";
  }
}

function initTheme() {
  const storedTheme = window.localStorage.getItem("tracelet-theme");
  applyTheme(storedTheme || "dark");
}

function toggleTheme() {
  const nextTheme = state.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  window.localStorage.setItem("tracelet-theme", nextTheme);
}

function showLoginError(message) {
  elements.loginError.textContent = message;
  elements.loginError.classList.remove("hidden");
}

function clearLoginError() {
  elements.loginError.textContent = "";
  elements.loginError.classList.add("hidden");
}

function renderParentRefreshCadence() {
  elements.parentRefreshControl?.querySelectorAll("[data-refresh-seconds]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.refreshSeconds) === state.parentRefreshCadenceSeconds);
  });
}

function renderParentGeofenceMode() {
  elements.parentGeofenceModeControl?.querySelectorAll("[data-geofence-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.geofenceMode === state.parentGeofenceMode);
  });
  if (elements.finishPolygonButton) {
    const pointsNeeded = Math.max(0, 3 - state.polygonDraftPoints.length);
    elements.finishPolygonButton.disabled = state.parentGeofenceMode !== "polygon" || state.polygonDraftPoints.length < 3;
    elements.finishPolygonButton.textContent =
      state.parentGeofenceMode !== "polygon"
        ? "Finish shape"
        : state.polygonDraftPoints.length >= 3
          ? `Finish shape (${state.polygonDraftPoints.length})`
          : `Add ${pointsNeeded} more point${pointsNeeded === 1 ? "" : "s"}`;
  }
}

function renderChildGeofenceAccess() {
  const childCanEdit = state.role === "parent";
  setHidden(elements.childGeofenceControls, !childCanEdit);
}

function applyIncomingLiveLocation(location) {
  state.latestLocation = location;
  state.isSharingLive = Boolean(location?.is_live);
  if (state.geofence) {
    const distance = kmDistanceMeters(location, state.geofence.center);
    const nextInside = isInsideGeofence(location);
    if (state.geofence.isInside !== undefined && state.geofence.isInside !== nextInside) {
      pushLocalAlert(
        nextInside ? "Geofence re-entry" : "Geofence exit",
        nextInside
          ? "Child location moved back into the safe zone."
          : `Child location moved outside the safe zone by ${Math.max(1, Math.round(distance - state.geofence.radius))}m.`,
        nextInside ? "medium" : "high",
      );
      if (state.role === "child") {
        state.activeAlert = nextInside ? "" : "outside safe zone";
      }
    }
    state.geofence.isInside = nextInside;
  }
  renderAll();
}

function flushPendingParentLocation() {
  if (!state.pendingParentLocation) return;
  const location = state.pendingParentLocation;
  state.pendingParentLocation = null;
  applyIncomingLiveLocation(location);
}

function applyParentRefreshCadence(seconds) {
  state.parentRefreshCadenceSeconds = seconds;
  window.localStorage.setItem("tracelet-parent-refresh-seconds", String(seconds));
  if (state.parentRefreshTimer) {
    window.clearInterval(state.parentRefreshTimer);
    state.parentRefreshTimer = null;
  }
  if (seconds > 0 && state.role === "parent") {
    state.parentRefreshTimer = window.setInterval(flushPendingParentLocation, seconds * 1000);
  } else {
    flushPendingParentLocation();
  }
  renderParentRefreshCadence();
  if (state.role === "parent") {
    elements.parentMapHint.textContent =
      seconds === 0
        ? "Parent map applies live updates immediately."
        : `Parent map applies queued location updates every ${seconds} seconds.`;
  }
}

function initParentRefreshCadence() {
  const stored = Number(window.localStorage.getItem("tracelet-parent-refresh-seconds"));
  const nextCadence = [0, 15, 30, 60].includes(stored) ? stored : 0;
  applyParentRefreshCadence(nextCadence);
}

function startPolygonDraft() {
  state.polygonDraftPoints = [];
  if (state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay.setMap(null);
    state.parentPolygonDraftOverlay = null;
  }
  renderParentGeofenceMode();
}

function setParentGeofenceMode(mode) {
  state.parentGeofenceMode = mode === "polygon" ? "polygon" : "circle";
  if (state.parentGeofenceMode === "polygon") {
    startPolygonDraft();
    elements.parentMapHint.textContent = "Polygon mode active. Click at least 3 points on the parent map, then finish the shape.";
  } else if (state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay.setMap(null);
    state.parentPolygonDraftOverlay = null;
    state.polygonDraftPoints = [];
    elements.parentMapHint.textContent = "Circle mode active. Click on the parent map to place a safe zone.";
  }
  renderParentGeofenceMode();
}

function setHidden(element, hidden) {
  element.classList.toggle("hidden", hidden);
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatLocation(location) {
  return `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
}

function mapsLink(location) {
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}

function mapEmbedUrl(location) {
  const delta = 0.006;
  const left = Number(location.longitude) - delta;
  const right = Number(location.longitude) + delta;
  const top = Number(location.latitude) + delta;
  const bottom = Number(location.latitude) - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
}

function toStoredLocation(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    captured_at: new Date().toISOString(),
  };
}

function sharingAgeMs() {
  if (!state.latestLocation?.captured_at) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(state.latestLocation.captured_at).getTime();
}

function renderContacts() {
  $$(".contact-count").forEach((count) => {
    count.textContent = `${state.contacts.length} saved`;
  });

  $$(".contact-list").forEach((list) => {
    list.innerHTML = "";
    state.contacts.forEach((contact, index) => {
      const route = contact.phone || contact.email || contact.route || "";
      const item = document.createElement("li");
      item.innerHTML = `
        <span><strong>${contact.name}</strong><br><small>${route}</small></span>
        <button class="remove-contact" aria-label="Remove ${contact.name}" data-index="${index}">x</button>
      `;
      list.append(item);
    });
  });
}

function kmDistanceMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLon = toRad(Number(b.longitude) - Number(a.longitude));
  const lat1 = toRad(Number(a.latitude));
  const lat2 = toRad(Number(b.latitude));
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earth * y;
}

function pointInPolygon(point, polygon) {
  if (!polygon?.length) return false;

  const x = Number(point.longitude);
  const y = Number(point.latitude);
  let isInside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i].longitude);
    const yi = Number(polygon[i].latitude);
    const xj = Number(polygon[j].longitude);
    const yj = Number(polygon[j].latitude);
    const crossesLatitude = yi > y !== yj > y;
    if (!crossesLatitude) continue;

    const boundaryX = ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (x < boundaryX) isInside = !isInside;
  }

  return isInside;
}

function isInsideGeofence(location, geofence = state.geofence, geofenceType = state.geofenceType) {
  if (!location || !geofence) return true;
  if (geofenceType === "polygon" && geofence.points?.length) {
    return pointInPolygon(location, geofence.points);
  }
  return kmDistanceMeters(location, geofence.center) <= geofence.radius;
}

function pushLocalAlert(title, detail, severity = "medium") {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    detail,
    severity,
    createdAt: new Date().toISOString(),
  };
  state.alertFeed = [entry, ...state.alertFeed].slice(0, 8);
}

function handleGeofencePersistenceError(error) {
  console.error(error);
  const message = error?.message || "Safe zone could not be saved to Supabase.";
  elements.parentMapHint.textContent = message;
  pushLocalAlert("Geofence save failed", message, "high");
  renderAll();
}

function renderAlertFeed() {
  elements.alertCount.textContent = `${state.alertFeed.length} events`;
  elements.alertFeed.innerHTML = "";
  if (!state.alertFeed.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<strong>No live alerts yet</strong><small>Geofence exits, SOS events, stale location, and elevated risk will appear here.</small>";
    elements.alertFeed.append(empty);
    return;
  }

  state.alertFeed.forEach((entry) => {
    const item = document.createElement("li");
    item.className = entry.severity;
    item.innerHTML = `<strong>${entry.title}</strong><small>${entry.detail} at ${formatTime(new Date(entry.createdAt))}</small>`;
    elements.alertFeed.append(item);
  });
}

function renderHeroMetrics() {
  elements.childLiveMetric.textContent = state.isSharingLive ? "LIVE" : "IDLE";
  elements.childFenceMetric.textContent = state.geofence ? (state.geofence.isInside ? "ARMED" : "ALERT") : "OFF";
  elements.childAlertMetric.textContent = state.activeAlert ? "HOT" : "READY";
  elements.parentLiveMetric.textContent = state.isSharingLive ? "LIVE" : "IDLE";
  elements.parentRiskMetric.textContent = String(state.riskScore);
  elements.parentAlertMetric.textContent = String(state.alertFeed.length);
  elements.globalPresence.textContent = state.isSharingLive ? "Live mesh active" : "Standby mesh";

  elements.childHeroState.textContent = state.isSharingLive
    ? "Live safety stream is active"
    : "Visible live sharing controls";
  elements.childHeroText.textContent = state.isSharingLive
    ? "Tracelet is streaming fresh family location updates with consent-aware controls."
    : "Tracelet keeps family location sharing transparent, visible, and easy to pause.";

  elements.parentHeroState.textContent =
    state.riskLabel === "High" ? "Elevated family risk detected" : "Realtime family awareness";
  elements.parentHeroText.textContent =
    state.riskLabel === "High"
      ? "The model is seeing a combination of movement, freshness, or boundary signals that deserves immediate review."
      : "Tracelet correlates live movement, geofence state, and alerts into a single parent surface.";
}

function formatCoordinatePair(location) {
  if (!location) return "Waiting for live coordinates";
  return `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
}

function syncGeofenceStateFromOverlay() {
  const overlay = state.parentGeofenceOverlay || state.childGeofenceOverlay;
  if (!window.google?.maps || state.geofence || !overlay) return;

  if (overlay instanceof google.maps.Polygon) {
    const path = overlay.getPath();
    const points = [];
    for (let index = 0; index < path.getLength(); index += 1) {
      const point = path.getAt(index);
      points.push({
        latitude: Number(point.lat()),
        longitude: Number(point.lng()),
      });
    }
    if (points.length < 3) return;
    const derived = deriveGeofenceCenterAndRadius(points);
    state.geofenceType = "polygon";
    state.geofence = {
      center: derived.center,
      radius: derived.radius,
      points,
    };
  } else {
    const center = overlay.getCenter();
    if (!center) return;

    state.geofenceType = "circle";
    state.geofence = {
      center: {
        latitude: Number(center.lat()),
        longitude: Number(center.lng()),
      },
      radius: Math.round(Number(overlay.getRadius())),
    };
  }
  state.geofence.isInside = isInsideGeofence(state.latestLocation, state.geofence, state.geofenceType);
}

function renderGeofence() {
  syncGeofenceStateFromOverlay();
  renderChildGeofenceAccess();

  if (!state.geofence) {
    elements.childGeofenceState.textContent = "Not set";
    elements.childGeofenceCenter.textContent = "Use current location";
    elements.childGeofenceRadiusLabel.textContent = `${elements.geofenceRadius.value} m`;
    elements.childGeofenceHint.textContent =
      state.role === "child"
        ? "The parent has not shared a safe zone yet."
        : "Set a safe zone around the current shared location.";
    elements.childGeofenceShape.textContent = "None";
    elements.childGeofenceCoordinates.textContent = "Waiting for center";
    elements.parentGeofenceState.textContent = "Not set";
    elements.parentGeofenceShape.textContent = "None";
    elements.parentGeofenceCoordinates.textContent = "Waiting for center";
    elements.childZoneState.textContent = "No geofence drawn";
    elements.parentZoneState.textContent = "Zone idle";
    elements.childGeofenceAlert.textContent = "";
    elements.childGeofenceAlert.classList.add("hidden");
    return;
  }

  elements.childGeofenceState.textContent = state.geofence.isInside ? "Inside" : "Outside";
  elements.childGeofenceCenter.textContent = `${Number(state.geofence.center.latitude).toFixed(5)}, ${Number(state.geofence.center.longitude).toFixed(5)}`;
  elements.childGeofenceRadiusLabel.textContent = `${state.geofence.radius} m`;
  elements.childGeofenceShape.textContent = state.geofenceType === "polygon" ? "Polygon" : "Circle";
  elements.childGeofenceCoordinates.textContent =
    state.geofenceType === "polygon" ? "Polygon points captured" : formatCoordinatePair(state.geofence.center);
  elements.parentGeofenceState.textContent = state.geofence.isInside ? "Inside" : "Outside";
  elements.parentGeofenceShape.textContent = state.geofenceType === "polygon" ? "Polygon" : "Circle";
  elements.parentGeofenceCoordinates.textContent =
    state.geofenceType === "polygon" ? "Polygon points captured" : formatCoordinatePair(state.geofence.center);
  elements.childZoneState.textContent = state.geofence.isInside ? "Inside safe zone" : "Outside safe zone";
  elements.parentZoneState.textContent = state.geofence.isInside ? "Zone secure" : "Zone breach";
  elements.childGeofenceHint.textContent = state.geofence.isInside
    ? state.role === "child"
      ? "This safe zone was set by the parent and is shown here for awareness."
      : "Current location is inside the safe zone."
    : "Current location is outside the safe zone.";
  if (state.role === "child" && !state.geofence.isInside) {
    elements.childGeofenceAlert.innerHTML =
      "<strong>Outside safe zone</strong><small>You are outside the parent-defined safe zone. Move back in or contact your guardian.</small>";
    elements.childGeofenceAlert.classList.remove("hidden");
  } else {
    elements.childGeofenceAlert.textContent = "";
    elements.childGeofenceAlert.classList.add("hidden");
  }
}

function computeRiskModel() {
  const signals = [];
  let score = 12;

  if (!state.latestLocation) {
    state.riskScore = 18;
    state.riskLabel = "Low";
    state.signalList = ["No recent location sample yet."];
    return;
  }

  const age = sharingAgeMs();
  const speed = Number(state.latestLocation.speed || 0);
  const accuracy = Number(state.latestLocation.accuracy || 0);

  if (age > 30000) {
    score += 22;
    signals.push(`Location freshness is weak: ${Math.round(age / 1000)}s old.`);
  } else {
    signals.push(`Location is live: ${Math.max(1, Math.round(age / 1000))}s old.`);
  }

  if (speed > 12) {
    score += 20;
    signals.push(`Movement is fast at about ${(speed * 3.6).toFixed(1)} km/h.`);
  } else if (speed > 3) {
    score += 8;
    signals.push(`Movement is moderate at about ${(speed * 3.6).toFixed(1)} km/h.`);
  } else {
    signals.push("Movement is slow or stationary.");
  }

  if (accuracy > 120) {
    score += 12;
    signals.push(`GPS accuracy is weak at roughly ${Math.round(accuracy)}m.`);
  } else {
    signals.push(`GPS accuracy is acceptable at roughly ${Math.round(accuracy || 0)}m.`);
  }

  if (state.geofence) {
    const distance = kmDistanceMeters(state.latestLocation, state.geofence.center);
    state.geofence.isInside = isInsideGeofence(state.latestLocation);
    if (!state.geofence.isInside) {
      score += 30;
      signals.push(`Outside geofence by ${Math.max(1, Math.round(distance - state.geofence.radius))}m.`);
    } else {
      signals.push(`Inside safe zone with ${Math.round(state.geofence.radius - distance)}m margin.`);
    }
  } else {
    signals.push("No geofence set, so boundary monitoring is inactive.");
  }

  if (state.activeAlert) {
    score += 18;
    signals.push(`Active alert state: ${state.activeAlert}.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  state.riskScore = score;
  state.signalList = signals;
  state.riskLabel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
}

function renderRiskModel() {
  computeRiskModel();
  elements.riskScore.textContent = String(state.riskScore);
  elements.riskPill.textContent = state.riskLabel;
  elements.riskPill.classList.toggle("danger", state.riskLabel === "High");
  elements.riskPill.classList.toggle("live", state.riskLabel === "Low");
  elements.riskSummary.textContent =
    state.riskLabel === "High"
      ? "The model sees a combination of stale, fast, or out-of-zone behavior that needs attention."
      : state.riskLabel === "Medium"
        ? "The model sees cautionary signals, but not a full incident pattern."
        : "The model sees normal, low-risk movement and fresh location updates.";
  elements.signalList.innerHTML = "";
  state.signalList.forEach((signal) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>Signal</strong><small>${signal}</small>`;
    elements.signalList.append(item);
  });
}

function updateMapViews() {
  const links = [elements.childMapLink, elements.parentMapLink];

  if (!state.latestLocation) {
    links.forEach((link) => {
      link.href = "#";
      link.classList.add("disabled");
    });
    elements.childMapHint.textContent = "The map appears after location is shared.";
    elements.parentMapHint.textContent = "Waiting for the child to share location.";
    elements.childCoordinateText.textContent = "Waiting for live coordinates";
    elements.parentCoordinateText.textContent = "Waiting for live coordinates";
    ensureMaps()
      .then(() => {
        syncGeofenceLayer();
        renderGeofence();
        renderHeroMetrics();
      })
      .catch((error) => {
        elements.childMapHint.textContent = error.message;
        elements.parentMapHint.textContent = error.message;
      });
    return;
  }

  links.forEach((link) => {
    link.href = mapsLink(state.latestLocation);
    link.classList.remove("disabled");
  });
  const updated = formatTime(new Date(state.latestLocation.captured_at));
  elements.childMapHint.textContent = `Map updated ${updated}.`;
  elements.parentMapHint.textContent = `Map updated ${updated}.`;
  elements.childCoordinateText.textContent = formatCoordinatePair(state.latestLocation);
  elements.parentCoordinateText.textContent = formatCoordinatePair(state.latestLocation);
  if (state.geofence && state.role === "child") {
    elements.childMapHint.textContent = "Your parent's saved safe zone is shown on this map.";
  }

  ensureMaps()
    .then(() => {
      updateMapMarker(state.latestLocation);
      syncGeofenceLayer();
      renderGeofence();
      renderHeroMetrics();
    })
    .catch((error) => {
      elements.childMapHint.textContent = error.message;
      elements.parentMapHint.textContent = error.message;
    });
}

function loadGoogleMapsApi() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!googleMapsApiKey) {
    return Promise.reject(new Error("Add your Google Maps API key in config.js to enable the map."));
  }
  if (state.googleMapsReady) return state.googleMapsReady;

  state.googleMapsReady = new Promise((resolve, reject) => {
    window.__traceletGoogleMapsReady = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=weekly&loading=async&callback=__traceletGoogleMapsReady`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load. Check the API key and referrer settings."));
    document.head.append(script);
  });

  return state.googleMapsReady;
}

async function ensureMaps() {
  const maps = await loadGoogleMapsApi();

  if (!state.childMapInstance && elements.childMapCanvas) {
    state.childMapInstance = new maps.Map(elements.childMapCanvas, {
      center: { lat: 19.076, lng: 72.8777 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
    });
  }

  if (!state.parentMapInstance && elements.parentMapCanvas) {
    state.parentMapInstance = new maps.Map(elements.parentMapCanvas, {
      center: { lat: 19.076, lng: 72.8777 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
    });
    state.parentMapClickListener = state.parentMapInstance.addListener("click", handleParentMapClick);
  }
}

function updateMapMarker(location) {
  if (!window.google?.maps || !state.childMapInstance || !state.parentMapInstance) return;
  const position = {
    lat: Number(location.latitude),
    lng: Number(location.longitude),
  };

  if (!state.childMarker) {
    state.childMarker = new google.maps.Marker({
      map: state.childMapInstance,
      position,
      title: "Child location",
    });
    state.childMapInstance.setCenter(position);
    state.childMapInstance.setZoom(Math.max(state.childMapInstance.getZoom() || 0, 14));
  } else {
    state.childMarker.setPosition(position);
  }

  if (!state.parentMarker) {
    state.parentMarker = new google.maps.Marker({
      map: state.parentMapInstance,
      position,
      title: "Shared child location",
    });
    state.parentMapInstance.setCenter(position);
    state.parentMapInstance.setZoom(Math.max(state.parentMapInstance.getZoom() || 0, 14));
  } else {
    state.parentMarker.setPosition(position);
  }
}

function deriveGeofenceCenterAndRadius(points) {
  const center = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + Number(point.latitude),
      longitude: acc.longitude + Number(point.longitude),
    }),
    { latitude: 0, longitude: 0 },
  );
  center.latitude /= points.length;
  center.longitude /= points.length;

  const radius = Math.max(
    ...points.map((point) =>
      kmDistanceMeters(
        center,
        { latitude: Number(point.latitude), longitude: Number(point.longitude) },
      ),
    ),
  );

  return {
    center,
    radius: Math.max(50, Math.round(radius || 50)),
  };
}

function applyCircleGeofence(center, radius) {
  if (state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay.setMap(null);
    state.parentPolygonDraftOverlay = null;
  }
  state.polygonDraftPoints = [];
  state.geofenceType = "circle";
  state.geofence = {
    center: { latitude: Number(center.lat), longitude: Number(center.lng) },
    radius: Math.round(radius),
    isInside: state.latestLocation
      ? isInsideGeofence(
          state.latestLocation,
          {
            center: { latitude: Number(center.lat), longitude: Number(center.lng) },
            radius: Math.round(radius),
          },
          "circle",
        )
      : true,
  };
  elements.geofenceRadius.value = String(state.geofence.radius);
  pushLocalAlert("Geofence updated", "Safe zone geometry was updated from the map.", "medium");
  persistGeofence().catch(handleGeofencePersistenceError);
  renderAll();
}

function applyPolygonGeofence(points) {
  if (points.length < 3) return;
  const normalizedPoints = points.map((point) => ({
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
  }));
  const derived = deriveGeofenceCenterAndRadius(normalizedPoints);
  state.geofenceType = "polygon";
  state.geofence = {
    center: derived.center,
    radius: derived.radius,
    points: normalizedPoints,
    isInside: state.latestLocation
      ? isInsideGeofence(
          state.latestLocation,
          {
            center: derived.center,
            radius: derived.radius,
            points: normalizedPoints,
          },
          "polygon",
        )
      : true,
  };
  if (state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay.setMap(null);
    state.parentPolygonDraftOverlay = null;
  }
  state.polygonDraftPoints = [];
  elements.parentMapHint.textContent = `Polygon safe zone saved with ${normalizedPoints.length} points.`;
  pushLocalAlert("Geofence updated", "Polygon safe zone captured from the parent map.", "medium");
  persistGeofence().catch(handleGeofencePersistenceError);
  renderAll();
}

function bindParentGeofenceEditing(circle) {
  ["center_changed", "radius_changed"].forEach((eventName) => {
    circle.addListener(eventName, () => {
      if (state.geofenceOverlaySyncing) return;
      const center = circle.getCenter();
      if (!center) return;
      applyCircleGeofence(
        { lat: center.lat(), lng: center.lng() },
        circle.getRadius(),
      );
    });
  });
}

function bindParentPolygonEditing(polygon) {
  const syncFromPolygon = () => {
    if (state.geofenceOverlaySyncing) return;
    const path = polygon.getPath();
    const nextPoints = [];
    for (let index = 0; index < path.getLength(); index += 1) {
      const point = path.getAt(index);
      nextPoints.push({
        latitude: Number(point.lat()),
        longitude: Number(point.lng()),
      });
    }
    applyPolygonGeofence(nextPoints);
  };

  polygon.getPath().addListener("set_at", syncFromPolygon);
  polygon.getPath().addListener("insert_at", syncFromPolygon);
  polygon.getPath().addListener("remove_at", syncFromPolygon);
  polygon.addListener("dragend", syncFromPolygon);
}

function syncPolygonDraftOverlay() {
  if (!window.google?.maps || !state.parentMapInstance) return;
  if (state.polygonDraftPoints.length < 2) {
    if (state.parentPolygonDraftOverlay) {
      state.parentPolygonDraftOverlay.setMap(null);
      state.parentPolygonDraftOverlay = null;
    }
    if (state.parentGeofenceMode === "polygon" && state.polygonDraftPoints.length === 1) {
      elements.parentMapHint.textContent = "Polygon draft has 1 point. Add at least 2 more.";
    }
    renderParentGeofenceMode();
    return;
  }

  const path = state.polygonDraftPoints.map((point) => ({
    lat: Number(point.latitude),
    lng: Number(point.longitude),
  }));

  if (!state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay = new google.maps.Polygon({
      map: state.parentMapInstance,
      path,
      strokeColor: "#ffbf78",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#ffbf78",
      fillOpacity: 0.18,
      clickable: false,
      editable: false,
      draggable: false,
    });
  } else {
    state.parentPolygonDraftOverlay.setPath(path);
  }
  elements.parentMapHint.textContent =
    state.polygonDraftPoints.length >= 3
      ? `Polygon draft ready with ${state.polygonDraftPoints.length} points. Finish the shape to save it.`
      : `Polygon draft has ${state.polygonDraftPoints.length} points. Add at least ${3 - state.polygonDraftPoints.length} more.`;
  renderParentGeofenceMode();
}

function handleParentMapClick(event) {
  if (!event.latLng || state.role !== "parent") return;

  if (state.parentGeofenceMode === "polygon") {
    state.polygonDraftPoints = [
      ...state.polygonDraftPoints,
      {
        latitude: Number(event.latLng.lat()),
        longitude: Number(event.latLng.lng()),
      },
    ];
    syncPolygonDraftOverlay();
    return;
  }

  const radius = Math.min(5000, Math.max(50, Number(elements.geofenceRadius.value) || 250));
  applyCircleGeofence(
    { lat: event.latLng.lat(), lng: event.latLng.lng() },
    radius,
  );
}

function clearGeofenceOverlays() {
  if (state.childGeofenceOverlay) {
    state.childGeofenceOverlay.setMap(null);
    state.childGeofenceOverlay = null;
  }
  if (state.parentGeofenceOverlay) {
    state.parentGeofenceOverlay.setMap(null);
    state.parentGeofenceOverlay = null;
  }
}

function syncGeofenceLayer() {
  if (!window.google?.maps || !state.childMapInstance || !state.parentMapInstance) return;
  if (!state.geofence) {
    clearGeofenceOverlays();
    return;
  }

  if (state.geofenceType === "polygon" && state.geofence.points?.length >= 3) {
    const polygonPath = state.geofence.points.map((point) => ({
      lat: Number(point.latitude),
      lng: Number(point.longitude),
    }));

    if (!(state.childGeofenceOverlay instanceof google.maps.Polygon)) {
      if (state.childGeofenceOverlay) state.childGeofenceOverlay.setMap(null);
      state.childGeofenceOverlay = new google.maps.Polygon({
        map: state.childMapInstance,
        path: polygonPath,
        strokeColor: "#5bc5ff",
        strokeOpacity: 0.95,
        strokeWeight: 3,
        fillColor: "#5bc5ff",
        fillOpacity: 0.22,
        clickable: false,
        editable: false,
        draggable: false,
      });
    }

    if (!(state.parentGeofenceOverlay instanceof google.maps.Polygon)) {
      if (state.parentGeofenceOverlay) state.parentGeofenceOverlay.setMap(null);
      state.parentGeofenceOverlay = new google.maps.Polygon({
        map: state.parentMapInstance,
        path: polygonPath,
        strokeColor: "#5bc5ff",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#5bc5ff",
        fillOpacity: 0.14,
        editable: true,
        draggable: true,
      });
      bindParentPolygonEditing(state.parentGeofenceOverlay);
    }

    state.geofenceOverlaySyncing = true;
    [state.childGeofenceOverlay, state.parentGeofenceOverlay].forEach((polygon) => {
      polygon.setPath(polygonPath);
      polygon.setOptions({
        strokeColor: "#5bc5ff",
        fillColor: "#5bc5ff",
      });
    });
    state.geofenceOverlaySyncing = false;
    return;
  }

  const circleOptions = {
    center: {
      lat: Number(state.geofence.center.latitude),
      lng: Number(state.geofence.center.longitude),
    },
    radius: Number(state.geofence.radius),
    strokeColor: "#5bc5ff",
    strokeOpacity: 0.95,
    strokeWeight: 2,
    fillColor: "#5bc5ff",
    fillOpacity: 0.14,
  };

  if (!(state.childGeofenceOverlay instanceof google.maps.Circle)) {
    if (state.childGeofenceOverlay) state.childGeofenceOverlay.setMap(null);
      state.childGeofenceOverlay = new google.maps.Circle({
        ...circleOptions,
        clickable: false,
        editable: false,
        draggable: false,
        map: state.childMapInstance,
        strokeWeight: 3,
        fillOpacity: 0.22,
      });
    }

  if (!(state.parentGeofenceOverlay instanceof google.maps.Circle)) {
    if (state.parentGeofenceOverlay) state.parentGeofenceOverlay.setMap(null);
    state.parentGeofenceOverlay = new google.maps.Circle({
      ...circleOptions,
      editable: true,
      draggable: true,
      map: state.parentMapInstance,
    });
    bindParentGeofenceEditing(state.parentGeofenceOverlay);
  }

  state.geofenceOverlaySyncing = true;
  [state.childGeofenceOverlay, state.parentGeofenceOverlay].forEach((circle) => {
    circle.setOptions({
      center: circleOptions.center,
      radius: Number(state.geofence.radius),
      strokeColor: "#5bc5ff",
      fillColor: "#5bc5ff",
    });
  });
  state.geofenceOverlaySyncing = false;
}

function updateChildLocationPanel() {
  if (!state.latestLocation) {
    elements.locationPrimary.textContent = "Location is off";
    elements.locationSecondary.textContent = "Tap share when you are ready.";
    return;
  }

  elements.locationPrimary.textContent = formatLocation(state.latestLocation);
  elements.locationSecondary.textContent = `Last shared ${formatTime(new Date(state.latestLocation.captured_at))} with ${Math.round(state.latestLocation.accuracy || 0)}m accuracy`;
}

function updateParentBoard() {
  elements.parentLocation.textContent = state.latestLocation
    ? `${formatLocation(state.latestLocation)} at ${formatTime(new Date(state.latestLocation.captured_at))}`
    : "No shared location yet";
  elements.parentCheckin.textContent = state.lastCheckin || "No check-in yet";
  elements.parentAlert.textContent = state.activeAlert || "No active alerts";
}

function updateLiveStatus() {
  const age = sharingAgeMs();
  const parentIsLive = state.isSharingLive && age <= 15000;
  const parentIsRecent = !!state.latestLocation && age <= 60000;

  elements.childLiveBanner.classList.toggle("live-mode", state.isSharingLive);
  elements.parentLiveBanner.classList.toggle("live-mode", parentIsLive);
  elements.parentLiveBanner.classList.toggle("recent-mode", !parentIsLive && parentIsRecent);

  if (state.isSharingLive) {
    elements.childLiveTitle.textContent = "Live location sharing is on";
    elements.childLiveText.textContent = "Your location updates automatically while this page stays open and permission remains allowed.";
    elements.locationStatus.textContent = "Live";
    elements.locationStatus.classList.add("live");
  } else {
    elements.childLiveTitle.textContent = "Location sharing is off";
    elements.childLiveText.textContent = "When you turn it on, the parent sees your latest shared location while this page stays open and permission remains granted.";
    if (!state.latestLocation) {
      elements.locationStatus.textContent = "Not sharing";
      elements.locationStatus.classList.remove("live");
    }
  }

  if (parentIsLive) {
    elements.parentLiveTitle.textContent = "Child location is live";
    elements.parentLiveText.textContent = `Last update ${Math.max(1, Math.round(age / 1000))} seconds ago.`;
  } else if (parentIsRecent) {
    elements.parentLiveTitle.textContent = "Recent child location available";
    elements.parentLiveText.textContent = `Last update at ${formatTime(new Date(state.latestLocation.captured_at))}. Live sharing may be paused or the child app may be backgrounded.`;
  } else {
    elements.parentLiveTitle.textContent = "Waiting for child location";
    elements.parentLiveText.textContent = "The parent view updates automatically from Supabase realtime when the child app shares location.";
  }
}

function renderAll() {
  renderContacts();
  updateChildLocationPanel();
  updateParentBoard();
  updateMapViews();
  updateLiveStatus();
  renderRiskModel();
  renderGeofence();
  renderAlertFeed();
  renderHeroMetrics();
  renderParentRefreshCadence();
  renderParentGeofenceMode();
}

async function loadProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw userError || new Error("No authenticated user");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Supabase login worked, but this user does not have a matching profile row yet.");
    }
    throw error;
  }
  state.profile = profile;
  state.role = profile.role;
  state.familyId = profile.family_id;
}

async function loadContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("family_id", state.familyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  state.contacts = data?.length
    ? data.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        route: item.phone || item.email || "",
      }))
    : defaultContacts;
}

async function loadLatestLocation() {
  const { data, error } = await supabase
    .from("live_locations")
    .select("*")
    .eq("family_id", state.familyId)
    .order("captured_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const location = data?.[0] || null;
  state.latestLocation = location;
  state.isSharingLive = Boolean(location?.is_live);
}

async function loadLatestAlert() {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("family_id", state.familyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  state.activeAlert = data?.[0]?.type ? data[0].type.replaceAll("_", " ") : "";
  if (state.activeAlert) {
    pushLocalAlert("Remote alert received", `Latest backend alert is ${state.activeAlert}.`, "high");
  }
}

function hydrateGeofence(record) {
  if (!record) {
    state.geofence = null;
    state.geofenceType = "none";
    return;
  }

  state.geofenceType = record.shape_type;
  state.geofence = {
    center: {
      latitude: Number(record.center_latitude),
      longitude: Number(record.center_longitude),
    },
    radius: Math.round(Number(record.radius_meters)),
    points: Array.isArray(record.points) ? record.points : [],
  };
  state.geofence.isInside = isInsideGeofence(state.latestLocation, state.geofence, state.geofenceType);
  elements.geofenceRadius.value = String(state.geofence.radius);
}

async function loadGeofence() {
  const { data, error } = await supabase
    .from("family_geofences")
    .select("*")
    .eq("family_id", state.familyId)
    .maybeSingle();
  if (error) throw error;
  hydrateGeofence(data);
}

async function refreshGeofenceState() {
  if (!supabase || !state.familyId) return;
  try {
    await loadGeofence();
    renderAll();
  } catch (error) {
    console.error("Failed to refresh geofence state", error);
  }
}

function stopGeofencePolling() {
  if (state.geofencePollTimer) {
    window.clearInterval(state.geofencePollTimer);
    state.geofencePollTimer = null;
  }
}

function startGeofencePolling() {
  stopGeofencePolling();
  if (!supabase || !state.familyId) return;
  state.geofencePollTimer = window.setInterval(() => {
    refreshGeofenceState().catch((error) => console.error(error));
  }, 3000);
}

async function persistGeofence() {
  if (!supabase || !state.familyId || !state.geofence) return;
  const { data, error } = await supabase
    .from("family_geofences")
    .upsert(
      {
        family_id: state.familyId,
        shape_type: state.geofenceType,
        center_latitude: state.geofence.center.latitude,
        center_longitude: state.geofence.center.longitude,
        radius_meters: state.geofence.radius,
        points: state.geofenceType === "polygon" ? state.geofence.points || [] : null,
        updated_by: state.profile?.id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "family_id" },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  hydrateGeofence(data);
}

async function clearGeofenceRecord() {
  if (!supabase || !state.familyId) return;
  const { error } = await supabase.from("family_geofences").delete().eq("family_id", state.familyId);
  if (error) throw error;
}

async function loadLatestCheckin() {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("family_id", state.familyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const checkin = data?.[0];
  state.lastCheckin = checkin
    ? checkin.checked_in_at
      ? `Checked in at ${formatTime(new Date(checkin.checked_in_at))}`
      : `Check-in ${checkin.status}`
    : "";
}

async function loadSupabaseState() {
  if (!supabase) return;
  try {
    await loadProfile();
    await Promise.all([loadContacts(), loadLatestLocation(), loadLatestAlert(), loadLatestCheckin(), loadGeofence()]);
    showRole(state.role);
    attachRealtime();
    renderAll();
    clearLoginError();
  } catch (error) {
    console.error(error);
    await supabase.auth.signOut();
    await logout();
    showLoginError(error.message || "Tracelet could reach Supabase, but account setup is incomplete.");
    throw error;
  }
}

function attachRealtime() {
  if (!supabase || !state.familyId) return;
  if (state.liveChannel) supabase.removeChannel(state.liveChannel);
  if (state.alertChannel) supabase.removeChannel(state.alertChannel);
  if (state.geofenceChannel) supabase.removeChannel(state.geofenceChannel);
  startGeofencePolling();

  state.liveChannel = supabase
    .channel(`live-${state.familyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_locations",
        filter: `family_id=eq.${state.familyId}`,
      },
      (payload) => {
        if (payload.new) {
          if (state.role === "parent" && state.parentRefreshCadenceSeconds > 0) {
            state.pendingParentLocation = payload.new;
            elements.parentMapHint.textContent = `Queued a fresh child location. Parent map will apply updates every ${state.parentRefreshCadenceSeconds} seconds.`;
          } else {
            applyIncomingLiveLocation(payload.new);
          }
        }
      },
    )
    .subscribe();

  state.geofenceChannel = supabase
    .channel(`geofences-${state.familyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "family_geofences",
        filter: `family_id=eq.${state.familyId}`,
      },
      (payload) => {
        hydrateGeofence(payload.eventType === "DELETE" ? null : payload.new);
        renderAll();
      },
    )
    .subscribe();

  state.alertChannel = supabase
    .channel(`alerts-${state.familyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "alerts",
        filter: `family_id=eq.${state.familyId}`,
      },
      (payload) => {
        if (payload.new?.type) {
          state.activeAlert = payload.new.type.replaceAll("_", " ");
          pushLocalAlert("Backend alert", `New ${state.activeAlert} event entered the stream.`, "high");
          renderAll();
        }
      },
    )
    .subscribe();
}

async function upsertLiveLocation(location, isLive) {
  const payload = {
    family_id: state.familyId,
    child_user_id: state.profile.id,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    speed: location.speed,
    heading: location.heading,
    source: "foreground",
    is_live: isLive,
    captured_at: location.captured_at,
  };
  const { error } = await supabase.from("live_locations").insert(payload);
  if (error) throw error;
}

async function setLocation(position) {
  const location = toStoredLocation(position);
  elements.mapPulse.classList.add("live");
  elements.shareLocation.disabled = true;
  elements.stopLocation.disabled = false;
  state.latestLocation = location;
  state.isSharingLive = true;
  if (state.geofence) {
    state.geofence.isInside = isInsideGeofence(location);
  }
  renderAll();
  await upsertLiveLocation(location, true);
}

function setLocationError(message) {
  elements.locationStatus.textContent = "Needs permission";
  elements.locationStatus.classList.remove("live");
  elements.locationPrimary.textContent = "Location unavailable";
  elements.locationSecondary.textContent = message;
}

async function startLocation() {
  if (!navigator.geolocation) {
    setLocationError("This browser does not support location sharing.");
    return;
  }
  if (!supabase || !state.profile) {
    setLocationError("Supabase config is not complete yet.");
    return;
  }

  elements.locationStatus.textContent = "Requesting";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation(position).catch((error) => setLocationError(error.message));
    },
    () => {
      setLocationError("Please allow location access to share with guardians.");
    },
    { enableHighAccuracy: true },
  );

  state.watchId = navigator.geolocation.watchPosition(
    (position) => {
      setLocation(position).catch((error) => setLocationError(error.message));
    },
    () => {
      setLocationError("Location sharing paused by browser permission.");
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  );
}

async function stopLocation() {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  state.isSharingLive = false;
  elements.locationStatus.textContent = "Paused";
  elements.locationStatus.classList.remove("live");
  elements.mapPulse.classList.remove("live");
  elements.locationPrimary.textContent = "Location sharing paused";
  elements.locationSecondary.textContent = "Your last shared location remains visible to the parent.";
  elements.shareLocation.disabled = false;
  elements.stopLocation.disabled = true;
  renderAll();
  if (state.latestLocation && supabase && state.profile) {
    await upsertLiveLocation(
      {
        ...state.latestLocation,
        captured_at: new Date().toISOString(),
      },
      false,
    );
  }
}

function contactSummary() {
  return state.contacts
    .map((contact) => `${contact.name} (${contact.phone || contact.email || contact.route || ""})`)
    .join(", ");
}

async function createAlert(type, payload) {
  const { error } = await supabase.from("alerts").insert({
    family_id: state.familyId,
    child_user_id: state.profile?.role === "child" ? state.profile.id : null,
    type,
    payload,
  });
  if (error) throw error;
}

async function triggerSos() {
  const locationText = state.latestLocation
    ? `${formatLocation(state.latestLocation)} - ${mapsLink(state.latestLocation)}`
    : "No shared location available.";
  const message = `SOS alert ready for: ${contactSummary()} Latest location: ${locationText}`;

  elements.sosStatus.textContent = "Alert ready";
  elements.sosMessage.textContent = message;
  elements.sosMessage.classList.remove("hidden");
  state.activeAlert = "sos";
  pushLocalAlert("SOS triggered", "Immediate help request created from the child view.", "high");
  renderAll();

  if (supabase && state.profile) {
    await createAlert("sos", { message, location: state.latestLocation });
  }

  const smsContact = state.contacts.find((contact) => /^[\d\s()+-]+$/.test(contact.phone || contact.route || ""));
  if (smsContact) {
    const smsBody = encodeURIComponent(`I need help. My location: ${locationText}`);
    window.location.href = `sms:${smsContact.phone || smsContact.route}?body=${smsBody}`;
  }
}

function renderTimer(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  elements.timerDisplay.textContent = `${minutes}:${seconds}`;
}

function clearTimer() {
  window.clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.timerEnd = null;
  elements.timerStatus.textContent = "Idle";
  elements.startTimer.disabled = false;
  elements.checkInNow.disabled = true;
}

async function startTimer() {
  const minutes = Math.min(180, Math.max(1, Number(elements.checkinMinutes.value) || 15));
  state.timerEnd = Date.now() + minutes * 60 * 1000;
  elements.timerStatus.textContent = "Running";
  elements.startTimer.disabled = true;
  elements.checkInNow.disabled = false;
  elements.missedCheckin.classList.add("hidden");

  if (supabase && state.profile) {
    await supabase.from("checkins").insert({
      family_id: state.familyId,
      child_user_id: state.profile.id,
      due_at: new Date(state.timerEnd).toISOString(),
    });
  }

  state.timerInterval = window.setInterval(async () => {
    const remaining = state.timerEnd - Date.now();
    renderTimer(remaining);
    if (remaining <= 0) {
      clearTimer();
      elements.timerStatus.textContent = "Missed";
      elements.missedCheckin.textContent = `Missed check-in alert ready for: ${contactSummary()}`;
      elements.missedCheckin.classList.remove("hidden");
      state.activeAlert = "missed checkin";
      pushLocalAlert("Missed check-in", "The check-in timer expired without confirmation.", "high");
      renderAll();
      if (supabase) await createAlert("missed_checkin", { due_at: new Date().toISOString() });
    }
  }, 250);
}

async function checkInNow() {
  clearTimer();
  const checkedInAt = new Date().toISOString();
  state.lastCheckin = `Checked in at ${formatTime(new Date(checkedInAt))}`;
  elements.timerDisplay.textContent = "00:00";
  elements.missedCheckin.classList.add("hidden");
  state.activeAlert = "";
  renderAll();

  if (supabase && state.profile) {
    const { data } = await supabase
      .from("checkins")
      .select("id")
      .eq("family_id", state.familyId)
      .eq("child_user_id", state.profile.id)
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = data?.[0];
    if (latest) {
      await supabase
        .from("checkins")
        .update({ status: "checked_in", checked_in_at: checkedInAt })
        .eq("id", latest.id);
    }
  }
}

function showRole(role) {
  state.role = role;
  setHidden(elements.loginPanel, true);
  setHidden(elements.logoutButton, false);
  setHidden(elements.childDashboard, role !== "child");
  setHidden(elements.parentDashboard, role !== "parent");
  applyParentRefreshCadence(state.parentRefreshCadenceSeconds);
  renderChildGeofenceAccess();
  clearLoginError();
}

async function setGeofenceFromCurrent() {
  if (!state.latestLocation) {
    pushLocalAlert("Geofence not set", "Share location first so Tracelet can anchor the safe zone.", "medium");
    renderAll();
    return;
  }

  const radius = Math.min(5000, Math.max(50, Number(elements.geofenceRadius.value) || 250));
  state.geofence = {
    center: {
      latitude: Number(state.latestLocation.latitude),
      longitude: Number(state.latestLocation.longitude),
    },
    radius,
    isInside: true,
  };
  state.geofenceType = "circle";
  syncGeofenceLayer();
  pushLocalAlert("Geofence armed", `Safe zone created with a ${radius}m radius.`, "medium");
  await persistGeofence();
  renderAll();
}

async function clearGeofence() {
  state.geofence = null;
  state.geofenceType = "none";
  state.polygonDraftPoints = [];
  if (state.parentPolygonDraftOverlay) {
    state.parentPolygonDraftOverlay.setMap(null);
    state.parentPolygonDraftOverlay = null;
  }
  clearGeofenceOverlays();
  await clearGeofenceRecord();
  await refreshGeofenceState();
  pushLocalAlert("Geofence cleared", "Safe zone monitoring has been turned off.", "medium");
  renderAll();
}

function activateSection(group, page) {
  $$(`.tab-button[data-page-group="${group}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  $$(`.section-page[data-page-group="${group}"]`).forEach((section) => {
    section.classList.toggle("active", section.dataset.page === page);
  });

  if (page === "map") {
    window.setTimeout(() => {
      if (window.google?.maps) {
        state.childMapInstance?.setCenter(state.childMarker?.getPosition() || state.parentGeofenceOverlay?.getCenter() || state.childMapInstance?.getCenter());
        state.parentMapInstance?.setCenter(state.parentMarker?.getPosition() || state.parentGeofenceOverlay?.getCenter() || state.parentMapInstance?.getCenter());
      }
    }, 160);
  }
}

async function logout() {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  if (state.parentRefreshTimer) {
    window.clearInterval(state.parentRefreshTimer);
    state.parentRefreshTimer = null;
  }
  stopGeofencePolling();
  if (state.childMarker) state.childMarker.setMap(null);
  if (state.parentMarker) state.parentMarker.setMap(null);
  if (state.parentPolygonDraftOverlay) state.parentPolygonDraftOverlay.setMap(null);
  clearGeofenceOverlays();
  state.profile = null;
  state.role = "";
  state.familyId = "";
  state.latestLocation = null;
  state.contacts = defaultContacts;
  state.lastCheckin = "";
  state.activeAlert = "";
  state.isSharingLive = false;
  state.geofence = null;
  state.geofenceType = "none";
  state.alertFeed = [];
  state.signalList = [];
  state.pendingParentLocation = null;
  state.polygonDraftPoints = [];
  state.parentPolygonDraftOverlay = null;
  if (state.liveChannel) supabase?.removeChannel(state.liveChannel);
  if (state.alertChannel) supabase?.removeChannel(state.alertChannel);
  if (state.geofenceChannel) supabase?.removeChannel(state.geofenceChannel);
  state.liveChannel = null;
  state.alertChannel = null;
  state.geofenceChannel = null;
  state.childMarker = null;
  state.parentMarker = null;
  elements.loginForm.reset();
  setHidden(elements.loginPanel, false);
  setHidden(elements.logoutButton, true);
  setHidden(elements.childDashboard, true);
  setHidden(elements.parentDashboard, true);
  elements.globalPresence.textContent = hasSupabaseConfig ? "Supabase linked" : "Supabase setup needed";
}

async function addContact(form) {
  const name = form.querySelector(".contact-name").value.trim();
  const route = form.querySelector(".contact-route").value.trim();
  const isEmail = route.includes("@");
  const payload = {
    family_id: state.familyId,
    name,
    phone: isEmail ? null : route,
    email: isEmail ? route : null,
  };
  const { error } = await supabase.from("contacts").insert(payload);
  if (error) throw error;
  await loadContacts();
  renderAll();
  form.reset();
}

async function removeContact(index) {
  const contact = state.contacts[index];
  if (!contact?.id || !supabase) return;
  const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
  if (error) throw error;
  await loadContacts();
  renderAll();
}

document.addEventListener("visibilitychange", () => {
  if (state.role !== "child") return;
  if (document.visibilityState === "hidden" && state.isSharingLive) {
    elements.childLiveText.textContent =
      "Live sharing works best while this page stays visible and location permission remains allowed.";
  } else if (document.visibilityState === "visible" && state.isSharingLive) {
    elements.childLiveText.textContent =
      "Your location updates automatically while this page stays open and permission remains allowed.";
    refreshGeofenceState().catch((error) => console.error(error));
  } else if (document.visibilityState === "visible") {
    refreshGeofenceState().catch((error) => console.error(error));
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    showLoginError("Add your Supabase anon key in config.js to enable auth.");
    return;
  }

  const email = elements.username.value.trim();
  const password = elements.password.value;
  clearLoginError();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showLoginError(error.message);
    return;
  }
  await loadSupabaseState().catch(() => {});
});

elements.logoutButton.addEventListener("click", async () => {
  if (supabase) await supabase.auth.signOut();
  await logout();
});
elements.themeToggle?.addEventListener("click", toggleTheme);
elements.shareLocation.addEventListener("click", () => {
  startLocation().catch((error) => setLocationError(error.message));
});
elements.stopLocation.addEventListener("click", () => {
  stopLocation().catch((error) => console.error(error));
});
elements.sosButton.addEventListener("click", () => {
  triggerSos().catch((error) => console.error(error));
});
elements.startTimer.addEventListener("click", () => {
  startTimer().catch((error) => console.error(error));
});
elements.checkInNow.addEventListener("click", () => {
  checkInNow().catch((error) => console.error(error));
});
elements.setGeofence.addEventListener("click", () => {
  setGeofenceFromCurrent().catch((error) => console.error(error));
});
elements.clearGeofence.addEventListener("click", () => {
  clearGeofence().catch((error) => console.error(error));
});
elements.geofenceRadius.addEventListener("input", () => {
  if (!state.geofence) renderGeofence();
});
elements.parentRefreshControl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-refresh-seconds]");
  if (!button) return;
  applyParentRefreshCadence(Number(button.dataset.refreshSeconds));
});
elements.parentGeofenceModeControl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-geofence-mode]");
  if (!button) return;
  setParentGeofenceMode(button.dataset.geofenceMode);
});
elements.finishPolygonButton?.addEventListener("click", () => {
  if (state.polygonDraftPoints.length >= 3) {
    applyPolygonGeofence(state.polygonDraftPoints);
  }
});
$$(".tab-button").forEach((button) => {
  button.addEventListener("click", () => activateSection(button.dataset.pageGroup, button.dataset.page));
});

$$(".contact-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addContact(form).catch((error) => console.error(error));
  });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-contact");
  if (!button) return;
  removeContact(Number(button.dataset.index)).catch((error) => console.error(error));
});

if (!hasSupabaseConfig) {
  showLoginError(
    "This build is ready for Supabase, but it still needs the anon key in config.js before login will work.",
  );
} else {
  elements.globalPresence.textContent = "Supabase linked";
}

initTheme();
initParentRefreshCadence();

let loadingTick = 0;
const loadingInterval = window.setInterval(() => {
  loadingTick = Math.min(100, loadingTick + 9);
  if (elements.progressBar) {
    elements.progressBar.style.width = `${loadingTick}%`;
  }
  if (loadingTick >= 100) {
    window.clearInterval(loadingInterval);
    window.setTimeout(() => {
      elements.loadingScreen?.classList.add("hidden");
    }, 220);
  }
}, 90);

if (supabase) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      loadSupabaseState().catch(() => {});
    } else {
      logout().catch((error) => console.error(error));
    }
  });
  window.addEventListener("beforeunload", () => subscription.unsubscribe());
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) loadSupabaseState().catch(() => {});
  });
}

window.setInterval(updateLiveStatus, 1000);
window.setInterval(() => {
  renderRiskModel();
  renderAlertFeed();
}, 1500);
renderAll();
