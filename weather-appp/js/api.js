import { PROXY_API_URL, GEOLOCATION_TIMEOUT } from './constants.js'; // Импортируем URL прокси
import { getState } from './state.js';

// Обработка ошибок API / Прокси
async function handleApiResponse(response, context = "API") {
    if (response.ok) {
        return response.json();
    }

    let errorBody = {};
    try {
        errorBody = await response.json();
    } catch (e) {
        // Игнорируем ошибку парсинга JSON, если тело пустое или не JSON
        console.warn(`[${context}] Не удалось распарсить тело ошибки:`, e);
    }

    const errorMessage = errorBody.message || `Произошла ошибка ${response.status}`;
    console.error(`[${context}] Ошибка ${response.status}:`, errorMessage, errorBody);

    // Проверяем специфичные ошибки
    if (response.status === 404 && errorMessage.toLowerCase().includes('city not found')) {
        throw new Error(`Город не найден.`);
    }
     if (response.status === 404 && errorMessage.toLowerCase().includes('no city found')) {
        throw new Error(`Не удалось определить город по координатам.`);
    }
    if (response.status === 401) throw new Error('Ошибка авторизации (проверьте ключ на прокси).');
    if (response.status === 429) throw new Error('Превышен лимит запросов (проверьте на прокси).');
    if (response.status >= 500) throw new Error(`Ошибка сервера (${response.status}). Попробуйте позже.`);

    // Общая ошибка
    throw new Error(`Ошибка ${context}: ${errorMessage}`);
}

// Получение координат через ПРОКСИ
export async function getCoordinatesByCityName(city) {
    // Ваш прокси должен обрабатывать этот эндпоинт и параметр 'city'
    const url = `${PROXY_API_URL}/geocode?city=${encodeURIComponent(city)}`;
    console.log(`[API] Запрос геокодирования: ${url}`);
    try {
        const response = await fetch(url);
        const data = await handleApiResponse(response, "Геокодирование");

        // Ожидаем массив от прокси (как от OWM Geo API)
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Город "${city}" не найден.`);
        }
        const { lat, lon, local_names, name } = data[0];
        // Отдаем предпочтение русскому названию, если оно есть
        const bestName = local_names?.ru || name || city;
        console.log(`[API] Координаты для "${city}":`, { lat, lon, name: bestName });
        return { lat, lon, name: bestName };
    } catch (error) {
        console.error('Ошибка геокодирования через прокси:', error);
        // Перебрасываем ошибку, чтобы она была обработана выше
        throw error;
    }
}

// Получение погоды через ПРОКСИ
export async function fetchWeatherData(lat, lon) {
    const { units } = getState();
    // Ваш прокси должен обрабатывать этот эндпоинт и параметры 'lat', 'lon', 'units', 'lang'
    // и делать запрос к OpenWeatherMap One Call API
    const url = `${PROXY_API_URL}/weather?lat=${lat}&lon=${lon}&units=${units}&lang=ru`;
     console.log(`[API] Запрос погоды: ${url}`);
    try {
        const response = await fetch(url);
        const data = await handleApiResponse(response, "Погода");
        // Ожидаем объект ответа One Call API от прокси
        if (!data || !data.current || !data.hourly || !data.daily) {
            throw new Error("Ответ от прокси не содержит ожидаемых данных о погоде.");
        }
        console.log('[API] Данные о погоде получены.');
        return data;
    } catch (error) {
        console.error('Ошибка получения погоды через прокси:', error);
        throw error;
    }
}

// Получение имени города по координатам через ПРОКСИ
export async function getCityNameByCoordinates(lat, lon) {
     // Ваш прокси должен обрабатывать этот эндпоинт и параметры 'lat', 'lon'
     const url = `${PROXY_API_URL}/reverse-geocode?lat=${lat}&lon=${lon}`;
      console.log(`[API] Запрос обратного геокодирования: ${url}`);
     try {
         const response = await fetch(url);
         const data = await handleApiResponse(response, "Обр. геокодирование");
         // Ожидаем массив от прокси (как от OWM Reverse Geo API)
         if (!Array.isArray(data) || data.length === 0 || !data[0].name) {
             throw new Error('Не удалось определить город по координатам.');
         }
          const { local_names, name } = data[0];
          const bestName = local_names?.ru || name;
           console.log('[API] Город по координатам:', bestName);
          return bestName;
     } catch (error) {
         console.error('Ошибка обратного геокодирования через прокси:', error);
         throw error;
     }
}


// Получение геолокации пользователя (использует getCityNameByCoordinates с прокси)
export function getUserLocation() {
    console.log('[Geo] Запрос геолокации...');
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn('[Geo] Геолокация не поддерживается.');
            return reject(new Error('Геолокация не поддерживается вашим браузером.'));
        }
        const options = { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT, maximumAge: 0 };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                 console.log(`[Geo] Координаты получены: ${latitude}, ${longitude}`);
                try {
                    // Получаем имя города через НАШ ПРОКСИ
                    const cityName = await getCityNameByCoordinates(latitude, longitude);
                    resolve({ lat: latitude, lon: longitude, name: cityName });
                } catch (error) {
                    // Ошибка пришла от getCityNameByCoordinates (прокси)
                    console.error('[Geo] Ошибка определения города по координатам:', error);
                    reject(error);
                }
            },
            (error) => { // Ошибка getCurrentPosition
                let message = 'Не удалось определить местоположение. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED: message += 'Доступ запрещен.'; break;
                    case error.POSITION_UNAVAILABLE: message += 'Информация недоступна.'; break;
                    case error.TIMEOUT: message += 'Превышено время ожидания.'; break;
                    default: message += `Неизвестная ошибка (Код: ${error.code}).`;
                }
                 console.warn('[Geo] Ошибка геолокации:', message);
                reject(new Error(message));
            },
            options
        );
    });
}