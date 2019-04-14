import { openDb } from 'idb';

export const dbPromise = () =>
  openDb('mws-restaurants', 2, upgradeDB => {
    switch (upgradeDB.oldVersion) {
      case 0:
        upgradeDB.createObjectStore('restaurants', { keyPath: 'id' });
      case 1:
        const reviewStore = upgradeDB.createObjectStore('reviews', {
          keyPath: 'id',
        });
        reviewStore.createIndex('restaurant_id', 'restaurant_id');
      case 2:
        upgradeDB.createObjectStore('pending', {
          keyPath: 'id',
          autoIncrement: true,
        });
    }
  });
