const defaultContacts = [{ name: "Emergency contact", route: "9930679739" }];
const apiBase = window.CIRCLESAFE_API_BASE || "";

const state = {
  role: "",
  watchId: null,
  latestLocation: null,
  contacts: defaultContacts,
  lastCheckin: "",
  timerEnd: null,
  timerInterval: null,
  activeAlert: "",
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  loginPanel: $("loginPanel"),
  loginForm: $("loginForm"),
  username: $("username"),
  password: $("password"),
  loginError: $("loginError"),
  logoutButton: $("logoutButton"),
  childDashboard: $("childDashboard"),
  parentDashboard: $("parentDashboard"),
  locationStatus: $("locationStatus"),
  locationPrimary: $("locationPrimary"),
  locationSecondary: $("locationSecondary"),
  mapPulse: $("mapPulse"),
  shareLocation: $("shareLocation"),
  stopLocation: $("stopLocation"),
  childMap: $("childMap"),
  parentMap: $("parentMap"),
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
};

async function loadSharedState() {
  try {
    const response = await fetch(`${apiBase}/api/state`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return;
    applySharedState(await response.json());
  } catch {
    renderAll();
  }
}

async function saveSharedState(patch) {
  Object.assign(state, patch);
  renderAll();
  try {
    const response = await fetch(`${apiBase}/api/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        latestLocation: state.latestLocation,
        contacts: state.contacts,
        lastCheckin: state.lastCheckin,
        activeAlert: state.activeAlert,
        ...patch,
      }),
    });
    if (response.ok) applySharedState(await response.json());
  } catch {
    renderAll();
  }
}

function applySharedState(shared) {
  state.latestLocation = shared.latestLocation || null;
  state.contacts = shared.contacts?.length ? shared.contacts : defaultContacts;
  state.lastCheckin = shared.lastCheckin || "";
  state.activeAlert = shared.activeAlert || "";
  renderAll();
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function toStoredLocation(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    updatedAt: new Date().toISOString(),
  };
}

function formatLocation(location) {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function mapsLink(location) {
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}

function mapEmbedUrl(location) {
  const delta = 0.006;
  const left = location.longitude - delta;
  const right = location.longitude + delta;
  const top = location.latitude + delta;
  const bottom = location.latitude - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
}

function setHidden(element, hidden) {
  element.classList.toggle("hidden", hidden);
}

function renderContacts() {
  $$(".contact-count").forEach((count) => {
    count.textContent = `${state.contacts.length} saved`;
  });

  $$(".contact-list").forEach((list) => {
    list.innerHTML = "";
    state.contacts.forEach((contact, index) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <span><strong>${contact.name}</strong><br><small>${contact.route}</small></span>
        <button class="remove-contact" aria-label="Remove ${contact.name}" data-index="${index}">x</button>
      `;
      list.append(item);
    });
  });
}

function updateMapViews() {
  const links = [elements.childMapLink, elements.parentMapLink];
  const frames = [elements.childMap, elements.parentMap];

  if (!state.latestLocation) {
    frames.forEach((frame) => frame.removeAttribute("src"));
    links.forEach((link) => {
      link.href = "#";
      link.classList.add("disabled");
    });
    elements.childMapHint.textContent = "The map appears after location is shared.";
    elements.parentMapHint.textContent = "Waiting for the child to share location.";
    return;
  }

  const url = mapEmbedUrl(state.latestLocation);
  frames.forEach((frame) => {
    frame.src = url;
  });
  links.forEach((mapLinkElement) => {
    mapLinkElement.href = mapsLink(state.latestLocation);
    mapLinkElement.classList.remove("disabled");
  });
  const updated = formatTime(new Date(state.latestLocation.updatedAt));
  elements.childMapHint.textContent = `Map updated ${updated}.`;
  elements.parentMapHint.textContent = `Map updated ${updated}.`;
}

function updateChildLocationPanel() {
  if (!state.latestLocation) {
    elements.locationPrimary.textContent = "Location is off";
    elements.locationSecondary.textContent = "Tap share when you are ready.";
    return;
  }

  elements.locationPrimary.textContent = formatLocation(state.latestLocation);
  elements.locationSecondary.textContent = `Last shared ${formatTime(new Date(state.latestLocation.updatedAt))} with ${state.latestLocation.accuracy}m accuracy`;
}

function updateParentBoard() {
  elements.parentLocation.textContent = state.latestLocation
    ? `${formatLocation(state.latestLocation)} at ${formatTime(new Date(state.latestLocation.updatedAt))}`
    : "No shared location yet";
  elements.parentCheckin.textContent = state.lastCheckin || "No check-in yet";
  elements.parentAlert.textContent = state.activeAlert || "No active alerts";
}

function renderAll() {
  renderContacts();
  updateChildLocationPanel();
  updateParentBoard();
  updateMapViews();
}

function setLocation(position) {
  const location = toStoredLocation(position);
  elements.locationStatus.textContent = "Sharing";
  elements.locationStatus.classList.add("live");
  elements.mapPulse.classList.add("live");
  elements.shareLocation.disabled = true;
  elements.stopLocation.disabled = false;
  saveSharedState({ latestLocation: location });
}

function setLocationError(message) {
  elements.locationStatus.textContent = "Needs permission";
  elements.locationStatus.classList.remove("live");
  elements.locationPrimary.textContent = "Location unavailable";
  elements.locationSecondary.textContent = message;
}

function startLocation() {
  if (!navigator.geolocation) {
    setLocationError("This browser does not support location sharing.");
    return;
  }

  elements.locationStatus.textContent = "Requesting";
  navigator.geolocation.getCurrentPosition(setLocation, () => {
    setLocationError("Please allow location access to share with guardians.");
  });

  state.watchId = navigator.geolocation.watchPosition(setLocation, () => {
    setLocationError("Location sharing paused by browser permission.");
  });
}

function stopLocation() {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  elements.locationStatus.textContent = "Not sharing";
  elements.locationStatus.classList.remove("live");
  elements.mapPulse.classList.remove("live");
  elements.locationPrimary.textContent = "Location sharing paused";
  elements.locationSecondary.textContent = "Your last shared location remains visible to the parent.";
  elements.shareLocation.disabled = false;
  elements.stopLocation.disabled = true;
}

function contactSummary() {
  return state.contacts.map((contact) => `${contact.name} (${contact.route})`).join(", ");
}

function triggerSos() {
  const locationText = state.latestLocation
    ? `${formatLocation(state.latestLocation)} - ${mapsLink(state.latestLocation)}`
    : "No shared location available.";
  const message = `SOS alert ready for: ${contactSummary()} Latest location: ${locationText}`;

  elements.sosStatus.textContent = "Alert ready";
  elements.sosMessage.textContent = message;
  elements.sosMessage.classList.remove("hidden");
  saveSharedState({ activeAlert: "SOS alert prepared" });

  const smsContact = state.contacts.find((contact) => /^[\d\s()+-]+$/.test(contact.route));
  if (smsContact) {
    const smsBody = encodeURIComponent(`I need help. My location: ${locationText}`);
    window.location.href = `sms:${smsContact.route}?body=${smsBody}`;
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

function startTimer() {
  const minutes = Math.min(180, Math.max(1, Number(elements.checkinMinutes.value) || 15));
  state.timerEnd = Date.now() + minutes * 60 * 1000;
  elements.timerStatus.textContent = "Running";
  elements.startTimer.disabled = true;
  elements.checkInNow.disabled = false;
  elements.missedCheckin.classList.add("hidden");
  saveSharedState({ activeAlert: "" });

  state.timerInterval = window.setInterval(() => {
    const remaining = state.timerEnd - Date.now();
    renderTimer(remaining);
    if (remaining <= 0) {
      clearTimer();
      elements.timerStatus.textContent = "Missed";
      elements.missedCheckin.textContent = `Missed check-in alert ready for: ${contactSummary()}`;
      elements.missedCheckin.classList.remove("hidden");
      saveSharedState({ activeAlert: "Missed check-in" });
    }
  }, 250);
}

function checkInNow() {
  clearTimer();
  const lastCheckin = `Checked in at ${formatTime(new Date())}`;
  elements.timerDisplay.textContent = "00:00";
  elements.missedCheckin.classList.add("hidden");
  saveSharedState({ lastCheckin, activeAlert: "" });
}

function showRole(role) {
  state.role = role;
  setHidden(elements.loginPanel, true);
  setHidden(elements.logoutButton, false);
  setHidden(elements.childDashboard, role !== "child");
  setHidden(elements.parentDashboard, role !== "parent");
  elements.loginError.classList.add("hidden");
  loadSharedState();
}

function logout() {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.role = "";
  state.watchId = null;
  elements.loginForm.reset();
  setHidden(elements.loginPanel, false);
  setHidden(elements.logoutButton, true);
  setHidden(elements.childDashboard, true);
  setHidden(elements.parentDashboard, true);
}

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = elements.username.value.trim().toLowerCase();
  const password = elements.password.value;

  fetch(`${apiBase}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Login failed");
      return response.json();
    })
    .then((account) => showRole(account.role))
    .catch(() => {
      elements.loginError.textContent = "That username or password does not match a demo account.";
      elements.loginError.classList.remove("hidden");
    });
});

elements.logoutButton.addEventListener("click", () => {
  fetch(`${apiBase}/api/logout`, {
    method: "POST",
    credentials: "include",
  }).finally(logout);
});
elements.shareLocation.addEventListener("click", startLocation);
elements.stopLocation.addEventListener("click", stopLocation);
elements.sosButton.addEventListener("click", triggerSos);
elements.startTimer.addEventListener("click", startTimer);
elements.checkInNow.addEventListener("click", checkInNow);

$$(".contact-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.querySelector(".contact-name").value.trim();
    const route = form.querySelector(".contact-route").value.trim();
    saveSharedState({ contacts: [...state.contacts, { name, route }] });
    form.reset();
  });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-contact");
  if (!button) return;
  const nextContacts = state.contacts.filter((_, index) => index !== Number(button.dataset.index));
  saveSharedState({ contacts: nextContacts.length ? nextContacts : defaultContacts });
});

window.setInterval(loadSharedState, 2500);
loadSharedState();
