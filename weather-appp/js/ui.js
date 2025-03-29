import { formatTime, getDayOfWeek, getUvIndexDescription, formatWindSpeed, formatVisibility, formatTemperature, getWeatherEmoji, formatLastUpdateTime } from './utils.js';
import { getState } from './state.js';
import { UNITS } from './constants.js';

// --- DOM Элементы ---
export const elements = {
    // Поиск
    citySearch: document.querySelector('#citySearch'),
    searchButton: document.querySelector('#searchButton'),
    // Результат
    weatherResult: document.querySelector('#weatherResult'),
    // Настройки
    settingsButton: document.querySelector('#settingsButton'),
    settingsPanel: document.querySelector('#settingsPanel'),
    unitsToggleC: document.querySelector('#unitsToggleC'),
    unitsToggleF: document.querySelector('#unitsToggleF'),
    timeFormat12: document.querySelector('#timeFormat12'),
    timeFormat24: document.querySelector('#timeFormat24'),
    // Основное
    cityName: document.querySelector('#cityName'),
    temperature: document.querySelector('#temperature'),
    weatherDescription: document.querySelector('#weatherDescription'),
    maxTemp: document.querySelector('#maxTemp'),
    minTemp: document.querySelector('#minTemp'),
    lastUpdated: document.querySelector('#lastUpdated'),
    // Детали
    feelsLike: document.querySelector('#feelsLike'),
    humidity: document.querySelector('#humidity'),
    windSpeed: document.querySelector('#windSpeed'),
    visibility: document.querySelector('#visibility'),
    uvIndex: document.querySelector('#uvIndex'),
    precipitationProb: document.querySelector('#precipitationProb'),
    sunriseTime: document.querySelector('#sunriseTime'),
    sunsetTime: document.querySelector('#sunsetTime'),
    // Прогнозы
    hourlyForecastContainer: document.querySelector('#hourlyForecastContainer'),
    weeklyForecastContainer: document.querySelector('#weeklyForecastContainer'),
    // Советы
    tipsContainer: document.querySelector('#tipsContainer'),
};

// --- Обновление UI ---

// Обновление текста элемента
function updateElementText(element, text) {
    if (!element) return;
    const newText = text ?? '-';
    if (element.textContent !== newText) {
        element.textContent = newText;
    }
}

// Обновление данных текущей погоды
export function updateCurrentWeatherUI(currentWeather, dailyForecast, timezoneOffset) {
    if (!currentWeather || !dailyForecast || !dailyForecast[0]) {
        console.warn("[UI] Недостаточно данных для обновления текущей погоды");
        // Можно очистить поля или показать сообщение об ошибке
        return;
    }
    // Основные текущие
    updateElementText(elements.temperature, formatTemperature(currentWeather.temp));
    updateElementText(elements.weatherDescription, currentWeather.weather[0]?.description?.replace(/^\w/, c => c.toUpperCase()));
    // Мин/Макс из прогноза на сегодня
    updateElementText(elements.maxTemp, formatTemperature(dailyForecast[0].temp?.max));
    updateElementText(elements.minTemp, formatTemperature(dailyForecast[0].temp?.min));
    // Детали
    updateElementText(elements.feelsLike, formatTemperature(currentWeather.feels_like));
    updateElementText(elements.humidity, `${Math.round(currentWeather.humidity)}%`);
    updateElementText(elements.windSpeed, formatWindSpeed(currentWeather.wind_speed));
    updateElementText(elements.visibility, formatVisibility(currentWeather.visibility));
    updateElementText(elements.uvIndex, getUvIndexDescription(currentWeather.uvi));
    updateElementText(elements.sunriseTime, formatTime(currentWeather.sunrise + timezoneOffset));
    updateElementText(elements.sunsetTime, formatTime(currentWeather.sunset + timezoneOffset));
}

// Обновление имени города
export function updateCityNameUI(name) {
     updateElementText(elements.cityName, name);
}

// Обновление времени последнего обновления
export function updateLastUpdatedUI(timestamp) {
     updateElementText(elements.lastUpdated, formatLastUpdateTime(timestamp));
}

// Обновление почасового прогноза
export function updateHourlyForecastUI(hourlyForecast, timezoneOffset) {
    if (!elements.hourlyForecastContainer) return;
    elements.hourlyForecastContainer.innerHTML = '';

    if (!hourlyForecast || hourlyForecast.length === 0) {
        elements.hourlyForecastContainer.innerHTML = '<div class="forecast-hour"><span class="forecast-time">Нет данных</span></div>';
        updateElementText(elements.precipitationProb, '-'); // Сбрасываем POP
        return;
    }

    // Обновляем POP в деталях
    const firstPop = hourlyForecast[0]?.pop;
    updateElementText(elements.precipitationProb, firstPop !== undefined ? `${Math.round(firstPop * 100)}%` : '-');

    // Создаем элементы
    hourlyForecast.slice(0, 24).forEach((item, index) => {
        const isNow = index === 0;
        const pop = item.pop !== undefined ? `${Math.round(item.pop * 100)}%` : null;
        const hourDiv = document.createElement('div');
        hourDiv.className = 'forecast-hour';
        hourDiv.innerHTML = `
            <div class="forecast-time">${isNow ? 'Сейчас' : formatTime(item.dt + timezoneOffset)}</div>
            <div class="forecast-icon">${getWeatherEmoji(item.weather[0]?.icon)}</div>
            ${pop ? `<div class="forecast-pop">${pop}</div>` : ''}
            <div class="forecast-temp">${formatTemperature(item.temp)}</div>
        `;
        addRippleEffect(hourDiv);
        elements.hourlyForecastContainer.appendChild(hourDiv);
    });
}

// Обновление недельного прогноза
export function updateWeeklyForecastUI(dailyForecast, timezoneOffset) {
     if (!elements.weeklyForecastContainer) return;
    elements.weeklyForecastContainer.innerHTML = '';

    if (!dailyForecast || dailyForecast.length === 0) {
        elements.weeklyForecastContainer.innerHTML = '<div class="weekly-day"><span class="weekly-day-name">Нет данных</span></div>';
        return;
    }

    dailyForecast.slice(0, 7).forEach((day) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'weekly-day';
        const icon = day.weather[0]?.icon;
        dayDiv.innerHTML = `
            <div class="weekly-day-name">${getDayOfWeek(day.dt + timezoneOffset)}</div>
            <div class="weekly-day-icon">${getWeatherEmoji(icon)}</div>
            <div class="weekly-day-temp">
                <span class="temp-max">${formatTemperature(day.temp?.max)}</span>
                <span class="temp-min">${formatTemperature(day.temp?.min)}</span>
            </div>
        `;
        addRippleEffect(dayDiv);
        elements.weeklyForecastContainer.appendChild(dayDiv);
    });
}

// Обновление советов
export function updateFarmerTipsUI(tips) {
    if (!elements.tipsContainer) return;
    elements.tipsContainer.innerHTML = '';

    const containerElement = elements.tipsContainer.closest('.farmer-tips'); // Находим родительскую карточку

    if (!tips || tips.length === 0) {
         if (containerElement) containerElement.classList.add('hidden'); // Скрываем всю карточку
         return;
    }

     if (containerElement) containerElement.classList.remove('hidden'); // Показываем карточку

    tips.forEach((tipText) => {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'tip-item';
        tipDiv.innerHTML = `
            <span class="tip-icon">🌱</span>
            <span class="tip-text">${tipText}</span>
        `;
        addRippleEffect(tipDiv);
        elements.tipsContainer.appendChild(tipDiv);
    });
}

// --- Индикаторы и Ошибки ---

let loadingOverlay = null;
export function showLoading(message = "Загрузка...") {
    if (loadingOverlay) return; // Уже показывается

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.opacity = '0';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner" aria-label="${message}" role="status">
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    // Анимация появления
    requestAnimationFrame(() => {
         loadingOverlay.style.opacity = '1';
         loadingOverlay.style.pointerEvents = 'auto';
    });
}

export function hideLoading() {
    if (!loadingOverlay) return;

    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.pointerEvents = 'none';
    // Удаляем после анимации
    loadingOverlay.addEventListener('transitionend', () => {
        loadingOverlay?.remove(); // Проверяем, существует ли еще
        if (loadingOverlay === event?.target) loadingOverlay = null; // Сбрасываем ссылку только если это тот самый элемент
    }, { once: true });
    // Fallback на случай, если transitionend не сработает
    setTimeout(() => {
        loadingOverlay?.remove();
        loadingOverlay = null;
    }, 350); // Чуть больше времени transition
}


let errorTimeout;
let currentErrorDiv = null;
export function showError(message) {
    if (!message) return; // Не показываем пустые ошибки
    // Удаляем предыдущее уведомление, если оно еще есть
    if (currentErrorDiv) {
        currentErrorDiv.remove();
        currentErrorDiv = null;
    }
    clearTimeout(errorTimeout);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    document.body.appendChild(errorDiv);
    currentErrorDiv = errorDiv;

    // Принудительный reflow для анимации
    void errorDiv.offsetWidth;
    errorDiv.style.animationPlayState = 'running'; // Убедимся, что анимация запущена

    // Автоудаление с анимацией исчезновения
    errorTimeout = setTimeout(() => {
         if (errorDiv) {
            errorDiv.classList.add('fade-out'); // Добавляем класс для CSS-анимации исчезновения
            errorDiv.addEventListener('animationend', () => errorDiv.remove(), { once: true });
            // Fallback на случай если animationend не сработает
            setTimeout(() => errorDiv?.remove(), 350);
         }
        if (currentErrorDiv === errorDiv) {
             currentErrorDiv = null;
         }
    }, 4000);
}

// --- Вспомогательные UI Функции ---

// Создание эффекта ripple
function createRipple(event) {
    const target = event.currentTarget;
    if (target.disabled || target.querySelector('.ripple')) return;

    const ripple = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    const rect = target.getBoundingClientRect();

    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// Добавление обработчика ripple к элементу
export function addRippleEffect(element) {
    if (!element || element.dataset.rippleAdded) return;
    element.addEventListener('click', createRipple);
    const currentPosition = window.getComputedStyle(element).position;
    if (currentPosition === 'static') {
        element.style.position = 'relative';
    }
    element.style.overflow = 'hidden'; // Убедимся, что overflow hidden
    element.dataset.rippleAdded = 'true';
}

// Инициализация ripple для статичных элементов
export function initRippleEffects() {
    const rippleSelectors = '.search-button, .settings-toggle-button, .toggle-button';
    // Для динамических элементов ripple добавляется при их создании
    document.querySelectorAll(rippleSelectors).forEach(addRippleEffect);
}

// Обновление визуального состояния переключателей настроек
export function updateSettingsUI() {
    try { // Добавляем try-catch на случай отсутствия элементов
        const { units, timeFormat } = getState();
        elements.unitsToggleC?.classList.toggle('active', units === UNITS.METRIC);
        elements.unitsToggleF?.classList.toggle('active', units === UNITS.IMPERIAL);
        elements.timeFormat24?.classList.toggle('active', timeFormat === TIME_FORMAT.H24);
        elements.timeFormat12?.classList.toggle('active', timeFormat === TIME_FORMAT.H12);
    } catch (e) {
        console.error("[UI] Ошибка обновления UI настроек:", e)
    }
}

// Переключение видимости панели настроек
export function toggleSettingsPanel() {
     if (!elements.settingsPanel || !elements.settingsButton) return;
     const isHidden = elements.settingsPanel.classList.toggle('hidden');
     elements.settingsPanel.setAttribute('aria-hidden', isHidden);
     elements.settingsButton.setAttribute('aria-expanded', !isHidden);
     // Фокусируемся на первом элементе панели при открытии (для доступности)
     if (!isHidden) {
         elements.settingsPanel.querySelector('button')?.focus();
     }
}

// Показ/скрытие основного блока результатов
export function showWeatherResults() {
    elements.weatherResult?.classList.remove('hidden');
}
export function hideWeatherResults() {
     elements.weatherResult?.classList.add('hidden');
}
