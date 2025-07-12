// Service worker as a module
const isDevelopment = location.hostname === 'localhost';

// Parse URL parameters
const envs = location.search.replace('?', '').split('&').reduce((acc, item) => {
  const [key, value] = item.split('=');
  if (key) acc[key] = value;
  return acc;
}, {});

const CURRENT_VERSION = envs.version;
const CACHE_NAME = `Note-keeper_v${CURRENT_VERSION}`;

const filesToCache = [
  'fonts.googleapis.com/css',
  'manifest.json',
];

const fileExtensionsToCache = [
  '.ttf',
  '.woff',
  '.woff2',
  '.ico',
  'webp',
  'svg',
  'png',
  'jpeg',
];

////////////////////// PRODUCTION BLOCK START //////////////////////
const filesToCache_Prod = [];

const fileExtensionsToCache_Prod = [
  '.js',
  '.css',
  '.html',
];

if (!isDevelopment) {
  fileExtensionsToCache.push(...fileExtensionsToCache_Prod);
  filesToCache.push(...filesToCache_Prod);
}
////////////////////// PRODUCTION BLOCK END //////////////////////

// Cache files section
function testExtension(url) {
  return fileExtensionsToCache.some(extension => url.endsWith(extension));
}

function testPartOfUrl(url) {
  return filesToCache.some(fileName => url.includes(fileName));
}

function matchEventRequest(event) {
  return event.request.method === 'GET'
    && (testPartOfUrl(event.request.url) || testExtension(event.request.url))
    && event.request.url.startsWith('http');
}

// Using ES modules event handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CURRENT_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.info('Service worker installed', CACHE_NAME);
      return self.skipWaiting();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (matchEventRequest(event)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Serve from cache
        }

        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone()); // Cache the new file
            return networkResponse;
          });
        });
      })
    );
  }
});
