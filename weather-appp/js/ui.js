import { formatTime, getDayOfWeek, getUvIndexDescription, formatWindSpeed, formatVisibility, formatTemperature, getWeatherEmoji, formatLastUpdateTime } from './utils.js';
import { getState } from './state.js';
import { UNITS } from './constants.js';

// --- DOM Элементы ---
// Группируем элементы для удобства
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
    precipitationProb: document.querySelector('#precipitationProb'), // Используется для почасового POP
    sunriseTime: document.querySelector('#sunriseTime'),
    sunsetTime: document.querySelector('#sunsetTime'),
    // Прогнозы
    hourlyForecastContainer: document.querySelector('#hourlyForecastContainer'),
    weeklyForecastContainer: document.querySelector('#weeklyForecastContainer'),
    // Советы
    tipsContainer: document.querySelector('#tipsContainer'),
};

// --- Обновление UI ---

// Обновление текста элемента с плавной анимацией
function updateElementText(element, text) {
    if (!element) {
        // console.warn("UI Element not found for update");
        return;
    }
    const currentText = element.textContent;
    const newText = text ?? '-'; // Используем ?? для дефолтного значения

    // Обновляем только если текст действительно изменился
    if (currentText !== newText) {
        element.classList.add('data-updating'); // Добавляем класс для анимации исчезновения
        // Используем requestAnimationFrame для надежности перед сменой текста
        requestAnimationFrame(() => {
            setTimeout(() => { // Небольшая задержка перед обновлением текста
                element.textContent = newText;
                element.classList.remove('data-updating'); // Убираем класс, чтобы элемент плавно появился
            }, 50); // Короткая задержка
        });
    }
}


// Обновление данных текущей погоды
export function updateCurrentWeatherUI(currentWeather, dailyForecast, timezoneOffset) {
    if (!currentWeather || !dailyForecast || !dailyForecast[0]) {
        console.warn("Недостаточно данных для обновления текущей погоды UI");
        return;
    }

    updateElementText(elements.temperature, formatTemperature(currentWeather.temp));
    updateElementText(elements.weatherDescription, currentWeather.weather[0]?.description?.replace(/^\w/, c => c.toUpperCase()) || '-');
    updateElementText(elements.feelsLike, formatTemperature(currentWeather.feels_like));
    updateElementText(elements.humidity, `${Math.round(currentWeather.humidity)}%`);
    updateElementText(elements.windSpeed, formatWindSpeed(currentWeather.wind_speed));
    updateElementText(elements.visibility, formatVisibility(currentWeather.visibility));
    updateElementText(elements.uvIndex, getUvIndexDescription(currentWeather.uvi));
    updateElementText(elements.sunriseTime, formatTime(currentWeather.sunrise + timezoneOffset));
    updateElementText(elements.sunsetTime, formatTime(currentWeather.sunset + timezoneOffset));

    // Мин/Макс берем из прогноза на СЕГОДНЯ (daily[0])
    updateElementText(elements.maxTemp, formatTemperature(dailyForecast[0].temp.max));
    updateElementText(elements.minTemp, formatTemperature(dailyForecast[0].temp.min));
}

// Обновление имени города
export function updateCityNameUI(name) {
     updateElementText(elements.cityName, name || '-');
}

// Обновление времени последнего обновления
export function updateLastUpdatedUI(timestamp) {
     updateElementText(elements.lastUpdated, formatLastUpdateTime(timestamp));
}

// Обновление почасового прогноза
export function updateHourlyForecastUI(hourlyForecast, timezoneOffset) {
    if (!elements.hourlyForecastContainer) return;
    elements.hourlyForecastContainer.innerHTML = ''; // Очищаем контейнер

    if (!hourlyForecast || hourlyForecast.length === 0) {
        elements.hourlyForecastContainer.textContent = 'Нет данных'; // Сообщение, если данных нет
        return;
    }

    // Обновляем вероятность осадков в деталях (берем из первого часа)
    const firstPop = hourlyForecast[0]?.pop;
    updateElementText(elements.precipitationProb, firstPop !== undefined ? `${Math.round(firstPop * 100)}%` : '-');

    // Создаем элементы прогноза
    hourlyForecast.slice(0, 24).forEach((item, index) => {
        const isNow = index === 0;
        const pop = item.pop !== undefined ? `${Math.round(item.pop * 100)}%` : null; // Вероятность осадков

        const hourDiv = document.createElement('div');
        hourDiv.className = 'forecast-hour';

        hourDiv.innerHTML = `
            <div class="forecast-time">${isNow ? 'Сейчас' : formatTime(item.dt + timezoneOffset)}</div>
            <div class="forecast-icon">${getWeatherEmoji(item.weather[0]?.icon)}</div>
            ${pop ? `<div class="forecast-pop">${pop}</div>` : ''}
            <div class="forecast-temp">${formatTemperature(item.temp)}</div>
        `;
        addRippleEffect(hourDiv); // Добавляем ripple эффект
        elements.hourlyForecastContainer.appendChild(hourDiv);
    });
}

// Обновление недельного прогноза
export function updateWeeklyForecastUI(dailyForecast, timezoneOffset) {
     if (!elements.weeklyForecastContainer) return;
    elements.weeklyForecastContainer.innerHTML = ''; // Очищаем

    if (!dailyForecast || dailyForecast.length === 0) {
        elements.weeklyForecastContainer.textContent = 'Нет данных';
        return;
    }

    dailyForecast.slice(0, 7).forEach((day) => { // Берем 7 дней
        const dayDiv = document.createElement('div');
        dayDiv.className = 'weekly-day';

        const icon = day.weather[0]?.icon; // Берем иконку дня

        dayDiv.innerHTML = `
            <div class="weekly-day-name">${getDayOfWeek(day.dt + timezoneOffset)}</div>
            <div class="weekly-day-icon">${getWeatherEmoji(icon)}</div>
            <div class="weekly-day-temp">
                <span class="temp-max">${formatTemperature(day.temp.max)}</span>
                <span class="temp-min">${formatTemperature(day.temp.min)}</span>
            </div>
        `;
        addRippleEffect(dayDiv); // Добавляем ripple эффект
        elements.weeklyForecastContainer.appendChild(dayDiv);
    });
}

// Обновление советов
export function updateFarmerTipsUI(tips) {
    if (!elements.tipsContainer) return;
    elements.tipsContainer.innerHTML = ''; // Очищаем

    if (!tips || tips.length === 0) {
         // Можно скрыть блок или показать сообщение
         elements.tipsContainer.innerHTML = '<div class="tip-item"><span class="tip-text">Подходящие советы не найдены.</span></div>';
         return;
    }
    tips.forEach((tipText) => {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'tip-item';

        tipDiv.innerHTML = `
            <span class="tip-icon">🌱</span>
            <span class="tip-text">${tipText}</span>
        `;
        addRippleEffect(tipDiv); // Добавляем ripple эффект
        elements.tipsContainer.appendChild(tipDiv);
    });
}

// --- Индикаторы и Ошибки ---

let loadingOverlay = null;
export function showLoading(message = "Загрузка...") {
    if (loadingOverlay) hideLoading(); // Убираем старый, если есть

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    // Делаем оверлей нефокусируемым
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.opacity = '0'; // Start transparent for fade-in
    loadingOverlay.innerHTML = `
        <div class="loading-spinner" aria-label="${message}" role="status">
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    // Force reflow before adding fade-in class
    void loadingOverlay.offsetWidth;
    loadingOverlay.style.opacity = '1';
}

export function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        // Удаляем после завершения анимации исчезновения
        loadingOverlay.addEventListener('transitionend', () => {
            if (loadingOverlay) { // Проверяем, не был ли он удален другим вызовом
                 loadingOverlay.remove();
                 loadingOverlay = null;
            }
        }, { once: true });
        // На случай, если transitionend не сработает (например, display:none)
         setTimeout(() => {
             if (loadingOverlay) {
                 loadingOverlay.remove();
                 loadingOverlay = null;
             }
         }, 350); // Должно быть больше времени transition
    }
}

let errorTimeout;
let currentErrorDiv = null;
export function showError(message) {
    // Удаляем предыдущее уведомление немедленно
    if (currentErrorDiv) {
         currentErrorDiv.remove();
         currentErrorDiv = null;
     }
    clearTimeout(errorTimeout);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert'); // For accessibility
    document.body.appendChild(errorDiv);
    currentErrorDiv = errorDiv;

    // Автоудаление
    errorTimeout = setTimeout(() => {
        // Плавно убираем
         if (errorDiv) {
            errorDiv.style.opacity = '0';
             errorDiv.addEventListener('transitionend', () => errorDiv.remove(), { once: true });
             // Fallback timer
             setTimeout(() => errorDiv?.remove(), 350); // Ensure removal
         }
        if (currentErrorDiv === errorDiv) {
             currentErrorDiv = null;
         }
    }, 4000); // Показываем 4 секунды
}

// --- Вспомогательные UI Функции ---

// Создание эффекта ripple
function createRipple(event) {
    const target = event.currentTarget;
    // Предотвращаем создание ripple, если элемент неактивен или уже есть ripple
    if (target.disabled || target.querySelector('.ripple')) return;

    const ripple = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    const rect = target.getBoundingClientRect();

    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    // Добавляем ripple и ждем окончания анимации для удаления
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// Добавление обработчика ripple к элементу
export function addRippleEffect(element) {
    if (!element || element.dataset.rippleAdded) return; // Проверяем, не добавлен ли уже
    element.addEventListener('click', createRipple);
    // Убедимся, что стили позволяют ripple работать (нужно для position:absolute)
    const currentPosition = window.getComputedStyle(element).position;
    if (currentPosition === 'static') {
        element.style.position = 'relative';
    }
    // overflow: hidden должен быть установлен в CSS для этих элементов
    element.dataset.rippleAdded = 'true'; // Помечаем элемент
}

// Инициализация ripple для статичных элементов на странице
export function initRippleEffects() {
    const rippleElements = document.querySelectorAll(
        '.search-button, .settings-toggle-button, .toggle-button, .detail-item, .tip-item, .weekly-day, .forecast-hour'
    );
    rippleElements.forEach(addRippleEffect);
    // Динамические элементы получают ripple при создании в update...UI функциях
}

// Обновление визуального состояния переключателей настроек
export function updateSettingsUI() {
    const { units, timeFormat } = getState();

    elements.unitsToggleC?.classList.toggle('active', units === UNITS.METRIC);
    elements.unitsToggleF?.classList.toggle('active', units === UNITS.IMPERIAL);
    elements.timeFormat24?.classList.toggle('active', timeFormat === TIME_FORMAT.H24);
    elements.timeFormat12?.classList.toggle('active', timeFormat === TIME_FORMAT.H12);
}

// Переключение видимости панели настроек
export function toggleSettingsPanel() {
     elements.settingsPanel?.classList.toggle('hidden');
     const isHidden = elements.settingsPanel?.classList.contains('hidden');
      // Управляем доступностью для скринридеров
     elements.settingsPanel?.setAttribute('aria-hidden', isHidden);
     elements.settingsButton?.setAttribute('aria-expanded', !isHidden);
}

// Показ/скрытие основного блока результатов
export function showWeatherResults() {
    elements.weatherResult?.classList.remove('hidden');
     // Добавляем небольшую задержку перед добавлением анимации, если нужно
     // requestAnimationFrame(() => {
     //     elements.weatherResult?.classList.add('results-visible');
     // });
}
export function hideWeatherResults() {
     elements.weatherResult?.classList.add('hidden');
     // elements.weatherResult?.classList.remove('results-visible');
}