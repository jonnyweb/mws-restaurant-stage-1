import { openDb, deleteDb } from 'idb';

const staticCacheName = 'mwsr1-static-v3';

const dbPromise = openDb('mws-restaurants', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', { keyPath: 'id' });
  }
});

const urlsToPrefetch = [
  '/',
  '/restaurant.html',
  '/css/styles.css',
  '/js/communal.js',
  '/js/dbhelper.js',
  '/js/main.js',
  '/js/restaurant_info.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2?v=4.7.0',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName).then(cache => {
      cache.addAll(
        urlsToPrefetch.map(url => {
          return new Request(url, { mode: 'cors' });
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith('mwsr1-') && cacheName != staticCacheName
            )
            .map(cacheName => caches.delete(cacheName))
        )
      )
  );
});

self.addEventListener('fetch', function(event) {
  if (
    event.request.cache === 'only-if-cached' &&
    event.request.mode !== 'same-origin'
  ) {
    return;
  }

  // Deal with restaurant id in url
  let url = event.request.url.replace('http://localhost:8000', '');
  if (url.includes('?id=')) {
    url = url.replace(/\?id\=[0-9]+/, '');
  }

  event.respondWith(
    caches.match(url).then(response => {
      return response || fetch(event.request);
    })
  );
});
