// Replace with your actual OpenWeatherMap API key
const API_KEY = '03456218af24fca50ae86e1f566a0359';

const getWeatherBtn = document.getElementById("getWeatherBtn");
const cityInput = document.getElementById("cityInput");
const result = document.getElementById("result");
const darkToggle = document.getElementById("darkModeToggle");
const unitToggle = document.getElementById("unitToggle");
const clearBtn = document.getElementById("clearBtn");

let isFahrenheit = false;

// Handle °C / °F toggle
unitToggle.addEventListener("change", () => {
  isFahrenheit = unitToggle.checked;

  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherByCity(city); // Re-fetch weather with new unit
  } else {
    fetchWeatherByLocation(); // Optional: also re-fetch location-based weather
  }
});

// Get weather when user clicks "Get Weather"
getWeatherBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    result.textContent = "❗ Please enter a city name.";
    return;
  }
  fetchWeatherByCity(city);
});

// Fetch weather by city name
function fetchWeatherByCity(city) {
  const unit = isFahrenheit ? "imperial" : "metric";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("City not found");
      return res.json();
    })
    .then(data => displayWeather(data))
    .catch(err => {
      result.textContent = `❌ ${err.message}`;
    });
}

// Fetch weather using geolocation
function fetchWeatherByLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const unit = isFahrenheit ? "imperial" : "metric";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`;

    fetch(url)
      .then(res => res.json())
      .then(data => displayWeather(data))
      .catch(() => {
        result.textContent = "❌ Couldn't get your location weather.";
      });
  });
}

// Display the weather data on screen
function displayWeather(data) {
  const temp = data.main.temp;
  const desc = data.weather[0].description;
  const city = data.name;
  const unitSymbol = isFahrenheit ? "°F" : "°C";
  result.innerHTML = `📍 ${city}<br/>🌡️ ${temp}${unitSymbol}<br/>☁️ ${desc}`;
}

// Toggle dark mode with local storage memory
darkToggle.addEventListener("change", () => {
  if (darkToggle.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("weatherDarkMode", "enabled");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("weatherDarkMode", "disabled");
  }
});

// Clear city input and weather result
clearBtn.addEventListener("click", () => {
  cityInput.value = "";
  result.innerHTML = "";
});

// On load: get location weather & dark mode preference
window.addEventListener("load", () => {
  fetchWeatherByLocation();

  if (localStorage.getItem("weatherDarkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    darkToggle.checked = true;
  }
});
