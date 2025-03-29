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
let currentUpdateRequest = null; // Для отмены предыдущего запроса

// --- Основная Логика ---

async function updateWeatherForCity(city) {
    if (!city) {
        showError("Не указан город для поиска.");
        return;
    }

    // Отменяем предыдущий не завершенный запрос, если есть
    if (currentUpdateRequest) {
        console.log("[Main] Отмена предыдущего запроса...");
        // Здесь нужна логика отмены, если используем AbortController
        // controller.abort();
    }

    const requestController = new AbortController(); // Создаем новый контроллер
    currentUpdateRequest = requestController; // Сохраняем ссылку

    console.log(`[Main] Обновление погоды для: ${city}`);
    showLoading(`Загрузка погоды для ${city}...`);
    if (!isInitialLoad) {
        hideWeatherResults();
    }

    try {
        // --- Шаг 1: Получение координат ---
        const geoData = await getCoordinatesByCityName(city); // AbortController пока не применим к geo
        if (requestController.signal.aborted) return; // Проверяем отмену
        const { lat, lon, name: foundCityName } = geoData;
        updateState({ currentCity: foundCityName, currentLat: lat, currentLon: lon });
        updateCityNameUI(foundCityName); // Обновляем имя сразу

        // --- Шаг 2: Получение данных о погоде ---
        const weatherData = await fetchWeatherData(lat, lon); // Передаем signal
         if (requestController.signal.aborted) return; // Проверяем отмену
        const now = Date.now();
        updateState({ lastUpdateTimestamp: now });

        // --- Шаг 3: Обновление UI ---
        updateCurrentWeatherUI(weatherData.current, weatherData.daily, weatherData.timezone_offset);
        updateHourlyForecastUI(weatherData.hourly, weatherData.timezone_offset);
        updateWeeklyForecastUI(weatherData.daily, weatherData.timezone_offset);
        updateLastUpdatedUI(now);

        // --- Шаг 4: Получение и обновление советов ---
        // Запускаем параллельно с обновлением UI, если советы уже загружены
        getFarmerTips(weatherData.current)
            .then(tips => {
                if (!requestController.signal.aborted) { // Проверяем перед обновлением UI
                     updateFarmerTipsUI(tips);
                 }
             })
            .catch(err => console.error("[Main] Ошибка при получении/обновлении советов:", err));


        showWeatherResults(); // Показываем все результаты

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('[Main] Запрос погоды отменен.');
            return; // Ничего не делаем, если запрос отменен
        }
        console.error(`[Main] Ошибка при обновлении погоды для "${city}":`, error);
        showError(error.message || "Не удалось загрузить данные о погоде.");
        // Можно скрыть результаты при ошибке
        hideWeatherResults();
    } finally {
        hideLoading();
        isInitialLoad = false;
        if (currentUpdateRequest === requestController) { // Сбрасываем ссылку только если это был последний запрос
            currentUpdateRequest = null;
        }
    }
}

// --- Обработчики Событий ---

function handleSearch() {
    const searchValue = elements.citySearch?.value.trim();
    if (searchValue) {
        clearTimeout(searchTimeout);
        elements.citySearch.blur(); // Убираем фокус с поля ввода
        updateWeatherForCity(searchValue);
    } else {
        showError("Введите название города.");
        elements.citySearch?.focus();
    }
}

function handleSearchInput() {
    clearTimeout(searchTimeout);
    const searchValue = elements.citySearch?.value.trim();
    if (searchValue.length >= MIN_SEARCH_LENGTH) {
        searchTimeout = setTimeout(() => {
            updateWeatherForCity(searchValue);
        }, SEARCH_DEBOUNCE_DELAY);
    }
}

function handleSettingsToggle(event) {
    const button = event.target.closest('.toggle-button');
    if (!button || button.classList.contains('active')) return;

    const parentSetting = button.closest('.setting-item');
    if (!parentSetting) return;

    const settingType = parentSetting.querySelector('span')?.textContent.toLowerCase();
    const value = button.dataset.unit || button.dataset.format;
    const currentState = getState();
    let stateChanged = false;

    if (settingType?.includes('единицы') && value !== currentState.units) {
        console.log(`[Settings] Смена единиц на: ${value}`);
        updateState({ units: value });
        stateChanged = true;
    } else if (settingType?.includes('время') && value !== currentState.timeFormat) {
        console.log(`[Settings] Смена формата времени на: ${value}`);
        updateState({ timeFormat: value });
        stateChanged = true; // Время влияет только на отображение, но UI обновить надо
    }

    if (stateChanged) {
        updateSettingsUI(); // Обновляем кнопки
        // Перезагружаем погоду только если изменились единицы
        if (settingType?.includes('единицы')) {
            // Отменяем текущий поиск, если он есть
             if (currentUpdateRequest) { currentUpdateRequest.abort(); }
             updateWeatherForCity(currentState.currentCity);
        } else {
            // Если изменился только формат времени, просто перерисовываем UI с текущими данными
             if (currentState.lastUpdateTimestamp && currentState.currentLat) {
                 fetchWeatherData(currentState.currentLat, currentState.currentLon) // Запросим еще раз на всякий случай
                     .then(weatherData => {
                         // Обновляем только те части UI, что зависят от формата времени
                         updateCurrentWeatherUI(weatherData.current, weatherData.daily, weatherData.timezone_offset);
                         updateHourlyForecastUI(weatherData.hourly, weatherData.timezone_offset);
                         updateLastUpdatedUI(currentState.lastUpdateTimestamp); // Время обновления не меняется
                     }).catch(err => {
                          console.error("Ошибка обновления UI после смены формата времени:", err);
                          // Если ошибка, перезагружаем все
                          updateWeatherForCity(currentState.currentCity);
                     });
             } else {
                 // Если данных нет, все равно перезагружаем
                  updateWeatherForCity(currentState.currentCity);
             }
        }
    }
}


function setupEventListeners() {
    elements.searchButton?.addEventListener('click', handleSearch);
    elements.citySearch?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
             e.preventDefault();
             handleSearch();
        }
    });
    elements.citySearch?.addEventListener('input', handleSearchInput);
    elements.settingsButton?.addEventListener('click', toggleSettingsPanel);
    elements.settingsPanel?.addEventListener('click', handleSettingsToggle);
}

// --- Инициализация Приложения ---

async function initializeApp() {
    console.log('[Main] Инициализация приложения...');
    showLoading("Загрузка приложения...");
    loadState();
    updateSettingsUI();
    initRippleEffects();
    initTipsLoading(); // Начинаем загрузку советов

    let initialCity = getState().currentCity || DEFAULT_CITY;
    let initialLat = getState().currentLat;
    let initialLon = getState().currentLon;
    let citySource = 'сохраненного состояния или по умолчанию';

    // Пытаемся определить геолокацию
    try {
        showLoading("Определение местоположения...");
        const locationData = await getUserLocation();
        // Используем данные геолокации, даже если имя определить не удалось
        initialCity = locationData.name;
        initialLat = locationData.lat;
        initialLon = locationData.lon;
        updateState({ currentCity: initialCity, currentLat: initialLat, currentLon: initialLon });
        citySource = 'геолокации';
        console.log(`[Main] Город/координаты из геолокации: ${initialCity}`);
    } catch (locationError) {
        console.warn('[Main] Ошибка геолокации:', locationError.message);
        // Используем город из состояния (localStorage или дефолтный)
        initialCity = getState().currentCity || DEFAULT_CITY;
        showError(`${locationError.message} Используем: ${initialCity}.`);
    }

    // Обновляем поле поиска и загружаем погоду
    if(elements.citySearch) elements.citySearch.value = initialCity.startsWith("Координаты:") ? "" : initialCity; // Не ставим координаты в поиск
    console.log(`[Main] Загрузка погоды для: ${initialCity} (из ${citySource})`);
    // Запускаем начальную загрузку
    updateWeatherForCity(initialCity); // Эта функция сама обработает hideLoading

    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
             // Путь к SW должен быть относительным к корню домена, но указывать на файл в папке приложения
             // SW будет контролировать scope, указанный в basePath в самом SW
             const swPath = '/weather-appp/service-worker.js'; // <-- Убедитесь, что путь правильный!
             navigator.serviceWorker.register(swPath)
                .then(registration => console.log(`[SW] Service Worker зарегистрирован успешно: scope=${registration.scope}`))
                .catch(error => console.error('[SW] Ошибка регистрации Service Worker:', error));
        });
    } else {
        console.warn('[SW] Service Worker не поддерживается.');
    }
}

// --- Запуск ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        initializeApp();
    });
} else {
    setupEventListeners();
    initializeApp();
}
