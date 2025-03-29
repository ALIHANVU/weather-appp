import { getState } from './state.js';
import { TIME_FORMAT, UNITS } from './constants.js';

// Форматирование времени (учитывает настройку 12/24)
export function formatTime(timestamp, options = {}) {
    if (!timestamp && timestamp !== 0) return '-';
    const { timeFormat } = getState();
    const date = new Date(timestamp * 1000);
    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === TIME_FORMAT.H12,
    };
    if (isNaN(date.getTime())) return '-';
    try {
        return date.toLocaleTimeString('ru-RU', { ...defaultOptions, ...options });
    } catch (e) {
        console.error("Ошибка форматирования времени:", e);
        return '-';
    }
}

// Определение дня недели
export function getDayOfWeek(timestamp, format = 'long') {
     if (!timestamp && timestamp !== 0) return '-';
    const daysLong = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const date = new Date(timestamp * 1000);
     if (isNaN(date.getTime())) return '-';
    const dayIndex = date.getDay();
    try {
        return format === 'short' ? daysShort[dayIndex] : daysLong[dayIndex];
    } catch (e) {
        console.error("Ошибка получения дня недели:", e);
        return '-';
    }
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
    if (uvi < 0) return '-'; // Не может быть отрицательным
    if (uvi <= 2) return `${uvi} (Низкий)`;
    if (uvi <= 5) return `${uvi} (Умеренный)`;
    if (uvi <= 7) return `${uvi} (Высокий)`;
    if (uvi <= 10) return `${uvi} (Очень высокий)`;
    return `${uvi} (Экстремальный)`;
}

// Конвертация скорости ветра (м/с в мили/ч или м/с)
export function formatWindSpeed(speedMps) {
     if (speedMps === null || speedMps === undefined || speedMps < 0) return '-';
    const { units } = getState();
    if (units === UNITS.IMPERIAL) {
        return `${(speedMps * 2.23694).toFixed(1)} миль/ч`;
    } else {
         return `${speedMps.toFixed(1)} м/с`;
    }
}

// Форматирование видимости
export function formatVisibility(visibilityMeters) {
    if (visibilityMeters === null || visibilityMeters === undefined || visibilityMeters < 0) return '-';
    const { units } = getState();
    const visibilityKm = visibilityMeters / 1000;

    if (units === UNITS.IMPERIAL) {
        const miles = visibilityMeters / 1609.34;
        return miles >= 10 ? '>10 миль' : `${miles.toFixed(1)} миль`;
    } else {
        // Стандарт OWM - максимальная видимость 10 км
        return visibilityKm >= 10 ? '>10 км' : `${visibilityKm.toFixed(1)} км`;
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
    return weatherEmojiMap[iconCode] || '❓';
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

    return `Обновлено в ${formatTime(timestamp / 1000)}`;
}
