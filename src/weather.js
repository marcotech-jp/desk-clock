(() => {
  "use strict";

  const UPDATE_INTERVAL = 30 * 60 * 1000;
  const REQUEST_TIMEOUT = 10 * 1000;
  const CACHE_KEY_PREFIX = "desk-clock:weather:";

  const weatherElement = document.querySelector("#weather");
  const locationElement = document.querySelector("#weather-location");
  const weatherCurrent = document.querySelector("#weather-current");
  const iconElement = document.querySelector("#weather-icon");
  const descriptionElement = document.querySelector("#weather-description");
  const temperatureElement = document.querySelector("#weather-temperature");
  const todayHighElement = document.querySelector("#today-high");
  const todayLowElement = document.querySelector("#today-low");
  const tomorrowIconElement = document.querySelector("#tomorrow-icon");
  const tomorrowDescriptionElement = document.querySelector("#tomorrow-description");
  const tomorrowHighElement = document.querySelector("#tomorrow-high");
  const tomorrowLowElement = document.querySelector("#tomorrow-low");
  const hourlyForecastElement = document.querySelector("#hourly-forecast");
  const statusElement = document.querySelector("#status");
  let currentController = null;

  const WEATHER_CODES = [
    { codes: [0], icon: "☀", label: "快晴" },
    { codes: [1], icon: "☀", label: "晴れ" },
    { codes: [2], icon: "☁", label: "一部曇り" },
    { codes: [3], icon: "☁", label: "曇り" },
    { codes: [45, 48], icon: "≋", label: "霧" },
    { codes: [51, 53, 55, 56, 57], icon: "☂", label: "霧雨" },
    { codes: [61, 63, 65, 66, 67, 80, 81, 82], icon: "☂", label: "雨" },
    { codes: [71, 73, 75, 77, 85, 86], icon: "❄", label: "雪" },
    { codes: [95, 96, 99], icon: "ϟ", label: "雷雨" },
  ];

  function getWeatherDisplay(code) {
    return WEATHER_CODES.find((weather) => weather.codes.includes(code)) ?? {
      icon: "•",
      label: "不明",
    };
  }

  function buildWeatherUrl(location) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,weather_code",
      hourly: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      forecast_days: "2",
      forecast_hours: "10",
      timezone: location.timezone ?? "auto",
    });
    return url;
  }

  function setHourlyMessage(message) {
    const title = document.createElement("span");
    title.className = "hourly__title";
    title.textContent = "このあと";
    const item = document.createElement("span");
    item.className = "hourly__item";
    item.textContent = message;
    hourlyForecastElement.replaceChildren(title, item);
  }

  function renderHourlyForecast(hourlyItems) {
    const title = document.createElement("span");
    title.className = "hourly__title";
    title.textContent = "このあと";
    const accessibleItems = [];
    const elements = hourlyItems.map((item) => {
      const display = getWeatherDisplay(item.code);
      const hour = Number(item.time.slice(11, 13));
      const temperature = Math.round(item.temperature);
      const element = document.createElement("span");
      element.className = "hourly__item";

      const time = document.createElement("span");
      time.textContent = `${hour}時`;
      const icon = document.createElement("span");
      icon.className = "hourly__icon";
      icon.textContent = display.icon;
      icon.setAttribute("aria-hidden", "true");
      const temperatureElement = document.createElement("span");
      temperatureElement.className = "hourly__temperature";
      temperatureElement.textContent = `${temperature}°`;

      element.append(time, icon, temperatureElement);
      accessibleItems.push(`${hour}時、${display.label}、${temperature}度`);
      return element;
    });

    hourlyForecastElement.replaceChildren(title, ...elements);
    hourlyForecastElement.setAttribute(
      "aria-label",
      `このあとの天気。${accessibleItems.join("。")}`,
    );
  }

  function renderWeather(weather, location, isCached = false) {
    const display = getWeatherDisplay(weather.code);
    const tomorrowDisplay = getWeatherDisplay(weather.tomorrow.code);
    const temperature = Math.round(weather.temperature);
    const todayHigh = Math.round(weather.today.max);
    const todayLow = Math.round(weather.today.min);
    const tomorrowHigh = Math.round(weather.tomorrow.max);
    const tomorrowLow = Math.round(weather.tomorrow.min);

    locationElement.textContent = location.name;
    iconElement.textContent = display.icon;
    descriptionElement.textContent = display.label;
    temperatureElement.textContent = `${temperature}°C`;
    todayHighElement.textContent = `最高 ${todayHigh}°`;
    todayLowElement.textContent = `最低 ${todayLow}°`;
    tomorrowIconElement.textContent = tomorrowDisplay.icon;
    tomorrowDescriptionElement.textContent = tomorrowDisplay.label;
    tomorrowHighElement.textContent = `最高 ${tomorrowHigh}°`;
    tomorrowLowElement.textContent = `最低 ${tomorrowLow}°`;
    renderHourlyForecast(weather.hourly);
    weatherCurrent.setAttribute(
      "aria-label",
      `${display.label}、現在の気温 ${temperature}度${isCached ? "、保存された情報" : ""}`,
    );
    weatherElement.setAttribute(
      "aria-label",
      `${location.name}、現在は${display.label}で${temperature}度。今日の最高気温${todayHigh}度、最低気温${todayLow}度。明日は${tomorrowDisplay.label}、最高気温${tomorrowHigh}度、最低気温${tomorrowLow}度。`,
    );
    const cachedNotice = "保存された天気情報を表示しています";
    statusElement.textContent = isCached ? cachedNotice : "";
    if (isCached) {
      window.setTimeout(() => {
        if (statusElement.textContent === cachedNotice) statusElement.textContent = "";
      }, 5000);
    }
  }

  function getCachedWeather(locationId) {
    try {
      const cached = JSON.parse(localStorage.getItem(`${CACHE_KEY_PREFIX}${locationId}`));
      return (
        Number.isFinite(cached?.temperature) &&
        Number.isInteger(cached?.code) &&
        Number.isFinite(cached?.today?.max) &&
        Number.isFinite(cached?.today?.min) &&
        Number.isInteger(cached?.tomorrow?.code) &&
        Number.isFinite(cached?.tomorrow?.max) &&
        Number.isFinite(cached?.tomorrow?.min) &&
        Array.isArray(cached?.hourly) &&
        cached.hourly.length > 0 &&
        cached.hourly.every(
          (item) =>
            typeof item?.time === "string" &&
            Number.isFinite(item?.temperature) &&
            Number.isInteger(item?.code),
        )
      )
        ? cached
        : null;
    } catch {
      return null;
    }
  }

  function cacheWeather(weather, locationId) {
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}${locationId}`, JSON.stringify(weather));
    } catch {
      // Storage may be unavailable in private browsing; live weather still works.
    }
  }

  function showLoading(location) {
    const cachedWeather = getCachedWeather(location.id);
    locationElement.textContent = location.name;
    weatherElement.setAttribute("aria-label", `${location.name}の現在の天気`);

    if (cachedWeather) {
      renderWeather(cachedWeather, location, true);
    } else {
      iconElement.textContent = "--";
      descriptionElement.textContent = "天気を取得中";
      temperatureElement.textContent = "--°C";
      todayHighElement.textContent = "最高 --°";
      todayLowElement.textContent = "最低 --°";
      tomorrowIconElement.textContent = "--";
      tomorrowDescriptionElement.textContent = "--";
      tomorrowHighElement.textContent = "最高 --°";
      tomorrowLowElement.textContent = "最低 --°";
      setHourlyMessage("取得中");
      statusElement.textContent = "";
    }
  }

  async function updateWeather() {
    const location = window.DeskClockSettings.getLocation();
    currentController?.abort();
    currentController = new AbortController();
    const controller = currentController;

    weatherCurrent.dataset.loading = "true";
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildWeatherUrl(location), {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const data = await response.json();
      const hourly = (data.hourly?.time ?? [])
        .map((time, index) => ({
          time,
          temperature: Number(data.hourly?.temperature_2m?.[index]),
          code: Number(data.hourly?.weather_code?.[index]),
        }))
        .filter((item) => item.time > data.current?.time)
        .filter((_item, index) => index % 2 === 0)
        .slice(0, 4);
      const weather = {
        temperature: Number(data.current?.temperature_2m),
        code: Number(data.current?.weather_code),
        today: {
          max: Number(data.daily?.temperature_2m_max?.[0]),
          min: Number(data.daily?.temperature_2m_min?.[0]),
        },
        tomorrow: {
          code: Number(data.daily?.weather_code?.[1]),
          max: Number(data.daily?.temperature_2m_max?.[1]),
          min: Number(data.daily?.temperature_2m_min?.[1]),
        },
        hourly,
        updatedAt: Date.now(),
      };

      if (
        !Number.isFinite(weather.temperature) ||
        !Number.isInteger(weather.code) ||
        !Number.isFinite(weather.today.max) ||
        !Number.isFinite(weather.today.min) ||
        !Number.isInteger(weather.tomorrow.code) ||
        !Number.isFinite(weather.tomorrow.max) ||
        !Number.isFinite(weather.tomorrow.min) ||
        weather.hourly.length === 0 ||
        weather.hourly.some(
          (item) => !Number.isFinite(item.temperature) || !Number.isInteger(item.code),
        )
      ) {
        throw new Error("Open-Meteoから予期しない応答を受け取りました。");
      }

      if (window.DeskClockSettings.getLocation().id !== location.id) return;

      renderWeather(weather, location);
      cacheWeather(weather, location.id);
    } catch (error) {
      if (error.name === "AbortError" && currentController !== controller) return;

      console.info("天気情報を更新できませんでした。", error);
      const cachedWeather = getCachedWeather(location.id);

      if (cachedWeather) {
        renderWeather(cachedWeather, location, true);
      } else {
        iconElement.textContent = "--";
        descriptionElement.textContent = "取得できません";
        temperatureElement.textContent = "--°C";
        todayHighElement.textContent = "最高 --°";
        todayLowElement.textContent = "最低 --°";
        tomorrowIconElement.textContent = "--";
        tomorrowDescriptionElement.textContent = "--";
        tomorrowHighElement.textContent = "最高 --°";
        tomorrowLowElement.textContent = "最低 --°";
        setHourlyMessage("取得できません");
        statusElement.textContent = "天気情報を取得できませんでした";
      }
    } finally {
      clearTimeout(timeoutId);
      if (currentController === controller) {
        delete weatherCurrent.dataset.loading;
        currentController = null;
      }
    }
  }

  showLoading(window.DeskClockSettings.getLocation());

  window.addEventListener("desk-clock:location-change", (event) => {
    showLoading(event.detail);
    updateWeather();
  });

  updateWeather();
  window.setInterval(updateWeather, UPDATE_INTERVAL);
})();
