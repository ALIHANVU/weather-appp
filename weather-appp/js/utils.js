import { getState } from './state.js';
import { TIME_FORMAT, UNITS } from './constants.js';

// Форматирование времени (учитывает настройку 12/24)
export function formatTime(timestamp, options = {}) {
    if (!timestamp) return '-'; // Handle null/undefined timestamps
    const { timeFormat } = getState();
    const date = new Date(timestamp * 1000);
    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === TIME_FORMAT.H12,
    };
    // Handle potential invalid date
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('ru-RU', { ...defaultOptions, ...options });
}

// Определение дня недели
export function getDayOfWeek(timestamp, format = 'long') { // 'short', 'long'
     if (!timestamp) return '-';
    const daysLong = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const date = new Date(timestamp * 1000);
     if (isNaN(date.getTime())) return '-';
    const dayIndex = date.getDay();
    return format === 'short' ? daysShort[dayIndex] : daysLong[dayIndex];
}

// Определение сезона
export function getCurrentSeason() {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

// Описание УФ-индекса
export function getUvIndexDescription(uvIndex) {
    if (uvIndex === null || uvIndex === undefined) return '-';
    const uvi = Math.round(uvIndex);
    if (uvi <= 2) return `${uvi} (Низкий)`;
    if (uvi <= 5) return `${uvi} (Умеренный)`;
    if (uvi <= 7) return `${uvi} (Высокий)`;
    if (uvi <= 10) return `${uvi} (Очень высокий)`;
    return `${uvi} (Экстремальный)`;
}

// Конвертация скорости ветра (м/с в мили/ч или м/с)
export function formatWindSpeed(speedMps) {
     if (speedMps === null || speedMps === undefined) return '-';
    const { units } = getState();
    if (units === UNITS.IMPERIAL) {
        // м/с в мили/ч ≈ speed * 2.237
        return `${(speedMps * 2.237).toFixed(1)} миль/ч`;
    } else {
        // Оставляем м/с для метрической системы
         return `${speedMps.toFixed(1)} м/с`;
    }
}

// Форматирование видимости
export function formatVisibility(visibilityMeters) {
    if (visibilityMeters === null || visibilityMeters === undefined) return '-';
    const { units } = getState();

    if (units === UNITS.IMPERIAL) {
        // метры в мили ≈ meters / 1609.34
        const miles = visibilityMeters / 1609.34;
        // Показываем >10 миль если видимость очень большая
        return miles >= 10 ? '>10 миль' : `${miles.toFixed(1)} миль`;
    } else {
        // метры в км = meters / 1000
        const km = visibilityMeters / 1000;
         // Показываем >10 км если видимость очень большая (стандарт для OWM)
        return km >= 10 ? '>10 км' : `${km.toFixed(1)} км`;
    }
}

// Форматирование температуры
export function formatTemperature(temp) {
     if (temp === null || temp === undefined) return '-°';
     return `${Math.round(temp)}°`;
}

// Получение иконки Emoji
const weatherEmojiMap = {
    "01d": "☀️", "01n": "🌙", "02d": "⛅", "02n": "☁️", "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️", "09d": "🌧️", "09n": "🌧️", "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️", "13d": "🌨️", "13n": "🌨️", "50d": "🌫️", "50n": "🌫️"
};

export function getWeatherEmoji(iconCode) {
    return weatherEmojiMap[iconCode] || '❓'; // Возвращаем '?' если кода нет
}

// Форматирование времени последнего обновления
export function formatLastUpdateTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diffSeconds = Math.round((now - timestamp) / 1000);

    if (diffSeconds < 5) return 'Обновлено только что';
    if (diffSeconds < 60) return `Обновлено ${diffSeconds} сек. назад`;

    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `Обновлено ${diffMinutes} мин. назад`;

    // Если прошло больше часа, показываем время
    return `Обновлено в ${formatTime(timestamp / 1000)}`; // Делим timestamp на 1000 для formatTime
}