import { TIPS_JSON_URL, TIPS_JSON_FALLBACK_URL, MAX_FARMER_TIPS_DISPLAYED } from './constants.js';
import { getCurrentSeason } from './utils.js';
import { showError } from './ui.js';

let farmerTipsData = null;
let isLoading = false;
let loadPromise = null;

// Асинхронная загрузка советов
async function loadTipsDataInternal() {
    console.log('[Tips] Загрузка советов...');
    let data = null;
    try {
        const response = await fetch(TIPS_JSON_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status} from ${TIPS_JSON_URL}`);
        data = await response.json();
        console.log('[Tips] Советы загружены с основного URL.');
    } catch (error) {
        console.error('[Tips] Ошибка загрузки советов с основного URL:', error);
        console.log('[Tips] Попытка загрузки с fallback URL:', TIPS_JSON_FALLBACK_URL);
        try {
            const fallbackResponse = await fetch(TIPS_JSON_FALLBACK_URL);
            if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status} from ${TIPS_JSON_FALLBACK_URL}`);
            data = await fallbackResponse.json();
            console.log('[Tips] Советы загружены с fallback URL.');
        } catch (fallbackError) {
            console.error('[Tips] Ошибка загрузки советов с fallback URL:', fallbackError);
            // Не показываем ошибку пользователю здесь, обработаем отсутствие данных позже
        }
    } finally {
        isLoading = false;
        farmerTipsData = data; // Сохраняем результат (может быть null)
    }
    return farmerTipsData;
}

// Функция для получения промиса загрузки
function loadTipsData() {
    if (farmerTipsData) return Promise.resolve(farmerTipsData);
    if (isLoading) return loadPromise;
    isLoading = true;
    loadPromise = loadTipsDataInternal();
    return loadPromise;
}

// Начать загрузку советов в фоне
export function initTipsLoading() {
    loadTipsData().catch(err => console.error("[Tips] Не удалось инициализировать загрузку советов:", err));
}

// Получение советов на основе текущей погоды
export async function getFarmerTips(currentWeather) {
    let tipsConfig = farmerTipsData; // Попробуем взять из кэша
    if (!tipsConfig && !isLoading) { // Если нет в кэше и не грузится, запускаем загрузку
        tipsConfig = await loadTipsData();
    } else if (isLoading) { // Если грузится, дожидаемся
        tipsConfig = await loadPromise;
    }

    // Если советы так и не загрузились
    if (!tipsConfig) {
        console.warn("[Tips] Данные для советов не загружены, советы не будут показаны.");
         // Можно один раз показать ошибку, если еще не показали
         if (!isLoading && !loadPromise) { // Проверяем, что загрузка не идет и не было промиса (т.е. она упала)
             showError("Не удалось загрузить советы для фермеров.");
         }
        return [];
    }
    // Если данные погоды отсутствуют
    if (!currentWeather) {
         console.warn("[Tips] Данные о текущей погоде отсутствуют для генерации советов.");
         return [];
    }

    const result = new Set();
    const temp = currentWeather.temp;
    const humidity = currentWeather.humidity;
    const season = getCurrentSeason();

    const getTips = (category, type) => tipsConfig?.[category]?.[type]?.tips || [];

    // Температурные советы
    try {
        if (temp === undefined || temp === null) throw new Error("Температура не определена");
        const T = tipsConfig.temperature;
        if (T?.hot?.min !== undefined && temp >= T.hot.min) {
            getTips('temperature', 'hot').forEach(tip => result.add(tip));
        } else if (T?.moderate?.min !== undefined && temp >= T.moderate.min) {
            getTips('temperature', 'moderate').forEach(tip => result.add(tip));
        } else { // Cold
            getTips('temperature', 'cold').forEach(tip => result.add(tip));
        }
    } catch (e) { console.error("[Tips] Ошибка обработки температурных советов:", e); }

    // Советы по влажности
     try {
         if (humidity === undefined || humidity === null) throw new Error("Влажность не определена");
         const H = tipsConfig.humidity;
         if (H?.high?.min !== undefined && humidity >= H.high.min) {
            getTips('humidity', 'high').forEach(tip => result.add(tip));
        } else if (H?.normal?.min !== undefined && humidity >= H.normal.min) {
            getTips('humidity', 'normal').forEach(tip => result.add(tip));
        } else { // Low
            getTips('humidity', 'low').forEach(tip => result.add(tip));
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

    const tipsArray = Array.from(result);
    // console.log(`[Tips] Сгенерировано ${tipsArray.length} советов.`);
    return tipsArray.slice(0, MAX_FARMER_TIPS_DISPLAYED);
}
