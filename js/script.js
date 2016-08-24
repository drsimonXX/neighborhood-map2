    var map;

    // blank array for all the listing markers
    var markers = [];

    // placemarkers array to control the number of places that show.
    var placeMarkers = [];

    function initMap() {
      // create map with zoom and center
      map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 41.7193929, lng: -87.6963421},
        zoom: 13
      });

      // array of locations, place names for list, place type for filter and search name for wiki api
      var locations = [
        {title: 'Noodles & Co.', search: 'Noodles and Company', type: 'soup noodles mac and cheese', location: {lat: 41.7212064, lng: -87.6831114}},
        {title: 'Wingstop', search: 'Wingstop', type: 'wings chicken', location: {lat: 41.7204176, lng: -87.6933674}},
        {title: 'Roseangela\'s Pizzeria', search: 'Roseangela\'s Pizzeria', type: 'pizza', location: {lat: 41.7208285, lng: -87.6924281}},
        {title: 'Portillo\'s Hot Dogs', search: 'Portillo\'s Restaurants', type: 'hot dogs burgers fries shakes', location: {lat: 41.7207885, lng: -87.72315709999999}},
        {title: 'Giordano\'s Pizzeria', search: 'Giordano\'s Pizzeria', type: 'pizza', location: {lat: 41.7186667, lng: -87.68151499999999}},
        {title: 'Potbelly Sandwich Shop', search: 'Potbelly Sandwich Works', type: 'sandwiches', location: {lat: 41.7195359, lng: -87.7492457}},
        {title: 'Entenmann\'s Bakery Outlet', search: 'Entenmann\'s', type: 'pastries cakes', location: {lat: 41.69624220000001, lng: -87.7404669}}
        ];

      var largeInfowindow = new google.maps.InfoWindow();
      var bounds = new google.maps.LatLngBounds();
      var defaultIcon = makeMarkerIcon('FF0000');
      var highlightedIcon = makeMarkerIcon('FFFF24');

      var model = function() {
        var self = this;
        self.placesList = ko.observableArray(locations);

        self.placesList().forEach(function(location, place) {
          location.marker = markers[place];
        });

		self.query = ko.observable('');
		self.filteredPlaces = ko.computed(function() {
		return ko.utils.arrayFilter(self.placesList(), function(location) {
		  if (location.type.toLowerCase().indexOf(self.query().toLowerCase()) >= 0) {
			location.marker.setVisible(true);
			return true;
		  } else {
			location.marker.setVisible(false);
			return false;
			}
		  });
	    }, self);

        self.marker = ko.observableArray(markers);

        self.clickMarker = function(location) {
          populateInfoWindow(location.marker, largeInfowindow);
          location.marker.setAnimation(google.maps.Animation.BOUNCE);
          stopAnimation(location.marker);
        };
      };

      window.onload = function() {
        ko.applyBindings(new model());
      };

      // use the location array to create an array of markers on initialize
      for (var i = 0; i < locations.length; i++) {
        var position = locations[i].location;
        var title = locations[i].title;
        var search = locations[i].search;

        // create a marker for each location, put into markers array
        var marker = new google.maps.Marker({
          map: map,
          position: position,
          title: title,
          search: search,
          animation: google.maps.Animation.DROP,
          icon: defaultIcon,
          id: i
        });

        // push the marker to the array of markers
        markers.push(marker);
        //extend the boundaries of the map for each marker
        bounds.extend(marker.position);

        // create a click or mouse event for each marker
        marker.addListener('click', function() {
          populateInfoWindow(this, largeInfowindow);
        });
        marker.addListener('mouseover', function() {
          this.setIcon(highlightedIcon);
        });
        marker.addListener('mouseout', function() {
          this.setIcon(defaultIcon);
        });
        marker.addListener('click', function() {
          this.setAnimation(google.maps.Animation.BOUNCE);
          stopAnimation(this);
        });
      }

      document.getElementById('show-listings').addEventListener('click', showListings);
      document.getElementById('hide-listings').addEventListener('click', hideListings);
    }

      // populate the info window if it's not already open
      function populateInfoWindow(marker, infowindow) {
        if (infowindow.marker != marker) {
          infowindow.setContent('');
          infowindow.marker = marker;
          // make sure the marker property is cleared if the infowindow is closed
          infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
          });
          var streetViewService = new google.maps.StreetViewService();
          var radius = 50;

          // get street view if status is ok, fill infowindow with info
          function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
              var nearStreetViewLocation = data.location.latLng;
              var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
                infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>' + '<div id="Wiki"></div>');

              // add wiki api search functionality for each place
              var wikiURL ='https://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=wikiCallBack&search=';

              $.ajax({
                url: wikiURL+marker.search,
                dataType: 'jsonp',
                timeout: 1000
                }).done(function(data) {
                    document.getElementById('Wiki').innerHTML = '<p>' + '<a href=' + data[3][0] + ' target="blank">Wikipedia</a></p>';
                }).fail(function(jqXHR, textStatus){
                    alert("The Wikipedia link search failed.");
              });

              // get streetview info to add to pano
              var panoramaOptions = {
                position: nearStreetViewLocation,
                pov : {
                  heading: heading,
                  pitch: 30
                }
              };
              var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
              infowindow.setContent('<div>' + marker.title + '</div>' + '<div>No Street View Found</div>');
            }
          }
          // use streetview service to get the closest streetview image within 50 meters of the marker's position
          streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
          // open the infowindow on the correct marker
          infowindow.open(map, marker);
        }
      }

      // display all markers when button is clicked
      function showListings() {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
          bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
      }

      // hide all markers when button is clicked
      function hideListings() {
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(null);
        }
      }

      function makeMarkerIcon(markerColor) {
        var markerImage = new google.maps.MarkerImage(
          'https://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
            '|40|_|%E2%80%A2',
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34),
            new google.maps.Size(21,34));
          return markerImage;
      }

      // place details search, get name, address, #, opening hours for infowindow
      function getPlacesDetails(marker, infowindow) {

        var service = new google.maps.places.PlacesService(map);
        service.getDetails({
          placeId: marker.id
        }, function(place, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            // set marker to this infowindow.
            infowindow.marker = marker;
            var innerHTML = '<div>';
            if (place.name) {
              innerHTML += '<strong>' + place.name + '</strong>';
            }
            if (place.formatted_address) {
              innerHTML += '<br>' + place.formatted_address;
            }
            if (place.formatted_phone_number) {
              innerHTML += '<br>' + place.formatted_phone_number;
            }
            if (place.opening_hours) {
              innerHTML += '<br><br><strong>Hours:</strong><br>' +
                place.opening_hours.weekday_text[0] + '<br>' +
                place.opening_hours.weekday_text[1] + '<br>' +
                place.opening_hours.weekday_text[2] + '<br>' +
                place.opening_hours.weekday_text[3] + '<br>' +
                place.opening_hours.weekday_text[4] + '<br>' +
                place.opening_hours.weekday_text[5] + '<br>' +
                place.opening_hours.weekday_text[6];
            }
            if (place.photos) {
              innerHTML += '<br><br><img src="' + place.photos[0].getUrl(
                  {maxHeight: 100, maxWidth: 200}) + '">';
            }
            innerHTML += '</div>';
            infowindow.setContent(innerHTML);
            infowindow.open(map, marker);

            infowindow.addListener('closeclick', function() {
              infowindow.marker = null;
            });
          }
        });
      }

      // stop the marker from bouncing after 3 bounces
      function stopAnimation(marker) {
        setTimeout(function() {
            marker.setAnimation(null);
          }, 2100);
      }

	  // Error handling if Google Map doesn't load
	  function googleError() {
		alert("The map has failed to load.");
	  }



