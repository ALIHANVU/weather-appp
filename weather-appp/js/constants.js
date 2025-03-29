// --- ВАЖНО: ЗАМЕНИТЕ URL ВАШЕГО РАБОТАЮЩЕГО ПРОКСИ-СЕРВЕРА! ---
// Это может быть URL Cloudflare Worker, Netlify/Vercel функции и т.д.
// Пример: '/api' если прокси настроен на том же домене через rewrite/proxy pass
// Или абсолютный URL: 'https://my-weather-proxy.example.com'
export const PROXY_API_URL = '/api'; // <---- ЗАМЕНИТЕ ЭТО НА ВАШ РЕАЛЬНЫЙ URL ПРОКСИ!
// -------------------------------------------------------------

// НЕ ХРАНИТЕ API КЛЮЧ ЗДЕСЬ ИЛИ ГДЕ-ЛИБО В КЛИЕНТСКОМ КОДЕ!

export const DEFAULT_CITY = 'Москва';
export const LOCALSTORAGE_STATE_KEY = 'weatherAppState_v4'; // Обновлена версия ключа
// Пути к farmer-tips.json
export const TIPS_JSON_URL = 'https://alihanvu.github.io/weather-app/farmer-tips.json'; // URL основного файла советов
export const TIPS_JSON_FALLBACK_URL = 'farmer-tips.json'; // Относительный путь для fallback

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
