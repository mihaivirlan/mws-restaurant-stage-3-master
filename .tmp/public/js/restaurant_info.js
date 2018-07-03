let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {

    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }

      fillRestaurantHTML();
      callback(null, restaurant)
    });


  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = 'Image ' + restaurant.name;

  const favImage = document.querySelector('.fav-image');

  if(restaurant.is_favorite === 'false'){
    favImage.src = "../icons/star-empty.png";
    favImage.setAttribute('data-val', 'false');
  } else if(restaurant.is_favorite === 'true') {
    favImage.src = "../icons/star-fav-full.png";
    favImage.setAttribute('data-val', 'true');
  } else {
    favImage.src = "../icons/star-empty.png";
    favImage.setAttribute('data-val', 'false');
  }

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  // fill reviews
  fetch('../reviews/?restaurant_id=' + getParameterByName('id'), { method: 'GET', headers: { 'Content-type': 'application/json; charset=UTF-8' }})
  .then(response => {
    return response.json();
  })
  .then(myJson => {
    fillReviewsHTML(myJson)
    //console.log(myJson);
  })

  //fill restaurant_id
  var rest = document.querySelector('.rating-restaurant');
  rest.value = getParameterByName('id');


};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
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
fillReviewsHTML = (reviews) => {
  const container = document.getElementById('reviews-container');
    container.className = 'class-rw-container';

    const myh2 = document.createElement('div');
    myh2.className = 'review-h2';
    container.appendChild(myh2);

  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  myh2.appendChild(title);

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

createReviewHTML = (review) => {
    const li = document.createElement('li');

    //Create div classes for name and date pharagraphs
    const mydiv = document.createElement('div');
    mydiv.className = 'review-title';
    li.appendChild(mydiv);


    //Create first div class for name pharagraph
    const firstparagraph = document.createElement('div');
    firstparagraph.className = 'first-paragraf';
    mydiv.appendChild(firstparagraph);

    const name = document.createElement('p');
    name.innerHTML = review.name;
    firstparagraph.appendChild(name);

    //Create first div class for date pharagraph
    const secondpharagraph = document.createElement('div');
    secondpharagraph.className = 'second-paragraf';
    mydiv.appendChild(secondpharagraph);

    const date = document.createElement('p');
    date.innerHTML = new Date(review.createdAt).toDateString();
    secondpharagraph.appendChild(date);


    //Create first div class for evaluate pharagraph
    const lastdiv = document.createElement('div');
    lastdiv.className = 'evaluate-star';
    li.appendChild(lastdiv);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    lastdiv.appendChild(rating);

    //Create div class for comments pharagraph
    const commentsdiv =document.createElement('div');
    commentsdiv.className = 'comments';
    li.appendChild(commentsdiv);


    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    commentsdiv.appendChild(comments);
    return li;
};


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {

  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.innerHTML = restaurant.name;
  a.setAttribute('href', '#');
  a.setAttribute('aria-current', 'page');
  li.appendChild(a);
  breadcrumb.appendChild(li);

};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

//CUSTOM
// Get the modal
var modal = document.getElementById('myModal');

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function() {
    modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};
// Function change content stars
function change(img) {
    var datastar = parseInt(img.getAttribute('data-star'));
    var datavalue = img.getAttribute('data-value');
    var rating = document.querySelector('.rating-review');
    var currentRating = parseInt(rating.getAttribute('value'));
    var today = new Date();

    if (datastar-1 === currentRating || datastar ===currentRating) {

        if (datavalue === 'off') {
            img.src = '../icons/star-full.png';
            img.setAttribute('data-value', 'on');
            rating.setAttribute('value', parseInt(currentRating) + 1);
        } else if (datavalue === 'on') {
            img.src = '../icons/star-empty.png';
            img.setAttribute('data-value', 'off');
            rating.setAttribute('value', parseInt(currentRating) - 1);
        } else {
            console.log('uncaught exception')
        }

    }

}

function updateFavorite(){
  const favImg = document.querySelector('.fav-image');
  var is_fav = 'false';

  if (favImg.getAttribute('data-val') === 'false'){
      favImg.src = '../icons/star-fav-full.png';
      favImg.setAttribute('data-val', 'true');
      is_fav = 'true';
  } else {
      favImg.src = '../icons/star-empty.png';
      favImg.setAttribute('data-val', 'false');
      is_fav = 'false';
  }

  fetch('../restaurants/' + getParameterByName('id') + '/?is_favorite=' + is_fav, { method: 'PUT'});

}


//END CUSTOM
