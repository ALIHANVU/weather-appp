const CACHE_NAME = 'weather-app-cache-v3'; // Обновите версию при изменениях
// --- Укажите путь или URL вашего API прокси ---
// Если прокси на том же домене (например, через Netlify/Vercel):
const PROXY_API_PATH = '/api/'; // Пример для Netlify/Vercel
// Если прокси на другом домене (например, Cloudflare Worker):
// const PROXY_API_ORIGIN = 'https://your-proxy-worker.example.com';
// -----------------------------------------

const urlsToCache = [
  '/', // Главная страница
  '/index.html', // Явно
  '/styles.css',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/sun-svgrepo-com (2).svg',
  '/js/main.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/tips.js',
  '/js/constants.js',
  '/farmer-tips.json',
  // Шрифты (осторожно, могут меняться)
  'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600&display=swap',
];

// Установка
self.addEventListener('install', event => {
  console.log('[SW] Установка v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование базовых ресурсов');
        // addAll атомарна, если один файл не загрузится, весь кэш не создастся
        return cache.addAll(urlsToCache).catch(error => {
            console.error('[SW] Не удалось закэшировать все ресурсы:', error);
            // Можно попробовать кэшировать по одному, игнорируя ошибки
            // Promise.all(
            //     urlsToCache.map(url => cache.add(url).catch(err => console.warn(`[SW] Не удалось кэшировать ${url}:`, err)))
            // );
        });
      })
      .catch(error => console.error('[SW] Ошибка открытия кэша при установке:', error))
  );
  self.skipWaiting();
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  console.log('[SW] Активация v3');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                  .map(name => {
                      console.log('[SW] Удаление старого кэша:', name);
                      return caches.delete(name);
                  })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 1. Запросы к API прокси - Network first, fallback to cache (или Network Only)
  // Определяем, является ли запрос запросом к API
  const isApiRequest = requestUrl.pathname.startsWith(PROXY_API_PATH);
                     // || (typeof PROXY_API_ORIGIN !== 'undefined' && requestUrl.origin === PROXY_API_ORIGIN);

  if (isApiRequest) {
      // console.log('[SW] API Request (Network First):', event.request.url);
       event.respondWith(
           fetch(event.request)
               .then(networkResponse => {
                   // Опционально: кэшируем успешный ответ API
                   // if (networkResponse.ok) {
                   //     const cacheCopy = networkResponse.clone();
                   //     caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                   // }
                   return networkResponse;
               })
               .catch(error => {
                   console.warn('[SW] Сеть недоступна для API, ищем в кэше:', error);
                   // return caches.match(event.request); // Пытаемся вернуть из кэша, если сеть упала
                   // Или просто возвращаем ошибку, если оффлайн API не нужно
                   return new Response(JSON.stringify({ error: "Network error or offline" }), {
                       status: 503, // Service Unavailable
                       headers: { 'Content-Type': 'application/json' }
                   });
               })
       );
       return;
   }

  // 2. Запросы к внешним ресурсам (шрифты) - Cache first, fallback to network
   if (requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
       // console.log('[SW] Font Request (Cache First):', event.request.url);
       event.respondWith(
           caches.match(event.request).then(cachedResponse => {
               return cachedResponse || fetch(event.request).then(networkResponse => {
                   // Кэшируем шрифты, т.к. они меняются редко
                   if(networkResponse.ok) {
                       const cacheCopy = networkResponse.clone();
                       caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                   }
                   return networkResponse;
               });
           })
       );
       return;
   }


  // 3. Остальные запросы (наша статика) - Cache first, fallback to network
  // console.log('[SW] Static Asset Request (Cache First):', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Если есть в кэше - отдаем
        if (cachedResponse) {
          return cachedResponse;
        }
        // Иначе - идем в сеть
        return fetch(event.request).then(networkResponse => {
            // Кэшируем только если запрос успешный и это наш ресурс
            if (networkResponse.ok && requestUrl.origin === self.location.origin) {
                 const cacheCopy = networkResponse.clone();
                 caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
             }
             return networkResponse;
        }).catch(error => {
            console.error("[SW] Сеть недоступна для статики:", event.request.url, error);
            // Можно вернуть кастомную оффлайн-страницу
            // return caches.match('/offline.html');
             // Или просто ошибку
             return new Response("Network error loading resource", { status: 503 });
        });
      })
  );
});