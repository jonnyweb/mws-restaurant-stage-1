import { openDb, deleteDb } from 'idb';

export const dbPromise = () =>
  openDb('mws-restaurants', 1, upgradeDB => {
    switch (upgradeDB.oldVersion) {
      case 0:
        upgradeDB.createObjectStore('restaurants', { keyPath: 'id' });
    }
  });
