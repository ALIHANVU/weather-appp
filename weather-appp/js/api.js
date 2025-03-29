import { PROXY_API_URL, GEOLOCATION_TIMEOUT } from './constants.js';
import { getState } from './state.js';

// Обработка ошибок API / Прокси
async function handleApiResponse(response, context = "API") {
    if (response.ok) {
        // Проверяем Content-Type перед парсингом JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             return response.json();
        } else {
             // Если не JSON, возможно, ошибка прокси вернула HTML или текст
             const text = await response.text();
             console.error(`[${context}] Ответ не JSON: ${response.status}`, text);
             throw new Error(`Ошибка сервера (${response.status}): Неожиданный формат ответа.`);
        }
    }

    // Обработка ошибок (статус не 2xx)
    let errorBody = { message: `HTTP ошибка ${response.status}` }; // Дефолтное сообщение
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            errorBody = await response.json();
        } else {
             errorBody.details = await response.text(); // Получаем текст ошибки, если не JSON
        }
    } catch (e) {
        console.warn(`[${context}] Не удалось получить тело ошибки ${response.status}:`, e);
    }

    const errorMessage = errorBody.message || `Произошла ошибка ${response.status}`;
    console.error(`[${context}] Ошибка ${response.status}:`, errorMessage, errorBody.details || '');

    // Конкретизация сообщений об ошибках
    if (response.status === 404) {
        if (context.includes("Геокод") && (errorMessage.toLowerCase().includes('city not found') || errorMessage.toLowerCase().includes('nothing to geocode'))) {
             throw new Error(`Город не найден.`);
        }
         if (context.includes("Обр. геокод") && (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no city found'))) {
             throw new Error(`Не удалось определить город.`);
         }
         throw new Error(`Ресурс не найден (${response.status}).`); // Общая 404
    }
    if (response.status === 401) throw new Error('Ошибка авторизации (проверьте API ключ на прокси).');
    if (response.status === 429) throw new Error('Превышен лимит запросов (попробуйте позже).');
    if (response.status >= 500) throw new Error(`Ошибка сервера прокси или API (${response.status}). Попробуйте позже.`);

    // Общая ошибка
    throw new Error(`Ошибка ${context}: ${errorMessage}`);
}

// Получение координат через ПРОКСИ
export async function getCoordinatesByCityName(city) {
    // Прокси должен ожидать параметр 'city'
    const url = new URL(`${PROXY_API_URL}/geocode`);
    url.searchParams.append('city', city);
    console.log(`[API] Запрос геокодирования: ${url}`);
    try {
        const response = await fetch(url.toString());
        const data = await handleApiResponse(response, "Геокодирование");
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Город "${city}" не найден.`);
        }
        const { lat, lon, local_names, name } = data[0];
        const bestName = local_names?.ru || name || city;
        console.log(`[API] Координаты для "${city}":`, { lat, lon, name: bestName });
        return { lat, lon, name: bestName };
    } catch (error) {
        console.error('[API] Ошибка геокодирования через прокси:', error);
        throw error; // Передаем ошибку дальше
    }
}

// Получение погоды через ПРОКСИ
export async function fetchWeatherData(lat, lon) {
    const { units } = getState();
    // Прокси должен ожидать 'lat', 'lon', 'units', 'lang'
    const url = new URL(`${PROXY_API_URL}/weather`);
    url.searchParams.append('lat', lat);
    url.searchParams.append('lon', lon);
    url.searchParams.append('units', units);
    url.searchParams.append('lang', 'ru');
     console.log(`[API] Запрос погоды: ${url}`);
    try {
        const response = await fetch(url.toString());
        const data = await handleApiResponse(response, "Погода");
        // Проверяем структуру ответа One Call API
        if (!data || typeof data !== 'object' || !data.current || !data.hourly || !data.daily) {
            console.error("[API] Некорректный формат данных погоды от прокси:", data);
            throw new Error("Получены некорректные данные о погоде от сервера.");
        }
        console.log('[API] Данные о погоде получены.');
        return data;
    } catch (error) {
        console.error('[API] Ошибка получения погоды через прокси:', error);
        throw error;
    }
}

// Получение имени города по координатам через ПРОКСИ
export async function getCityNameByCoordinates(lat, lon) {
     // Прокси должен ожидать 'lat', 'lon'
     const url = new URL(`${PROXY_API_URL}/reverse-geocode`);
     url.searchParams.append('lat', lat);
     url.searchParams.append('lon', lon);
      console.log(`[API] Запрос обратного геокодирования: ${url}`);
     try {
         const response = await fetch(url.toString());
         const data = await handleApiResponse(response, "Обр. геокодирование");
         if (!Array.isArray(data) || data.length === 0 || !data[0].name) {
             throw new Error('Не удалось определить город по координатам.');
         }
          const { local_names, name } = data[0];
          const bestName = local_names?.ru || name || 'Неизвестное место';
           console.log('[API] Город по координатам:', bestName);
          return bestName;
     } catch (error) {
         console.error('[API] Ошибка обратного геокодирования через прокси:', error);
         // Возвращаем общую ошибку, чтобы не блокировать показ погоды по координатам
         throw new Error('Не удалось определить название города.');
     }
}


// Получение геолокации пользователя
export function getUserLocation() {
    console.log('[Geo] Запрос геолокации...');
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn('[Geo] Геолокация не поддерживается.');
            return reject(new Error('Геолокация не поддерживается вашим браузером.'));
        }
        const options = { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT, maximumAge: 300000 }; // Кэш 5 мин

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                 console.log(`[Geo] Координаты получены: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                try {
                    // Получаем имя города через НАШ ПРОКСИ
                    const cityName = await getCityNameByCoordinates(latitude, longitude);
                    resolve({ lat: latitude, lon: longitude, name: cityName });
                } catch (error) {
                     // Если не удалось определить имя, возвращаем координаты с сообщением
                     console.warn('[Geo] Не удалось определить имя города, используем координаты.', error.message);
                     resolve({ lat: latitude, lon: longitude, name: `Координаты: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
                    // reject(error); // Или можно реджектить, если имя обязательно
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
