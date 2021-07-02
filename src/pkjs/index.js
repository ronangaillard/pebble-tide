console.log('#########################################################################');

var dayTides = {
  fetchDate: undefined,
  data: undefined
}

var highLowTides = {
  fetchDate: undefined,
  data: undefined
}

function getSec(time) {
  arr = time.split(':');
  return (+arr[0])*3600 + (+arr[1])*60 + (+arr[2]);
}

function isToday(someDate) {
  const today = new Date()
  return someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
}

function dateToString(date) {
  var month = (date.getMonth() + 1).toString();
  if(month.length == 1) {
    month = '0' + month;
  }
  
  var day = date.getDate().toString();
  if(day.length == 1) {
    day = '0' + day;
  }

  return [date.getFullYear(), month, day].join('-');
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

function fetchTide(callback) {
  const dt = new Date();
  const today = dateToString(dt);
  var url = 'https://services.data.shom.fr/b2q8lrcdl4s04cbabsj4nhcb/hdm/spm/wl?harborName=SAINT-MALO&duration=2&date=' + today + '&utc=standard&nbWaterLevels=288';

  request(url, 'GET', function (respText) {
    dayTides.data = JSON.parse(respText);
    dayTides.fetchDate = new Date();
    callback();
  });
}

function fetchHighLowTide(callback) {
  const dt = new Date();
  const today = dateToString(dt);
  var url = 'https://services.data.shom.fr/b2q8lrcdl4s04cbabsj4nhcb/hdm/spm/hlt?harborName=SAINT-MALO&duration=7&date=' + today +'&utc=standard&correlation=1';

  request(url, 'GET', function (respText) {
    console.log(respText);
    highLowTides.data = JSON.parse(respText);
    highLowTides.fetchDate = new Date();
    callback();
  });
}

function publishTidesToPebble() {
  var dt = new Date();
  const today = dateToString(dt);
  dt.setDate(dt.getDate() + 1)
  const tomorrow = dateToString(dt);
  var secsSinceMidnight = dt.getSeconds() + (60 * (dt.getMinutes() + (60 * dt.getHours())));

  // Find closest date
  const currentTideIndex = Math.floor(secsSinceMidnight / 60 / 5);

  const samplesToSend = 2 * 60 / 5;

  var tidesToSend = dayTides.data[today].slice(currentTideIndex, Math.min(dayTides.data[today].length, currentTideIndex + samplesToSend));


  if(tidesToSend.length !== samplesToSend) {
    tidesToSend = tidesToSend.concat(dayTides.data[tomorrow].slice(0, samplesToSend - tidesToSend.length));
  }

  tidesToSend = tidesToSend.map(function(tide) {
    return tide[1];
  })
  
  // Send next 2 hours tides
  // tides data is available every 5 minutes
  // so 2 hours is 24 samples
  const dataToSend = {
    firstTideDate: new Date(Date.parse(today + 'T' + dayTides.data[today][currentTideIndex][0] )).toISOString(),
    tides: tidesToSend
  }

  console.log("sending to pebble : " + dataToSend.firstTideDate);

  Pebble.postMessage({dayTides: dataToSend});
}

function publishHighLowTidesToPebble() {
  console.log('high low' + highLowTides.data);

  Pebble.postMessage({highLowTides: highLowTides.data});
}

// https://developer.pebble.com/docs/pebblekit-js/Pebble/#on
Pebble.on('message', function (event) {
  console.log('Message received from watch:', event.data);

  if(dayTides.fetchDate === undefined || !isToday(dayTides.fetchDate)) {
    fetchTide(publishTidesToPebble);
  } else {
    publishTidesToPebble();
  }

  if(highLowTides.fetchDate === undefined || !isToday(highLowTides.fetchDate)) {
    fetchHighLowTide(publishHighLowTidesToPebble);
  } else {
    publishHighLowTidesToPebble();
  }

});
