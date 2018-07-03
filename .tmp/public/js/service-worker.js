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
    '../js/dbhelper.js',
    '../js/main.js',
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
    fetchRestaurantsJSON();
    fetchReviewsJSON();
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

      //HANDLING POST REQUESTS
       if(event.request.method === "POST" && requestUrl.pathname.includes('/restaurant.html')){
         console.log(requestUrl);
         var newReview = {};
         var sendReview = {};

              //finds post parameters
              event.request.formData().then(formData => {

                for(var pair of formData.entries()) {
                  var key = pair[0];
                  var value =  pair[1];
                  newReview[key] = value;
                }

              }).then(
                //adds object to idb

                idb.open('data', 1).then(db => {
                      var tx = db.transaction('reviews', 'readwrite');
                      var store = tx.objectStore('reviews');
                      store.count().then(ct => { sendReview['id'] = parseInt(ct+1);
                                                 sendReview['restaurant_id'] = parseInt(newReview['restaurant_id']);
                                                 sendReview['name'] = newReview['name'];
                                                 sendReview['createdAt'] = new Date().getTime();
                                                 sendReview['updatedAt'] = new Date().getTime();
                                                 sendReview['rating'] = parseInt(newReview['rating']);
                                                 sendReview['comments'] = newReview['comments'];
                                                 console.log(sendReview);
                                                 store.add(sendReview);
                                               });
                      return tx.complete;
                   })
              ).then( () => {

                    fetch('../reviews/', { method: 'POST',
                                          headers: {
                                                    'Accept': 'application/json',
                                                    'Content-Type': 'application/json'
                                                    },
                                          body: JSON.stringify(newReview)
                    })

                    }
              );

          //reloads current page
           event.respondWith(
              fetch('../js/restaurant.html?id=' + sendReview['restaurant_id'] , {method: 'GET'})
           )
       }

       else if(event.request.method === "PUT" && requestUrl.pathname.includes('/restaurants') && requestUrl.href.includes('is_favorite')  ) {
          var url_favorite = (requestUrl.searchParams.get('is_favorite')==='true')? 'true' : 'false';
          var url_id = parseInt(requestUrl.pathname.split("/")[2]);

          idb.open('data', 1).then( db => {

               var tx = db.transaction('restaurants', 'readwrite');
               var store = tx.objectStore('restaurants');
               var newRestaurantData;
               store.get(url_id).then(val => {
                 newRestaurantData = val;
                 newRestaurantData['is_favorite'] = url_favorite;
                 store.put(newRestaurantData);
                 //console.log(newRestaurantData);
               })
               return tx.complete;
             })

          event.respondWith(
             fetch(requestUrl, {method: 'PUT'})
          )

       }

       else if(event.request.url.endsWith('/restaurants')){
          event.respondWith(
              idb.open('data', 1).then(function(db) {
                  var tx = db.transaction('restaurants', 'readonly');
                  var store = tx.objectStore('restaurants');
                  return store.getAll();
              }).then(function(item) {
                  return new Response(JSON.stringify(item),  { "status" : 200 , "statusText" : "MyOwnResponseHaha!" })
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


});

//IndexedDB
function createIndexedDB() {
  self.indexedDB = self.indexedDB || self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;

  if (!(self.indexedDB)) { console.console.log('IDB not supported'); return null;}

  return idb.open('data', 1, function(upgradeDb) {
    if (!upgradeDb.objectStoreNames.contains('restaurants')) {
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
    }
  });
}


function fetchRestaurantsJSON() {
  fetch('../restaurants')
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
}

function fetchReviewsJSON() {
  fetch('../reviews')
  .then((resp) => resp.json())
  .then((resp)=> {
    var dbPromise = idb.open('data');
    dbPromise.then(function(db) {
      var tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');
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
}



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
