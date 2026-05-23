# 🌤️ Weather App

> A small, honest weather app — built by hand in HTML, CSS, and vanilla JavaScript.
> Talks to [OpenWeatherMap](https://openweathermap.org). No framework. No backend. No tracking.

## Screenshot
<img width="971" height="794" alt="image" src="https://github.com/user-attachments/assets/86fafd65-b038-450e-b077-173f58be3780" />

<img width="959" height="842" alt="image" src="https://github.com/user-attachments/assets/e456dbe8-ef90-4014-8a6e-68ffe17f3b6e" />

---

## The idea

This was my first real conversation with someone else's API.

It started out as the classic beginner weather widget — type a city, see the temperature. It worked, but it didn't say much. Most weather apps don't. They give you a number and call it a day. I wanted something that **doesn't bury the lede**: a giant editorial temperature, a structured view of the things people actually look up (feels-like, humidity, wind, sunrise, sunset), and a calm strip of what's coming in the next 24 hours.

It also doubles as a small lesson I'm glad I learned out loud: how to handle API keys honestly when there's no backend to hide them behind.

---

## What's inside

A single page. Three local files. Zero dependencies.

- **Bring your own key.** First-run flow asks for your free [OpenWeatherMap](https://openweathermap.org/api) key and stores it in your browser only. Nothing leaves your machine except the calls to OpenWeather itself.
- **Editorial layout.** A huge italic-serif temperature, the condition in lowercase italics ("scattered clouds"), and a clean grid of six stats: humidity, wind, pressure, visibility, sunrise, sunset.
- **Next 24 hours.** A horizontal strip of eight forecast points (one every three hours), each with its own time, custom SVG weather icon, and temperature.
- **Search or locate.** Type a city, or hit the locate button to use your browser's geolocation.
- **°C ↔ °F, locally.** The toggle converts the displayed numbers in your browser — no wasted API calls. Wind, pressure, and visibility units flip with it (mph + inHg + mi vs. km/h + hPa + km).
- **Recent searches.** Your last five cities show up as chips; tap one to re-fetch.
- **Real states.** Loading shows a spinner with *"Fetching from openweathermap.org…"*. Errors say what went wrong (`401` → "your key isn't accepted", `404` → "couldn't find that, check the spelling", network → "try again").
- **Dark mode.** Respects your system preference on first visit, then remembers your choice.
- **Custom SVG weather icons** mapped from OpenWeather's icon codes — day/night aware, drawn to fit the cream-and-rust palette.

---

## Why bring-your-own-key

The honest reason: **the first version of this app had my OpenWeather key committed to the repo.** Anyone browsing the source could copy it and burn through my free-tier rate limit. That's one of the most common security mistakes beginner devs make, and I made it.

The fix isn't to hide the key in a public repo (you can't — it's a static site, the browser always sees it). The fix is to either run a backend that holds the key, *or* let each visitor bring their own. This app picks the second option:

- Your key never lives in this repo's source code
- Your key never gets shared or transmitted anywhere except OpenWeather itself
- You control your own rate limit
- The app explains all of this on first run

A real production app would put this behind a backend or a Cloudflare Worker. For a learning project on GitHub Pages, BYO is the honest pattern.

---

## Tech

- **HTML5** — semantic landmarks, real form/button elements, ARIA where it matters
- **CSS3** — custom properties, system-pref dark mode, grain texture, variable-font typography
- **Vanilla JavaScript** — single IIFE, `fetch`, `async/await`, `Promise.all` to fan out current + forecast calls in parallel

Endpoints used (both on OpenWeather's free tier):

```
GET /data/2.5/weather   ← current conditions
GET /data/2.5/forecast  ← 3-hour / 5-day forecast (we use first 8 = next 24h)
```

Storage keys in `localStorage`:

```
weather.apiKey   ← your key, only your key, only your browser
weather.unit     ← 'c' | 'f'
weather.theme    ← 'light' | 'dark'
weather.recents  ← last 5 city names
```

---

## Run it locally

```bash
git clone https://github.com/NabintouSFofana/Weather-App.git
cd Weather-App
open index.html
```

Or just double-click `index.html`. You'll be asked for your OpenWeatherMap key on first load — get a free one [here](https://home.openweathermap.org/users/sign_up) (no credit card, 60 requests per minute).

---

## What I learned

The technical parts are honest beginner-to-intermediate territory: `fetch`, promises, geolocation, async error handling, parallel requests with `Promise.all`, browser storage, and converting between units locally instead of round-tripping the API every time.

The lesson that mattered more was about **honesty in interface**. The first version of this app told users almost nothing: where the data came from, how fresh it was, whether the key was theirs or mine, what would happen if they typed a misspelled city. Quiet failure modes feel unprofessional. The rebuild tells you, in plain English, that the data is from OpenWeatherMap, that it was just fetched, that your key lives only in your browser, and what to do if something goes wrong. That's not a feature — that's a posture.

I also learned, the hard way, **never to commit a secret to a public repo.** If you ever need a reminder, search `OpenWeather API key` on GitHub. It's a graveyard.

---

## Roadmap

If I come back to this with more time:

- 5-day daily forecast (rolled up from the 3-hour endpoint)
- Air quality index (OpenWeather has a free endpoint for it)
- UV index
- Hourly precipitation probability
- A small inline map showing your location
- Service worker for offline last-known weather

---

## Author

**Nabintou S. Fofana**
Software engineering student · front-end developer
[Portfolio](https://nabintousfofana.github.io/portfolio/) · [GitHub](https://github.com/NabintouSFofana) · [LinkedIn](https://www.linkedin.com/in/nabintousfofana)
