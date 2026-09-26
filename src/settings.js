(() => {
  "use strict";

  const STORAGE_KEY = "desk-clock:settings";
  const REVERSE_GEOCODING_URL = "https://nominatim.openstreetmap.org/reverse";
  const DEFAULT_SETTINGS = { theme: "midnight", locationId: "tokyo", currentLocation: null };
  const THEMES = ["midnight", "light"];
  const THEME_COLORS = {
    midnight: "#080b10",
    light: "#f3f5f7",
  };

  const LOCATIONS = Object.freeze({
    tokyo: { id: "tokyo", name: "東京", latitude: 35.68, longitude: 139.76, timezone: "Asia/Tokyo" },
  });

  function isValidCurrentLocation(location) {
    return (
      location?.id === "current" &&
      Number.isFinite(location.latitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      Number.isFinite(location.longitude) &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const currentLocation = isValidCurrentLocation(saved?.currentLocation)
        ? saved.currentLocation
        : null;
      const locationId = saved?.locationId === "current" && currentLocation
        ? "current"
        : LOCATIONS[saved?.locationId]
          ? saved.locationId
          : DEFAULT_SETTINGS.locationId;

      return {
        theme: THEMES.includes(saved?.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
        locationId,
        currentLocation,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  let currentSettings = loadSettings();

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch {
      // Settings remain active for this session when storage is unavailable.
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  }

  function getLocation() {
    return currentSettings.locationId === "current"
      ? currentSettings.currentLocation
      : LOCATIONS[currentSettings.locationId];
  }

  async function getLocationName(latitude, longitude) {
    const url = new URL(REVERSE_GEOCODING_URL);
    url.search = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "12",
      addressdetails: "1",
      layer: "address",
      "accept-language": "ja",
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

      const data = await response.json();
      const address = data.address ?? {};
      return (
        address.city_district ??
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.county ??
        address.state ??
        "現在地"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const dialog = document.querySelector("#settings-dialog");
  const menuButton = document.querySelector("#menu-button");
  const locationSelect = document.querySelector("#location-select");
  const locationButton = document.querySelector("#location-button");
  const locationStatus = document.querySelector("#location-status");
  const themeInputs = document.querySelectorAll('input[name="theme"]');

  Object.values(LOCATIONS).forEach((location) => {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = location.name;
    locationSelect.append(option);
  });

  function ensureCurrentLocationOption() {
    if (locationSelect.querySelector('option[value="current"]')) return;
    const option = document.createElement("option");
    option.value = "current";
    option.textContent = "現在地";
    locationSelect.prepend(option);
  }

  if (currentSettings.currentLocation) ensureCurrentLocationOption();

  locationSelect.value = currentSettings.locationId;
  const activeThemeInput = document.querySelector(
    `input[name="theme"][value="${currentSettings.theme}"]`,
  );
  if (activeThemeInput) activeThemeInput.checked = true;
  applyTheme(currentSettings.theme);

  menuButton.addEventListener("click", () => dialog.showModal());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  themeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      currentSettings = { ...currentSettings, theme: input.value };
      applyTheme(input.value);
      saveSettings();
    });
  });

  locationSelect.addEventListener("change", () => {
    currentSettings = { ...currentSettings, locationId: locationSelect.value };
    saveSettings();
    window.dispatchEvent(
      new CustomEvent("desk-clock:location-change", { detail: getLocation() }),
    );
  });

  locationButton.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      locationStatus.textContent = "このブラウザは位置情報取得に対応していません。";
      locationStatus.dataset.error = "true";
      return;
    }

    locationButton.disabled = true;
    locationStatus.textContent = "現在地を取得しています…";
    delete locationStatus.dataset.error;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        locationStatus.textContent = "地域名を確認しています…";
        let locationName = "現在地";

        try {
          locationName = await getLocationName(
            position.coords.latitude,
            position.coords.longitude,
          );
        } catch (error) {
          console.info("現在地の地域名を取得できませんでした。", error);
        }

        const currentLocation = {
          id: "current",
          name: locationName,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: "auto",
        };

        currentSettings = { ...currentSettings, locationId: "current", currentLocation };
        ensureCurrentLocationOption();
        locationSelect.value = "current";
        saveSettings();
        locationStatus.textContent = locationName === "現在地"
          ? "現在地を設定しました（地域名は取得できませんでした）。"
          : `${locationName}を設定しました。`;
        window.dispatchEvent(
          new CustomEvent("desk-clock:location-change", { detail: currentLocation }),
        );
        locationButton.disabled = false;
      },
      (error) => {
        const messages = {
          1: "位置情報の利用が許可されませんでした。",
          2: "現在地を取得できませんでした。",
          3: "位置情報の取得がタイムアウトしました。",
        };
        locationStatus.textContent = messages[error.code] ?? "現在地を取得できませんでした。";
        locationStatus.dataset.error = "true";
        locationButton.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 24 * 60 * 60 * 1000 },
    );
  });

  window.DeskClockSettings = Object.freeze({
    getLocation,
    locations: LOCATIONS,
  });
})();
