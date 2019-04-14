import { dbPromise } from './db';

/**
 * Common database helper functions.
 */
export default class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return 'http://localhost:1337';
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id = null) {
    let apiUrl = `${DBHelper.DATABASE_URL}/restaurants`;

    if (id) {
      apiUrl += `/${id}`;
    }

    return fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(data => data.json())
      .then(data => {
        callback(null, data);
      })
      .catch(e => {
        const error = `Request failed. Returned status of ${e.status}`;
        callback(error, null);
      });
  }

  static fetchReviews(restaurantId, callback) {
    let apiUrl = `${
      DBHelper.DATABASE_URL
    }/reviews/?restaurant_id=${restaurantId}`;

    return fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(data => data.json())
      .then(data => {
        const sortedData = data.sort((a, b) =>
          a.updatedAt > b.updatedAt ? 1 : -1
        );
        callback(null, sortedData);
      })
      .catch(e => {
        const error = `Request failed. Returned status of ${e.status}`;
        callback(e, null);
      });
  }

  static addReview(review, callback, pending = false) {
    let apiUrl = `${DBHelper.DATABASE_URL}/reviews/`;

    return fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    })
      .then(data => data.json())
      .then(data => {
        if (callback) {
          callback(data);
        }
      })
      .catch(e => {
        // Offline - Attempt to add to pending requests
        if (!pending) {
          dbPromise()
            .then(db => {
              const tx = db.transaction('pending', 'readwrite');
              tx.objectStore('pending').put({
                data: {
                  url: apiUrl,
                  method: 'POST',
                  body: JSON.stringify(review),
                },
              });
            })
            .then(() => {
              if (callback) {
                callback(
                  {
                    id: null,
                    createdAt: null,
                    updatedAt: null,
                    ...review,
                  },
                  true
                );
              }
            });
        } else {
          callback(
            {
              id: null,
              createdAt: null,
              updatedAt: null,
              ...review,
            },
            true
          );
        }
      });
  }

  static addPendingReview(review, callback) {
    return DBHelper.addReview(review, callback, true);
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    return DBHelper.fetchRestaurants(callback, id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (!restaurant.photograph) {
      return `/img/missing-image.png`;
    }

    return `/img/${restaurant.photograph}.jpg`;
  }

  static mapRestaurantAsFavorite(id, favorite, callback = null) {
    let apiUrl = `${
      DBHelper.DATABASE_URL
    }/restaurants/${id}/?is_favorite=${!!favorite}`;

    return fetch(apiUrl, {
      method: 'PUT',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(data => data.json())
      .then(data => {
        if (callback) {
          callback(null, data);
        }
      })
      .catch(e => {
        const error = `Request failed. Returned status of ${e.status}`;
        callback(error, null);
      });
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
      }
    );
    marker.addTo(map);
    return marker;
  }

  static get mapBoxData() {
    return {
      mapboxToken:
        'pk.eyJ1Ijoiam9ubnl3ZWIiLCJhIjoiY2pwMHJzNTdzMGx4YTNxbzltYjRobWhkZCJ9.gr4uEIk5MCC2ogZtX9NULQ',
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets',
    };
  }
}
