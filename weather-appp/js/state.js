import { DEFAULT_CITY, UNITS, TIME_FORMAT, LOCALSTORAGE_STATE_KEY } from './constants.js';

// Начальное состояние по умолчанию
const defaultState = {
    currentCity: DEFAULT_CITY,
    units: UNITS.METRIC,
    timeFormat: TIME_FORMAT.H24,
    lastUpdateTimestamp: null,
    currentLat: null,
    currentLon: null,
};

let appState = { ...defaultState };

// Загрузка состояния из localStorage
export function loadState() {
    try {
        const storedState = localStorage.getItem(LOCALSTORAGE_STATE_KEY);
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            // Объединяем сохраненное с дефолтным, чтобы новые ключи подхватывались
            // и проверяем валидность значений юнитов/формата времени
            appState = {
                ...defaultState,
                ...parsedState,
                units: Object.values(UNITS).includes(parsedState.units) ? parsedState.units : defaultState.units,
                timeFormat: Object.values(TIME_FORMAT).includes(parsedState.timeFormat) ? parsedState.timeFormat : defaultState.timeFormat,
            };
            console.log('[State] Состояние загружено из localStorage:', appState);
        } else {
            console.log('[State] Используется состояние по умолчанию.');
            appState = { ...defaultState }; // Убедимся, что используется дефолтное
        }
    } catch (error) {
        console.error('[State] Ошибка загрузки состояния из localStorage:', error);
        appState = { ...defaultState }; // Возвращаемся к дефолту при ошибке
    }
    return appState;
}

// Сохранение состояния в localStorage
export function saveState() {
    try {
        localStorage.setItem(LOCALSTORAGE_STATE_KEY, JSON.stringify(appState));
         // console.log('[State] Состояние сохранено:', appState);
    } catch (error) {
        console.error('[State] Ошибка сохранения состояния в localStorage:', error);
    }
}

// Функции для получения и обновления состояния
export function getState() {
    // Возвращаем глубокую копию для сложных объектов, если они будут
    // return JSON.parse(JSON.stringify(appState));
    // Пока достаточно поверхностной копии
    return { ...appState };
}

export function updateState(newState) {
    // Обновляем только существующие ключи или добавляем новые
    appState = { ...appState, ...newState };
    saveState(); // Автоматически сохраняем при обновлении
}
