import { TIPS_JSON_URL, TIPS_JSON_FALLBACK_URL, MAX_FARMER_TIPS_DISPLAYED } from './constants.js';
import { getCurrentSeason } from './utils.js';
import { showError } from './ui.js'; // Импортируем для показа ошибки

let farmerTipsData = null; // Кэш для данных
let isLoading = false;
let loadPromise = null;

// Асинхронная загрузка советов
async function loadTipsDataInternal() {
    console.log('[Tips] Загрузка советов...');
    try {
        const response = await fetch(TIPS_JSON_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status} from ${TIPS_JSON_URL}`);
        farmerTipsData = await response.json();
        console.log('[Tips] Советы загружены с основного URL.');
    } catch (error) {
        console.error('[Tips] Ошибка загрузки советов с основного URL:', error);
        console.log('[Tips] Попытка загрузки с fallback URL:', TIPS_JSON_FALLBACK_URL);
        try {
            // Используем относительный путь для fallback
            const fallbackResponse = await fetch(TIPS_JSON_FALLBACK_URL);
            if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status} from ${TIPS_JSON_FALLBACK_URL}`);
            farmerTipsData = await fallbackResponse.json();
            console.log('[Tips] Советы загружены с fallback URL.');
        } catch (fallbackError) {
            console.error('[Tips] Ошибка загрузки советов с fallback URL:', fallbackError);
            showError("Не удалось загрузить советы для фермеров."); // Показываем ошибку пользователю
            farmerTipsData = null; // Устанавливаем в null при неудаче
        }
    } finally {
        isLoading = false;
    }
    return farmerTipsData;
}

// Функция для получения промиса загрузки или уже загруженных данных
function loadTipsData() {
    if (farmerTipsData) return Promise.resolve(farmerTipsData); // Уже загружено
    if (isLoading) return loadPromise; // Уже загружается

    isLoading = true;
    loadPromise = loadTipsDataInternal(); // Запускаем загрузку
    return loadPromise;
}


// Вызов этой функции начинает загрузку советов в фоне при старте приложения
export function initTipsLoading() {
    loadTipsData();
}

// Получение советов на основе текущей погоды
export async function getFarmerTips(currentWeather) {
    const tipsConfig = await loadTipsData(); // Дожидаемся загрузки, если еще не завершена

    if (!tipsConfig) {
        console.warn("[Tips] Данные для советов не загружены.");
        return []; // Возвращаем пустой массив
    }
    if (!currentWeather) {
         console.warn("[Tips] Данные о текущей погоде отсутствуют.");
         return [];
    }


    const result = new Set(); // Используем Set для автоматической уникальности
    const temp = currentWeather.temp;
    const humidity = currentWeather.humidity;
    const season = getCurrentSeason();

    // Температурные советы
    try {
        if (temp === undefined || temp === null) throw new Error("Температура не определена");

        if (tipsConfig.temperature?.hot?.min !== undefined && temp >= tipsConfig.temperature.hot.min) {
            (tipsConfig.temperature.hot.tips || []).forEach(tip => result.add(tip));
        } else if (tipsConfig.temperature?.moderate?.min !== undefined && temp >= tipsConfig.temperature.moderate.min) {
            (tipsConfig.temperature.moderate.tips || []).forEach(tip => result.add(tip));
        } else if (tipsConfig.temperature?.cold?.tips) { // Если не жарко и не умеренно, считаем холодно
            (tipsConfig.temperature.cold.tips || []).forEach(tip => result.add(tip));
        }
    } catch (e) { console.error("[Tips] Ошибка обработки температурных советов:", e); }


    // Советы по влажности
     try {
         if (humidity === undefined || humidity === null) throw new Error("Влажность не определена");

         if (tipsConfig.humidity?.high?.min !== undefined && humidity >= tipsConfig.humidity.high.min) {
            (tipsConfig.humidity.high.tips || []).forEach(tip => result.add(tip));
        } else if (tipsConfig.humidity?.normal?.min !== undefined && humidity >= tipsConfig.humidity.normal.min) {
            (tipsConfig.humidity.normal.tips || []).forEach(tip => result.add(tip));
        } else if (tipsConfig.humidity?.low?.tips) { // Если не высокая и не нормальная, считаем низкой
            (tipsConfig.humidity.low.tips || []).forEach(tip => result.add(tip));
        }
     } catch (e) { console.error("[Tips] Ошибка обработки советов по влажности:", e); }

    // Сезонные советы
     try {
        if (tipsConfig.seasons?.[season]?.tips) {
            tipsConfig.seasons[season].tips.forEach(tip => result.add(tip));
        } else {
             console.warn(`[Tips] Советы для сезона "${season}" не найдены.`);
        }
     } catch (e) { console.error("[Tips] Ошибка обработки сезонных советов:", e); }

     // console.log('[Tips] Сгенерированные советы (Set):', result);

    // Преобразуем Set в массив и берем нужное количество
    const tipsArray = Array.from(result);
    return tipsArray.slice(0, MAX_FARMER_TIPS_DISPLAYED);
}