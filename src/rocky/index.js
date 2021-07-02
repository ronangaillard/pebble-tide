var rocky = require('rocky');

// An object to cache our date & time values,
// to minimize computations in the draw handler.
var clockData = {
  time: '',
  date: ''
};

var currentTideHeight = 0;

var nextTide = [
];

var coefficient = 0;

var dayTides = {
  firstTideDate: undefined,
  data: undefined
}

var highLowTides = {
  data: undefined
}

function secondsSinceMidnight(hourMinutes) {
  var hourMinutesArray = hourMinutes.split(':');
  return (parseInt(hourMinutesArray[0]) * 60 +  parseInt(hourMinutesArray[1])) * 60;
}
function padLeadingZeros(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
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

function parseISOLocal(s) {
  var b = s.split(/\D/);
  return new Date(b[0], b[1]-1, b[2], b[3], b[4], b[5]);
}

function updateCurrentTide() {
  var dt = new Date();
  // Tides
  var diffTime = Math.abs(dt - dayTides.firstTideDate);
  console.log('diffTime : ' + dt + ' ... ' +  dayTides.firstTideDate + ' ... ' + diffTime)
  var tideIndex = Math.floor(diffTime / 1000 / 60 / 5);
  console.log('tideIndex : '+ tideIndex)
  console.log(dayTides.data);

  currentTideHeight = dayTides.data[tideIndex];

  if(tideIndex >= dayTides.data.length - 1) {
    rocky.postMessage({request: 'request for tides'});
  }

  var secsSinceMidnight = dt.getSeconds() + (60 * (dt.getMinutes() + (60 * dt.getHours())));

  var today = dateToString(dt);
  dt.setDate(dt.getDate() + 1)
  var tomorrow = dateToString(dt);

  var tides = highLowTides[today].filter(function(tide) { return secondsSinceMidnight(tide[1]) > secsSinceMidnight;});
  console.log(tides)
  var tides = tides.concat( highLowTides[tomorrow]);

  console.log(tides);

  nextTide = [ {
    type: tides[0][0] === "tide.high" ? "PM" : "BM",
    height: tides[0][2],
    time: tides[0][1]
  },
  {
    type: tides[1][0] === "tide.high" ? "PM" : "BM",
    height: tides[1][2],
    time: tides[1][1]
  }];

  coefficient = tides[0][0] === "tide.high" ? tides[0][3] : tides[1][3]; 
}

// Every minute
// https://developer.pebble.com/docs/rockyjs/rocky/#on
rocky.on('minutechange', function(event) {
  // Current date/time
  // https://developer.pebble.com/docs/rockyjs/Date/
  var d = new Date();

  // Get current time, based on 12h or 24h format (01:00 or 1:00 AM)
  // clockData.time = d.toLocaleTimeString().replace(/:\d+($| )/, '$1');
  clockData.time = padLeadingZeros(d.getHours(), 2) + ':' + padLeadingZeros(d.getMinutes(), 2);

  // Day of month
  var day = d.getDate();

  // Month name
  var month = d.getMonth() + 1;

  // Date
  clockData.date = (day + ' ' + month);

  updateCurrentTide();

  // Force screen redraw
  rocky.requestDraw();
});

// Redraw the screen
rocky.on('draw', function(event) {
  // Drawing canvas
  var ctx = event.context;

  // Clear the canvas
  // https://developer.pebble.com/docs/rockyjs/CanvasRenderingContext2D/#Canvas
  ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);

  // UnobstructedArea
  // https://developer.pebble.com/docs/rockyjs/CanvasRenderingContext2D/#Canvas
  var offsetY = (ctx.canvas.clientHeight - ctx.canvas.unobstructedHeight) / 2;
  var centerX = ctx.canvas.unobstructedWidth / 2;

  // Text formatting
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  // Time font
  // https://developer.pebble.com/docs/rockyjs/CanvasRenderingContext2D/#font
  ctx.font = '36px bold numbers Leco-numbers';

  // Time
  ctx.fillText(clockData.time, centerX, (50 - offsetY));

  // Date font
  ctx.font = '18px bold Gothic';

  // Date
  ctx.fillText(clockData.date, centerX, (94 - offsetY));

  // Tide height
  ctx.fillText('actuelle : ' + currentTideHeight + ' m', centerX, (120 - offsetY));

  // Tide height
  ctx.fillText('coef ' + coefficient, centerX, (140 - offsetY));

  // Tide height
  ctx.fillText(nextTide[0].time + " (" + nextTide[0].type + ")" + " : " + nextTide[0].height + "m", centerX, (5 - offsetY));

  ctx.fillText(nextTide[1].time + " (" + nextTide[1].type + ")" + " : " + nextTide[1].height + "m", centerX, (25 - offsetY));
});

rocky.on('message', function(event) {
  // Receive a message from the mobile device (pkjs)
  var message = event.data;

  if (message.dayTides) {
    console.log("the watch received tides");
    dayTides = message.dayTides;
    dayTides.data = message.dayTides.tides;
    dayTides.firstTideDate = parseISOLocal(message.dayTides.firstTideDate);
    updateCurrentTide();
    // Request a redraw so we see the information
    rocky.requestDraw();
  }

  if (message.highLowTides) {
    console.log("the watch received high low tides");
    highLowTides = message.highLowTides;
    updateCurrentTide();
    // Request a redraw so we see the information
    rocky.requestDraw();
  }
});


// Send a single message to the Phone
// https://developer.pebble.com/docs/rockyjs/rocky/#postMessage
rocky.postMessage({request: 'request for tides'});
