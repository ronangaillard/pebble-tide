var moment = require('moment');

function getSec(time) {
  arr = time.split(':');
  return (+arr[0])*3600 + (+arr[1])*60 + (+arr[2]);
}

function request(url, type, callback) {
  console.log('request for ' + url);
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.setRequestHeader('Referer', 'https://maree.shom.fr/harbor/CANCALE/hlt/0?date=2021-06-27&utc=standard');
  xhr.send();
}

function fetchTide() {
  var url = 'https://services.data.shom.fr/b2q8lrcdl4s04cbabsj4nhcb/hdm/spm/wl?harborName=SAINT-MALO&duration=1&date=2021-06-27&utc=standard&nbWaterLevels=288';

  request(url, 'GET', function (respText) {
    var tideData = JSON.parse(respText);
    const today = moment().format('YYYY-MM-DD');
    var dt = new Date();
    var secsSinceMidnight = dt.getSeconds() + (60 * (dt.getMinutes() + (60 * dt.getHours())));

    // Find closest date
    const currentTide = tideData[today].filter(function(tide) {
      return (Math.abs(getSec(tide[0]) - secsSinceMidnight) < (3 * 60)); 
    })[0];

    console.log('tide height : ' + parseFloat(currentTide[1]) + 'm');

    Pebble.postMessage({
      tideData: {
        currentHeight: parseFloat(currentTide[1]),
      },
    });
  });
}

// https://developer.pebble.com/docs/pebblekit-js/Pebble/#on
Pebble.on('message', function (event) {
  console.log('Message received from watch:', event.data);

  fetchTide();
});

// https://www.worldtides.info/api/v2?heights&date=2021-06-27&lat=33.768321&lon=-118.195617&key=<apiKey>

