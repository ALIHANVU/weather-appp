import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_DELAY, DEFAULT_CITY } from './constants.js';
import { loadState, getState, updateState } from './state.js';
import { getCoordinatesByCityName, getUserLocation, fetchWeatherData } from './api.js';
import { initTipsLoading, getFarmerTips } from './tips.js';
import {
    elements, showError, showLoading, hideLoading,
    updateCurrentWeatherUI, updateHourlyForecastUI, updateWeeklyForecastUI,
    updateFarmerTipsUI, updateCityNameUI, updateLastUpdatedUI,
    initRippleEffects, updateSettingsUI, toggleSettingsPanel,
    showWeatherResults, hideWeatherResults
} from './ui.js';

let searchTimeout;
let isInitialLoad = true; // Флаг для первой загрузки

// --- Основная Логика ---

async function updateWeatherForCity(city) {
    if (!city) {
        showError("Не указан город для поиска.");
        return;
    }
    console.log(`[Main] Обновление погоды для: ${city}`);
    showLoading(`Загрузка погоды для ${city}...`);
    if (!isInitialLoad) {
        hideWeatherResults(); // Скрываем результаты только при последующих поисках
    }

    try {
        // 1. Получаем координаты
        const { lat, lon, name: foundCityName } = await getCoordinatesByCityName(city);
        // Обновляем состояние с найденными данными
        updateState({ currentCity: foundCityName, currentLat: lat, currentLon: lon });

        // 2. Получаем данные о погоде (One Call API)
        const weatherData = await fetchWeatherData(lat, lon);
        const now = Date.now(); // Время получения данных
        updateState({ lastUpdateTimestamp: now });

        // 3. Обновляем UI
        updateCityNameUI(foundCityName); // Обновляем имя города
        // Передаем daily[0] для мин/макс температуры дня
        updateCurrentWeatherUI(weatherData.current, weatherData.daily, weatherData.timezone_offset);
        updateHourlyForecastUI(weatherData.hourly, weatherData.timezone_offset);
        updateWeeklyForecastUI(weatherData.daily, weatherData.timezone_offset);
        updateLastUpdatedUI(now);

        // 4. Получаем и обновляем советы
        // Дожидаемся загрузки советов, если она еще идет
        const tips = await getFarmerTips(weatherData.current);
        updateFarmerTipsUI(tips);

        showWeatherResults(); // Показываем обновленные результаты

    } catch (error) {
        console.error(`[Main] Ошибка при обновлении погоды для "${city}":`, error);
        showError(error.message || "Не удалось загрузить данные о погоде.");
        // Если произошла ошибка, можно решить оставить старые данные или скрыть все
        // hideWeatherResults(); // Скрыть блок результатов при ошибке
    } finally {
        hideLoading();
        isInitialLoad = false; // Снимаем флаг после первой попытки загрузки
    }
}

// --- Обработчики Событий ---

function handleSearch() {
    const searchValue = elements.citySearch.value.trim();
    if (searchValue) {
        clearTimeout(searchTimeout); // Останавливаем debounce, если он был
        updateWeatherForCity(searchValue);
    } else {
        showError("Введите название города.");
        elements.citySearch.focus(); // Фокус на поле ввода
    }
}

function handleSearchInput() {
    clearTimeout(searchTimeout);
    const searchValue = elements.citySearch.value.trim();
    if (searchValue.length >= MIN_SEARCH_LENGTH) {
        searchTimeout = setTimeout(() => {
            updateWeatherForCity(searchValue);
        }, SEARCH_DEBOUNCE_DELAY);
    }
}

// Обработчик для переключателей (единицы, формат времени)
function handleSettingsToggle(event) {
    const button = event.target.closest('.toggle-button');
    if (!button || button.classList.contains('active')) {
        return; // Игнорируем клик не по кнопке или по уже активной кнопке
    }

    const settingType = button.parentElement.parentElement.querySelector('span').textContent.toLowerCase(); // "единицы:" или "время:"
    const value = button.dataset.unit || button.dataset.format;
    const currentState = getState();

    if (settingType.includes('единицы') && value !== currentState.units) {
        console.log(`[Settings] Смена единиц на: ${value}`);
        updateState({ units: value });
        updateSettingsUI();
        updateWeatherForCity(currentState.currentCity); // Перезагружаем погоду
    } else if (settingType.includes('время') && value !== currentState.timeFormat) {
        console.log(`[Settings] Смена формата времени на: ${value}`);
        updateState({ timeFormat: value });
        updateSettingsUI();
        // Перезагрузка погоды для обновления времени (но можно и без нее, если обновлять UI)
        // Просто обновим существующий UI, если данные есть
         if (currentState.lastUpdateTimestamp && currentState.currentLat) {
             fetchWeatherData(currentState.currentLat, currentState.currentLon).then(weatherData => {
                 updateCurrentWeatherUI(weatherData.current, weatherData.daily, weatherData.timezone_offset);
                 updateHourlyForecastUI(weatherData.hourly, weatherData.timezone_offset);
                 // Недельный прогноз не зависит от формата времени
                  updateLastUpdatedUI(currentState.lastUpdateTimestamp);
             }).catch(err => console.error("Ошибка обновления UI после смены формата времени:", err));
         } else {
            updateWeatherForCity(currentState.currentCity); // Перезагружаем, если данных нет
         }
    }
}


function setupEventListeners() {
    elements.searchButton?.addEventListener('click', handleSearch);
    elements.citySearch?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
             e.preventDefault(); // Предотвращаем отправку формы, если она есть
             handleSearch();
        }
    });
    elements.citySearch?.addEventListener('input', handleSearchInput);

    // Настройки
    elements.settingsButton?.addEventListener('click', toggleSettingsPanel);
    // Делегирование для кнопок внутри панели
    elements.settingsPanel?.addEventListener('click', handleSettingsToggle);
}

// --- Инициализация Приложения ---

async function initializeApp() {
    console.log('[Main] Инициализация приложения...');
    showLoading("Загрузка приложения...");
    loadState(); // Загружаем сохраненное состояние
    updateSettingsUI(); // Обновляем вид переключателей
    initRippleEffects(); // Инициализируем ripple для кнопок
    initTipsLoading(); // Начинаем загрузку советов в фоне

    let initialCity = getState().currentCity || DEFAULT_CITY;
    let citySource = 'сохраненного состояния или по умолчанию';

    try {
        showLoading("Определение местоположения...");
        const locationData = await getUserLocation();
        initialCity = locationData.name; // Используем имя из геолокации
        updateState({ currentCity: initialCity, currentLat: locationData.lat, currentLon: locationData.lon }); // Обновляем состояние
        citySource = 'геолокации';
        console.log(`[Main] Город определен по геолокации: ${initialCity}`);
    } catch (locationError) {
        console.warn('[Main] Ошибка геолокации:', locationError.message);
        // Используем город из состояния (который мог быть загружен из localStorage)
        initialCity = getState().currentCity || DEFAULT_CITY;
        showError(`${locationError.message} Используем: ${initialCity}.`);
    }

    // Обновляем поле поиска и загружаем погоду для стартового города
    if(elements.citySearch) elements.citySearch.value = initialCity;
    console.log(`[Main] Загрузка погоды для города из ${citySource}: ${initialCity}`);
    await updateWeatherForCity(initialCity);

    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { // Регистрируем после загрузки страницы
             navigator.serviceWorker.register('/service-worker.js') // Укажите правильный путь
                .then(registration => console.log('[SW] Service Worker зарегистрирован успешно:', registration.scope))
                .catch(error => console.error('[SW] Ошибка регистрации Service Worker:', error));
        });
    } else {
        console.warn('[SW] Service Worker не поддерживается в этом браузере.');
    }
    // hideLoading() вызывается внутри updateWeatherForCity
}

// --- Запуск ---
// Дожидаемся полной загрузки DOM перед инициализацией
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        initializeApp();
    });
} else {
    // DOM уже загружен
    setupEventListeners();
    initializeApp();
}