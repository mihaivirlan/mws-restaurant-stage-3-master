importScripts('idb.js');

var cacheName = 'v1';
var contentImgsCache = 'imgs';

var cacheFiles = [
    '../js/index.html',
    '../js/restaurant.html',
    '../css/styles.css',
    '../css/desktop.css',
    '../css/tablet.css',
    '../css/mobile.css',
    '../js/app.js',
    '../js/dbhelper.js',
    '../js/main.js',
    '../js/service-worker.js',
    '../manifest.json'
];

//Ran when SW is installed. Creates Cache
self.addEventListener('install', function (event) {
    console.log("[ServiceWorker] Installed");
    event.waitUntil(
        caches.open(cacheName).then(function (cache) {
        return cache.addAll(cacheFiles);
    }));
});

//Service Worker Activate
self.addEventListener('activate', function(event) {
    console.log("[ServiceWorker] Activating");
    createIndexedDB();
    fetchJSON();
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheValue) {
                    if(cacheValue !== cacheName) return true;
                }).map(function(cacheValue) {
                    return caches.delete(cacheValue);
                })
            );
        })
    );
});

//Fetch Events
self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {


      if(event.request.url.endsWith('/restaurants')){
          event.respondWith(
              idb.open('data', 1).then(function(db) {
                  var tx = db.transaction(['restaurants'], 'readonly');
                  var store = tx.objectStore('restaurants');
                  return store.getAll();
              }).then(function(items) {
                  return new Response(JSON.stringify(items),  { "status" : 200 , "statusText" : "MyOwnResponseHaha!" })
              })
          )

      } else if( requestUrl.pathname.startsWith('/img/') && event.request.url.endsWith('.webp')){
          event.respondWith(serveImg(event.request));
          return

      } else {
          event.respondWith(
              caches.match(event.request).then(function(response) {
                  if (response) {
                      return response;
                  }
                  return fetch(event.request)
              }).catch(function(error) {
                  console.log(error)
              })
          );
      }


  }


})





//IndexedDB
function createIndexedDB() {
  self.indexedDB = self.indexedDB || self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;

  if (!(self.indexedDB)) { console.console.log('IDB not supported'); return null;}
  return idb.open('data', 1, function(upgradeDb) {
    if (!upgradeDb.objectStoreNames.contains('restaurants')) {
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
    }
  });
}


function fetchJSON() {
  fetch('/restaurants')
  .then((resp) => resp.json())
  .then((resp)=> {
    var dbPromise = idb.open('data');
    dbPromise.then(function(db) {
      var tx = db.transaction('restaurants', 'readwrite');
      var store = tx.objectStore('restaurants');
      return Promise.all(resp.map(function(item) {
        return store.add(item);
      })
      ).catch(function(e) {
        tx.abort();
        console.log(e);
      })
    })

  })
  .catch((err)=> console.log(err));
};


function serveImg(request) {
  var storageUrl = request.url.replace(/-\dx\.jpg$/, '');
    return caches.open(contentImgsCache).then(function(cache) {
      return cache.match(storageUrl).then(function(response) {
        var networkFetch = fetch(request).then(function(networkResponse) {
            cache.put(storageUrl, networkResponse.clone());
            return networkResponse;
        });
        return response || networkFetch;
      });
    });
}
