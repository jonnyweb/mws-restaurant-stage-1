import DBHelper from '../shared/dbhelper';
import registerServiceWorker from '../shared/serviceworker';
import dateformat from 'dateformat';

import '../shared/styles.scss';
import './restaurant.scss';

registerServiceWorker();

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  initMap();
  initReviewForm();
});

const initReviewForm = () => {
  const stars = [];
  const starContainer = document.getElementById('review-rating-stars');

  const formName = document.getElementById('review-name');
  const formRating = document.getElementById('review-rating');
  const formText = document.getElementById('review-text');
  const formError = document.getElementById('review-error');

  // Add all stars to an array
  Array.from(starContainer.getElementsByTagName('a')).forEach(star => {
    stars.push(star);
  });

  // Set up click listeners for all stars
  stars.forEach(star => {
    star.onclick = e => {
      e.preventDefault();
      const value = star.dataset.value;
      formRating.setAttribute('value', value);

      stars.forEach((star, idx) => {
        if (idx < value) {
          star.style = 'color: #f18200';
        } else {
          star.style = '';
        }
      });
    };
  });

  // Default to 1 star rating
  stars[0].dispatchEvent(new Event('click'));

  // Hide Add review button when clicked
  const reviewButton = document.getElementById('add-review');
  reviewButton.onclick = () => {
    reviewButton.parentElement.removeChild(reviewButton);
  };

  // Handle new review
  document.getElementById('review-submit').addEventListener('click', e => {
    e.preventDefault();

    if (!self.restaurant) return;

    const hasFormRating =
      formRating.value && formRating.value > 0 && formRating.value <= 5;

    // Form has an error
    if (!formName.value || !formText.value || !hasFormRating) {
      formError.className = 'show';
      return false;
    }

    formError.className = '';

    const review = {
      restaurant_id: self.restaurant.id,
      name: formName.value,
      rating: formRating.value,
      comments: formText.value,
    };

    DBHelper.addReview(review, updatePostedReview);
    return false;
  });
};

const updatePostedReview = review => {
  // Remove Review Form
  const form = document.getElementById('add-review-form');
  form.parentElement.removeChild(form);

  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(review));
};

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      if (window.L) {
        self.newMap = L.map('map', {
          center: [restaurant.latlng.lat, restaurant.latlng.lng],
          zoom: 16,
          scrollWheelZoom: false,
        });
        L.tileLayer(
          'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
          DBHelper.mapBoxData
        ).addTo(self.newMap);
      }
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) {
    // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        return console.error(error);
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
    DBHelper.fetchReviews(id, (error, reviews) => {
      self.reviews = reviews;
      if (!reviews) {
        return console.error(error);
      }
      fillReviewsHTML();
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = '';

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('th');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = review => {
  const li = document.createElement('li');
  const name = document.createElement('h3');
  name.innerHTML = `${review.name}'s Review`;
  li.appendChild(name);

  const date = document.createElement('p');
  date.className = 'date';
  date.innerHTML = dateformat(review.updatedAt, 'yyyy-mm-dd');
  li.appendChild(date);

  const rating = document.createElement('div');
  rating.className = 'rating';

  for (let i = 0; i < 5; i++) {
    const checked = i < review.rating;
    rating.appendChild(createStar(checked));
  }

  const ratingText = document.createElement('span');
  ratingText.className = 'visually-hidden';
  ratingText.innerHTML = `${review.rating} out of 5 stars`;
  rating.appendChild(ratingText);

  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

const createStar = checked => {
  const star = document.createElement('span');
  star.setAttribute('aria-hidden', true);
  star.className = 'fa fa-star';
  if (checked) {
    star.className += ' checked';
  }

  return star;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
