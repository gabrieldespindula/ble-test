var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');

statusText.addEventListener('click', function() {
  statusText.textContent = 'Breathe...';
  heartRates = [];
  heartRateSensor.connect()
  .then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
    statusText.textContent = error;
  });
});

function handleHeartRateMeasurement(heartRateMeasurement) {
  console.log('New event');
  var postscale = 0;
  heartRateMeasurement.addEventListener('characteristicvaluechanged', event => {
    //console.log('New notification - ' + event.target.value.getUint8(0) + ' ' + event.target.value.getUint8(1) + ' ' + event.target.value.getUint8(2));
    var accX;
    //var heartRateMeasurement = heartRateSensor.parseHeartRate(event.target.value);
    var sign = event.target.value.getUint8(1) & (1 << 7);
    var accX = (((event.target.value.getUint8(1) & 0xFF) << 8) | (event.target.value.getUint8(0) & 0xFF));
    if (sign) {
       accX = 0xFFFF0000 | accX;  // fill in most significant bits with 1's
    }
    statusText.textContent = 'Accelerometer X = ' + accX;
    postscale++;
    if(postscale>=20){
      postscale=0,
      heartRates.push(accX);
      drawWaves();
    }
    //statusText.innerHTML = heartRateMeasurement.heartRate;
    //heartRates.push(heartRateMeasurement.heartRate);
    //drawWaves();
    });
}

var heartRates = [];
var mode = 'bar';

canvas.addEventListener('click', event => {
  mode = line;
  //mode = mode === 'bar' ? 'line' : 'bar';
  drawWaves();
});

function drawWaves() {
  requestAnimationFrame(() => {
    canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
    canvas.height = parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;

    var context = canvas.getContext('2d');
    var margin = 2;
    var max = Math.max(0, Math.round(canvas.width / 11));
    var offset = Math.max(0, heartRates.length - max);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#00796B';
    if (mode === 'bar') {
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var barHeight = Math.round(5*canvas.height/6 + heartRates[i + offset ]/100);//Math.round(heartRates[i + offset ] * canvas.height / 200);
        context.rect(11 * i + margin, canvas.height - barHeight, margin, Math.max(0, barHeight - margin));
        context.stroke();
      }
    } else if (mode === 'line') {
      context.beginPath();
      context.lineWidth = 6;
      context.lineJoin = 'round';
      context.shadowBlur = '1';
      context.shadowColor = '#333';
      context.shadowOffsetY = '1';
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var lineHeight = Math.round(5*canvas.height/6 + heartRates[i + offset ]/100);//Math.round(heartRates[i + offset ] * canvas.height / 200);
        if (i === 0) {
          context.moveTo(11 * i, canvas.height - lineHeight);
        } else {
          context.lineTo(11 * i, canvas.height - lineHeight);
        }
        context.stroke();
      }
    }
  });
}

window.onresize = drawWaves;

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    drawWaves();
  }
});
