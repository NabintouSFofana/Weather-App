/* ============================================================
   WEATHER
   A small, honest weather app.
   Vanilla JS · no framework · no backend.
   You bring your own OpenWeatherMap key.
   ============================================================ */

(() => {
  'use strict';

  // ── Storage ────────────────────────────────────────────────
  const STORAGE_KEY_API   = 'weather.apiKey';
  const STORAGE_KEY_UNIT  = 'weather.unit';     // 'c' | 'f'
  const STORAGE_KEY_THEME = 'weather.theme';
  const STORAGE_KEY_RECENTS = 'weather.recents'; // array of strings

  // ── DOM refs ──────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const keyView         = $('keyView');
  const appView         = $('appView');
  const keyForm         = $('keyForm');
  const apiKeyInput     = $('apiKeyInput');

  const searchForm      = $('searchForm');
  const cityInput       = $('cityInput');
  const locateBtn       = $('locateBtn');
  const recents         = $('recents');
  const recentsList     = $('recentsList');

  const welcomeState    = $('welcomeState');
  const loadingState    = $('loadingState');
  const errorState      = $('errorState');
  const errorMessage    = $('errorMessage');
  const errorRetry      = $('errorRetry');
  const errorChangeKey  = $('errorChangeKey');

  const weatherResult   = $('weatherResult');
  const weatherUpdated  = $('weatherUpdated');
  const weatherSource   = $('weatherSource');
  const weatherCity     = $('weatherCity');
  const heroIcon        = $('heroIcon');
  const tempValue       = $('tempValue');
  const tempUnit        = $('tempUnit');
  const weatherCondition = $('weatherCondition');
  const feelsValue      = $('feelsValue');

  const statHumidity    = $('statHumidity');
  const statWind        = $('statWind');
  const statPressure    = $('statPressure');
  const statVisibility  = $('statVisibility');
  const statSunrise     = $('statSunrise');
  const statSunset      = $('statSunset');

  const forecastSection = $('forecastSection');
  const forecastStrip   = $('forecastStrip');

  const unitButtons     = document.querySelectorAll('.unit-btn');
  const themeToggle     = $('themeToggle');
  const changeKeyBtn    = $('changeKeyBtn');

  // ── State ─────────────────────────────────────────────────
  let unit = (localStorage.getItem(STORAGE_KEY_UNIT) || 'c'); // 'c' | 'f'
  let lastFetch = null;       // { current, forecast, source, fetchedAt }
  let lastRetryFn = null;     // callback for the "try again" button

  // ── Theme ─────────────────────────────────────────────────
  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
  }
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(getInitialTheme());

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
  });

  // ── Routing: key view vs app view ─────────────────────────
  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY_API);
  }
  function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY_API, key);
  }
  function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY_API);
  }
  function showKeyView() {
    keyView.hidden = false;
    appView.hidden = true;
    setTimeout(() => apiKeyInput.focus(), 60);
  }
  function showAppView() {
    keyView.hidden = true;
    appView.hidden = false;
    renderRecents();
    setUnit(unit, false);
    setTimeout(() => cityInput.focus(), 60);
  }

  keyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = apiKeyInput.value.trim();
    if (!key) { apiKeyInput.focus(); return; }
    setApiKey(key);
    apiKeyInput.value = '';
    showAppView();
  });

  changeKeyBtn.addEventListener('click', () => {
    clearApiKey();
    hideAllStates();
    welcomeState.hidden = false;
    showKeyView();
  });

  // ── Search ────────────────────────────────────────────────
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;
    fetchByCity(city);
  });

  locateBtn.addEventListener('click', fetchByLocation);

  // ── Recents ───────────────────────────────────────────────
  function loadRecents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_RECENTS) || '[]'); }
    catch { return []; }
  }
  function saveRecents(list) {
    localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(list));
  }
  function addRecent(city) {
    const list = loadRecents().filter(c => c.toLowerCase() !== city.toLowerCase());
    list.unshift(city);
    saveRecents(list.slice(0, 5));
    renderRecents();
  }
  function renderRecents() {
    const list = loadRecents();
    recentsList.innerHTML = '';
    if (!list.length) { recents.hidden = true; return; }
    recents.hidden = false;
    for (const city of list) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recents-chip';
      btn.textContent = city;
      btn.addEventListener('click', () => {
        cityInput.value = city;
        fetchByCity(city);
      });
      li.appendChild(btn);
      recentsList.appendChild(li);
    }
  }

  // ── Fetch helpers ─────────────────────────────────────────
  const BASE = 'https://api.openweathermap.org/data/2.5';

  async function fetchByCity(city) {
    lastRetryFn = () => fetchByCity(city);
    await runFetch({
      url: (key) => `${BASE}/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`,
      forecastUrl: (key) => `${BASE}/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=metric&cnt=8`,
      source: city,
    });
  }

  async function fetchByLocation() {
    if (!navigator.geolocation) {
      return showError("Your browser doesn't support geolocation. Try searching for a city instead.");
    }
    lastRetryFn = fetchByLocation;
    showLoading();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        await runFetch({
          url: (key) => `${BASE}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`,
          forecastUrl: (key) => `${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&cnt=8`,
          source: 'your location',
        });
      },
      (err) => {
        const msg = err.code === 1
          ? "Location permission denied. You can still search by city name."
          : "Couldn't get your location. Try searching by city.";
        showError(msg);
      },
      { timeout: 10000 }
    );
  }

  async function runFetch({ url, forecastUrl, source }) {
    const key = getApiKey();
    if (!key) { showKeyView(); return; }

    showLoading();
    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(url(key)),
        fetch(forecastUrl(key)),
      ]);

      if (currentRes.status === 401) return showAuthError();
      if (currentRes.status === 404) return showError(`Couldn't find "${cityInput.value.trim() || 'that location'}". Double-check the spelling, or try a nearby city.`);
      if (!currentRes.ok) throw new Error(`OpenWeather replied with ${currentRes.status}`);

      const current = await currentRes.json();
      const forecast = forecastRes.ok ? await forecastRes.json() : null;

      lastFetch = { current, forecast, source, fetchedAt: Date.now() };
      addRecent(current.name); // use the official name OpenWeather returns
      renderWeather();
    } catch (err) {
      console.error(err);
      showError("Network hiccup. Check your connection and try again.");
    }
  }

  // ── State display ─────────────────────────────────────────
  function hideAllStates() {
    welcomeState.hidden = true;
    loadingState.hidden = true;
    errorState.hidden = true;
    weatherResult.hidden = true;
  }
  function showLoading() {
    hideAllStates();
    loadingState.hidden = false;
  }
  function showError(msg) {
    hideAllStates();
    errorMessage.textContent = msg;
    errorState.hidden = false;
    errorRetry.hidden = !lastRetryFn;
    errorChangeKey.hidden = true;
  }
  function showAuthError() {
    hideAllStates();
    errorMessage.textContent = "Your API key isn't accepted. Double-check it, or paste a new one.";
    errorState.hidden = false;
    errorRetry.hidden = true;
    errorChangeKey.hidden = false;
  }
  errorRetry.addEventListener('click', () => { if (lastRetryFn) lastRetryFn(); });
  errorChangeKey.addEventListener('click', () => {
    clearApiKey();
    showKeyView();
  });

  // ── Render weather ────────────────────────────────────────
  function renderWeather() {
    if (!lastFetch) return;
    hideAllStates();
    weatherResult.hidden = false;

    const { current, forecast, source, fetchedAt } = lastFetch;

    weatherUpdated.textContent = `As of ${formatTime(fetchedAt)}`;
    weatherSource.textContent = source;

    const country = current.sys && current.sys.country ? `, ${current.sys.country}` : '';
    weatherCity.textContent = `${current.name}${country}`;

    const conditionMain = current.weather[0]?.main || '';
    const conditionDesc = current.weather[0]?.description || '';
    const iconCode = current.weather[0]?.icon || '01d';

    weatherCondition.textContent = conditionDesc;
    heroIcon.innerHTML = svgForIcon(iconCode);

    // temperature (always stored as °C from API, convert on display)
    renderTemps();

    // stats
    statHumidity.textContent = `${current.main.humidity}%`;
    statWind.textContent = formatWind(current.wind?.speed || 0);
    statPressure.textContent = formatPressure(current.main.pressure);
    statVisibility.textContent = formatVisibility(current.visibility);

    if (current.sys?.sunrise && current.sys?.sunset) {
      statSunrise.textContent = formatTime(current.sys.sunrise * 1000);
      statSunset.textContent  = formatTime(current.sys.sunset * 1000);
    }

    // forecast
    if (forecast && Array.isArray(forecast.list) && forecast.list.length) {
      renderForecast(forecast.list.slice(0, 8));
      forecastSection.hidden = false;
    } else {
      forecastSection.hidden = true;
    }
  }

  function renderTemps() {
    if (!lastFetch) return;
    const { current } = lastFetch;
    const temp = current.main.temp;
    const feels = current.main.feels_like;
    tempValue.textContent = Math.round(convertTemp(temp));
    tempUnit.textContent = unit === 'f' ? '°F' : '°C';
    feelsValue.textContent = `${Math.round(convertTemp(feels))}°`;
  }

  function renderForecast(list) {
    forecastStrip.innerHTML = '';
    for (const entry of list) {
      const div = document.createElement('div');
      div.className = 'forecast-cell';
      div.setAttribute('role', 'listitem');

      const time = document.createElement('span');
      time.className = 'time';
      time.textContent = formatShortTime(entry.dt * 1000);

      const iconDiv = document.createElement('div');
      iconDiv.className = 'icon';
      iconDiv.setAttribute('aria-hidden', 'true');
      iconDiv.innerHTML = svgForIcon(entry.weather[0]?.icon || '01d');

      const temp = document.createElement('span');
      temp.className = 'temp';
      temp.textContent = `${Math.round(convertTemp(entry.main.temp))}°`;

      div.append(time, iconDiv, temp);
      forecastStrip.appendChild(div);
    }
  }

  // ── Unit handling (LOCAL conversion, no re-fetch) ─────────
  unitButtons.forEach(btn => {
    btn.addEventListener('click', () => setUnit(btn.dataset.unit, true));
  });
  function setUnit(next, persist) {
    unit = next === 'f' ? 'f' : 'c';
    if (persist) localStorage.setItem(STORAGE_KEY_UNIT, unit);
    unitButtons.forEach(b => {
      const active = b.dataset.unit === unit;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-checked', String(active));
    });
    // re-render visible numbers if we have data
    if (lastFetch) {
      renderTemps();
      if (lastFetch.forecast?.list) renderForecast(lastFetch.forecast.list.slice(0, 8));
      // wind also needs re-rendering if we change from mph to m/s? we use mph/kph based on unit
      if (lastFetch.current?.wind) statWind.textContent = formatWind(lastFetch.current.wind.speed);
      if (lastFetch.current?.main?.pressure) statPressure.textContent = formatPressure(lastFetch.current.main.pressure);
      if (lastFetch.current?.visibility !== undefined) statVisibility.textContent = formatVisibility(lastFetch.current.visibility);
    }
  }

  // ── Conversions ───────────────────────────────────────────
  function convertTemp(celsius) {
    return unit === 'f' ? (celsius * 9/5) + 32 : celsius;
  }
  function formatWind(metersPerSec) {
    // metric: km/h ; imperial-aligned: mph
    if (unit === 'f') return `${Math.round(metersPerSec * 2.237)} mph`;
    return `${Math.round(metersPerSec * 3.6)} km/h`;
  }
  function formatPressure(hPa) {
    if (unit === 'f') return `${(hPa * 0.02953).toFixed(2)} inHg`;
    return `${hPa} hPa`;
  }
  function formatVisibility(meters) {
    if (meters === undefined || meters === null) return '—';
    if (unit === 'f') return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function formatTime(msOrDate) {
    return new Date(msOrDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  function formatShortTime(ms) {
    const d = new Date(ms);
    const now = new Date();
    if (Math.abs(d - now) < 90 * 60 * 1000) return 'Now';
    const opts = { hour: 'numeric' };
    return d.toLocaleTimeString([], opts).replace(' ', '').toLowerCase();
  }

  // ── SVG icons (mapped to OpenWeather icon codes) ──────────
  // Codes: 01 clear, 02 few clouds, 03 scattered, 04 broken,
  //        09 shower rain, 10 rain, 11 thunder, 13 snow, 50 mist
  // Trailing d = day, n = night
  function svgForIcon(code) {
    const isNight = code.endsWith('n');
    const base = code.slice(0, 2);

    const sun = `<circle cx="32" cy="30" r="11" fill="currentColor" opacity="0.85"/>
      <path d="M32 8 v6 M32 46 v6 M10 30 h6 M48 30 h6 M16 14 l4 4 M44 42 l4 4 M16 46 l4 -4 M44 18 l4 -4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.85"/>`;

    const moon = `<path d="M42 36 a16 16 0 1 1 -18 -22 a13 13 0 0 0 18 22 z" fill="currentColor" opacity="0.9"/>`;

    const cloud = `<path d="M18 44 q-8 0 -8 -8 q0 -7 7 -8 q1 -8 10 -8 q8 0 11 7 q9 0 9 8 q0 9 -9 9 z" fill="currentColor" opacity="0.85"/>`;

    const rain = `<path d="M22 50 l-3 6 M32 50 l-3 6 M42 50 l-3 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.85"/>`;

    const snow = `<g stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9">
      <path d="M22 52 v6 M19 55 h6"/>
      <path d="M32 50 v6 M29 53 h6"/>
      <path d="M42 52 v6 M39 55 h6"/></g>`;

    const bolt = `<path d="M30 44 L24 56 L30 54 L26 64 L40 50 L34 52 L38 44 z" fill="currentColor" opacity="0.95"/>`;

    const mist = `<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.7" fill="none">
      <line x1="10" y1="22" x2="50" y2="22"/>
      <line x1="14" y1="32" x2="54" y2="32"/>
      <line x1="8"  y1="42" x2="48" y2="42"/>
      <line x1="14" y1="52" x2="54" y2="52"/></g>`;

    const wrap = (inner) =>
      `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

    switch (base) {
      case '01': return wrap(isNight ? moon : sun);
      case '02': return wrap((isNight ? moon : sun) + cloud);
      case '03': return wrap(cloud);
      case '04': return wrap(cloud);
      case '09': return wrap(cloud + rain);
      case '10': return wrap((isNight ? moon : sun) + cloud + rain);
      case '11': return wrap(cloud + bolt);
      case '13': return wrap(cloud + snow);
      case '50': return wrap(mist);
      default:   return wrap(sun);
    }
  }

  // ── Boot ──────────────────────────────────────────────────
  if (!getApiKey()) {
    showKeyView();
  } else {
    showAppView();
    // attempt geolocation on first load (no key prompt needed)
    fetchByLocation();
  }
})();
