// --- ВАЖНО: ЗАМЕНИТЕ URL ВАШЕГО РАБОТАЮЩЕГО ПРОКСИ-СЕРВЕРА! ---
// Это может быть URL Cloudflare Worker, Netlify/Vercel функции и т.д.
// Пример: '/api' если прокси настроен на том же домене через rewrite/proxy pass
// Или абсолютный URL: 'https://my-weather-proxy.example.com' (без /api в конце, если пути настроены в api.js)
// Или абсолютный URL с путем: 'https://my-weather-proxy.example.com/weather-api'
export const PROXY_API_URL = '/api'; // <---- ЗАМЕНИТЕ ЭТО НА ВАШ РЕАЛЬНЫЙ URL ПРОКСИ!
// -------------------------------------------------------------

// НЕ ХРАНИТЕ API КЛЮЧ ЗДЕСЬ ИЛИ ГДЕ-ЛИБО В КЛИЕНТСКОМ КОДЕ!

export const DEFAULT_CITY = 'Москва';
export const LOCALSTORAGE_STATE_KEY = 'weatherAppState_v3'; // Обновил ключ
// Пути к farmer-tips.json (относительно корня сайта)
export const TIPS_JSON_URL = 'https://alihanvu.github.io/weather-app/farmer-tips.json'; // Используйте этот или ваш путь
export const TIPS_JSON_FALLBACK_URL = '/farmer-tips.json';

// Настройки
export const UNITS = { METRIC: 'metric', IMPERIAL: 'imperial' };
export const TIME_FORMAT = { H24: '24', H12: '12' };

// Параметры
export const SEARCH_DEBOUNCE_DELAY = 500; // ms
export const MIN_SEARCH_LENGTH = 2;
export const MAX_HOURLY_FORECAST_ITEMS = 24;
export const MAX_DAILY_FORECAST_ITEMS = 7;
export const MAX_FARMER_TIPS_DISPLAYED = 5;
export const GEOLOCATION_TIMEOUT = 10000; // ms