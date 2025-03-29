/**
 * Service Worker для кэширования ресурсов приложения Погоды.
 * Версия: v5
 */

// --- КОНФИГУРАЦИЯ ---

// ВАЖНО: Установите правильный базовый путь для вашего приложения на GitHub Pages.
// Пример 1: Если URL https://username.github.io/my-repo/weather-appp/
// const basePath = '/my-repo/weather-appp/';
// Пример 2: Если URL https://username.github.io/weather-appp/ (репозиторий назван username.github.io)
const basePath = '/weather-appp/'; // <-- ИЗМЕНИТЕ ЭТОТ ПУТЬ ПРИ НЕОБХОДИМОСТИ!
// --------------------

const CACHE_NAME = 'weather-app-cache-v5'; // Увеличивайте версию при обновлении SW или ресурсов

// --- ВАЖНО: Укажите путь или URL вашего API прокси ---
// Используйте тот же путь, что и в js/constants.js
const PROXY_API_PATH = '/api/'; // <-- Убедитесь, что это правильный путь к вашему прокси
// ----------------------------------------------------

// Ресурсы для обязательного кэширования при установке
const CORE_ASSETS = [
  basePath, // Главный путь приложения (обычно соответствует index.html)
  basePath + 'index.html',
  basePath + 'styles.css',
  basePath + 'manifest.json',
  basePath + 'images/icon-192.png',
  basePath + 'images/icon-512.png',
  basePath + 'images/sun-svgrepo-com (2).svg',
  basePath + 'js/main.js',
  basePath + 'js/api.js',
  basePath + 'js/ui.js',
  basePath + 'js/state.js',
  basePath + 'js/utils.js',
  basePath + 'js/tips.js',
  basePath + 'js/constants.js',
  basePath + 'farmer-tips.json',
];

// Внешние ресурсы для кэширования (опционально, но улучшает оффлайн)
const VENDOR_ASSETS = [
  'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600&display=swap',
];

// --- ЛОГИКА SERVICE WORKER ---

// Установка: кэширование основных ресурсов
self.addEventListener('install', event => {
  console.log(`[SW ${CACHE_NAME}] Установка`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW ${CACHE_NAME}] Кэширование основных ресурсов...`);
        // Кэшируем основные и внешние ресурсы
        const allAssetsToCache = [...CORE_ASSETS, ...VENDOR_ASSETS];
        return Promise.all(
            allAssetsToCache.map(url =>
                cache.add(url).catch(err => console.warn(`[SW ${CACHE_NAME}] Не удалось кэшировать ${url}:`, err))
            )
        );
      })
      .then(() => {
        console.log(`[SW ${CACHE_NAME}] Базовые ресурсы успешно закэшированы.`);
        self.skipWaiting(); // Активируем новый SW сразу
      })
      .catch(error => console.error(`[SW ${CACHE_NAME}] Ошибка кэширования при установке:`, error))
  );
});

// Активация: очистка старых кэшей
self.addEventListener('activate', event => {
  console.log(`[SW ${CACHE_NAME}] Активация`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // Удаляем все кэши, кроме текущего
          .map(name => {
            console.log(`[SW ${CACHE_NAME}] Удаление старого кэша:`, name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log(`[SW ${CACHE_NAME}] Старые кэши удалены.`);
      return self.clients.claim(); // Берем контроль над открытыми страницами
    }).catch(error => console.error(`[SW ${CACHE_NAME}] Ошибка при очистке старых кэшей:`, error))
  );
});

// Обработка запросов (Fetch Event)
self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Игнорируем запросы не-GET (POST, PUT и т.д.) - они не кэшируются
  if (request.method !== 'GET') {
    return;
  }

  // 1. Запросы к API прокси (Network Only)
  const isApiRequest = requestUrl.pathname.startsWith(PROXY_API_PATH);
  if (isApiRequest) {
    // console.log(`[SW ${CACHE_NAME}] API Запрос (Сеть): ${request.url}`);
    event.respondWith(
      fetch(request).catch(error => {
        console.error(`[SW ${CACHE_NAME}] Ошибка сети API: ${request.url}`, error);
        // Возвращаем стандартный ответ об ошибке сети
        return new Response(JSON.stringify({ error: "Network error or proxy offline" }), {
          status: 503, // Service Unavailable
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return; // Прерываем выполнение для этого запроса
  }

  // 2. Запросы к внешним ресурсам (шрифты) - Cache First, Fallback to Network
  if (VENDOR_ASSETS.some(vendorUrl => requestUrl.href.startsWith(new URL(vendorUrl, self.location.origin).origin))) {
     // console.log(`[SW ${CACHE_NAME}] Внешний Ресурс (Кэш, потом Сеть): ${request.url}`);
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Если нет в кэше, идем в сеть и кэшируем ответ
        return fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
            console.error(`[SW ${CACHE_NAME}] Ошибка сети для внешнего ресурса ${request.url}:`, error);
             // Возвращаем пустой ответ или ошибку, т.к. это не критичный ресурс
             return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // 3. Запросы к нашим статическим ресурсам - Cache First, Fallback to Network
  // Проверяем, что запрос идет к нашему origin и basePath
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith(basePath)) {
     // console.log(`[SW ${CACHE_NAME}] Статика (Кэш, потом Сеть): ${request.url}`);
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Если нет в кэше, идем в сеть и кэшируем
        return fetch(request).then(networkResponse => {
          // Кэшируем только успешные ответы
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error(`[SW ${CACHE_NAME}] Ошибка сети для статики ${request.url}:`, error);
          // Для навигационных запросов (переход по страницам), пытаемся отдать index.html
          if (request.mode === 'navigate') {
            console.log(`[SW ${CACHE_NAME}] Отдаем ${basePath}index.html как fallback для навигации.`);
            return caches.match(basePath + 'index.html');
          }
           // Для других ресурсов возвращаем ошибку
           return new Response('Network error loading resource', { status: 503 });
        });
      })
    );
    return;
  }

  // Если запрос не соответствует ни одному из правил, просто выполняем его
  // console.log(`[SW ${CACHE_NAME}] Запрос не обрабатывается SW: ${request.url}`);
});
