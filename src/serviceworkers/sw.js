import { dbPromise } from '../shared/db';

const staticCacheName = 'mwsr1-static-v4';

const urlsToPrefetch = [
  '/',
  '/restaurant.html',
  '/manifest.json',
  '/img/icon.png',
  '/img/icon-512.png',
  '/img/missing-image.png',
  '/assets/app.min.css',
  '/assets/index.bundle.js',
  '/assets/restaurant.bundle.js',
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
  let request = event.request;

  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return;
  }

  let cachedUrl = new URL(event.request.url);

  // Deal with restaurant id in url
  if (cachedUrl.pathname.includes('restaurant.html')) {
    cachedUrl = 'restaurant.html';
    request = new Request(cachedUrl);
  }

  const apiRequest = request.headers.get('Content-Type') === 'application/json';

  if (apiRequest) {
    let id = parseInt(cachedUrl.pathname.split('/')[2]) || -1;

    if (cachedUrl.pathname.includes('reviews')) {
      id = parseInt(cachedUrl.searchParams.get('restaurant_id'));
      handleApiReviewRequest(event, id);
    } else {
      return handleApiRestaurantRequest(event, id);
    }
  } else {
    return handleResource(event, cachedUrl);
  }
});

function handleApiReviewRequest(event, restaurantId) {
  event.respondWith(
    dbPromise()
      .then(db => {
        return db
          .transaction('reviews')
          .objectStore('reviews')
          .index('restaurant_id')
          .getAll(restaurantId);
      })
      .then(data => {
        const hasData = data && data.length > 0;

        // Map indexedDb structure to normal arrays
        if (hasData) {
          return data.map(data => data.data);
        }

        return fetch(event.request)
          .then(data => (data.json && data.json()) || data)
          .then(reviewData =>
            dbPromise().then(db => {
              const tx = db.transaction('reviews', 'readwrite');
              const store = tx.objectStore('reviews');

              reviewData.forEach(review => {
                store.put({
                  id: review.id,
                  restaurant_id: review['restaurant_id'],
                  data: review,
                });
              });

              return reviewData;
            })
          );
      })
      .then(finalResponse => {
        return new Response(JSON.stringify(finalResponse), { status: 200 });
      })
      .catch(() => {
        return new Response('API Server Error', { status: 500 });
      })
  );
}

function handleApiRestaurantRequest(event, restaurantId) {
  event.respondWith(
    dbPromise()
      .then(db => {
        const store = db.transaction('restaurants').objectStore('restaurants');
        return restaurantId > -1
          ? store.get(parseInt(restaurantId))
          : store.getAll();
      })
      .then(data => {
        const hasData = data && (data.length > 0 || data.data);

        if (hasData) {
          return restaurantId > -1 ? data.data : data.map(r => r.data);
        }

        return fetch(event.request)
          .then(data => (data.json && data.json()) || data)
          .then(restaurantData =>
            dbPromise().then(db => {
              const tx = db.transaction('restaurants', 'readwrite');
              const store = tx.objectStore('restaurants');

              const restaurants =
                restaurantId === -1 ? restaurantData : [restaurantData];

              restaurants.forEach(r => store.put({ id: r.id, data: r }));
              return restaurantData;
            })
          );
      })
      .then(finalResponse => {
        return new Response(JSON.stringify(finalResponse), { status: 200 });
      })
      .catch(() => {
        return new Response('API Server Error', { status: 500 });
      })
  );
}

function handleResource(event, cachedUrl) {
  event.respondWith(
    caches
      .match(cachedUrl)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        if (event.request.url.indexOf('.jpg') >= 0) {
          return caches.match('/img/missing-image.png');
        }

        return new Response('App is offline', {
          status: 404,
          statusText: 'App is offline',
        });
      })
  );
}
