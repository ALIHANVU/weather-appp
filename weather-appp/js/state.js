import { DEFAULT_CITY, UNITS, TIME_FORMAT, LOCALSTORAGE_STATE_KEY } from './constants.js';

// Начальное состояние по умолчанию
const defaultState = {
    currentCity: DEFAULT_CITY,
    units: UNITS.METRIC,
    timeFormat: TIME_FORMAT.H24,
    lastUpdateTimestamp: null,
    // Добавим координаты для возможного использования
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
            appState = { ...defaultState, ...parsedState };
            console.log('Состояние загружено из localStorage:', appState);
        } else {
            console.log('Используется состояние по умолчанию.');
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния из localStorage:', error);
        appState = { ...defaultState }; // Возвращаемся к дефолту при ошибке
    }
    return appState;
}

// Сохранение состояния в localStorage
export function saveState() {
    try {
        localStorage.setItem(LOCALSTORAGE_STATE_KEY, JSON.stringify(appState));
         // console.log('Состояние сохранено:', appState); // Для отладки
    } catch (error) {
        console.error('Ошибка сохранения состояния в localStorage:', error);
    }
}

// Функции для получения и обновления состояния
export function getState() {
    return { ...appState }; // Возвращаем копию, чтобы избежать прямой мутации
}

export function updateState(newState) {
    appState = { ...appState, ...newState };
    saveState(); // Автоматически сохраняем при обновлении
}