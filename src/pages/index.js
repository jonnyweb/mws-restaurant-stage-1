import DBHelper from '../shared/dbhelper';
import registerServiceWorker from '../shared/serviceworker';

import '../shared/styles.scss';
import './index.scss';

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  initMap();
  fetchNeighborhoods();
  fetchCuisines();
});

window.updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        resetRestaurants(restaurants);

        const resultNumber = document.getElementById('filter-results');
        resultNumber.innerHTML = `${restaurants.length} restaurants found`;

        fillRestaurantsHTML();
      }
    }
  );
};

window.resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

const initMap = () => {
  if (window.L) {
    self.newMap = L.map('map', {
      center: [40.722216, -73.987501],
      zoom: 12,
      scrollWheelZoom: false,
    });
    L.tileLayer(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
      DBHelper.mapBoxData
    ).addTo(self.newMap);
  }

  updateRestaurants();
};

const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

const createRestaurantHTML = restaurant => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;
  image.setAttribute('aria-hidden', true);

  const favorite = document.createElement('i');
  favorite.className = 'favorite fa-heart fas';
  if (restaurant.is_favorite === 'true') {
    favorite.className += ' is_favorite';
  }
  favorite['data-restaurant-id'] = `restaurant${restaurant.id}`;
  let favorited = restaurant.is_favorite === 'true';

  favorite.onclick = () => {
    DBHelper.mapRestaurantAsFavorite(restaurant.id, !favorited, data => {
      favorited = data.is_favorite === 'true';

      if (!favorited && favorite.className.includes('is_favorite')) {
        favorite.className = favorite.className.replace('is_favorite', '');
      } else {
        favorite.className += ' is_favorite';
      }
    });
  };

  const imageContainer = document.createElement('div');
  imageContainer.className = 'restaurant-img-container';
  imageContainer.append(image);
  imageContainer.append(favorite);

  li.append(imageContainer);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;

  const nameContainer = document.createElement('div');
  nameContainer.className = 'name-container';

  const stripe = document.createElement('div');
  stripe.className = 'stripe';

  nameContainer.appendChild(name);
  nameContainer.appendChild(stripe);

  li.append(nameContainer);

  const info = document.createElement('p');
  info.innerHTML = `${restaurant.neighborhood} (${restaurant.cuisine_type})`;
  li.append(info);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = `View Details <span class='visually-hidden'>of ${
    restaurant.name
  }</span>`;
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

const addMarkersToMap = (restaurants = self.restaurants) => {
  if (!window.L) return;

  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on('click', onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
};
