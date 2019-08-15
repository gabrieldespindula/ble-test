var canvas = document.querySelector('#waves');
var ccdCanvas = document.querySelector('#ccdDisplay');
var statusText = document.querySelector('#statusText');
var lbIntTime = document.getElementById("intTime");
var lbLaserDist = document.getElementById("laserDistance");
var lbLaserStart = document.getElementById("laserDetectPx");
var lbLaserLength = document.getElementById("laserWaveLength");
var ccdMode = document.getElementById("ccdModeSelector");

var heartRates = [];
var accelerometerX = [];
var accelerometerY = [];
var accelerometerZ = [];
var laserStart, laserLenght;
var chartLenght = 256;
var ccd = Array(260).fill(0);

statusText.addEventListener('click', function() {
  statusText.textContent = 'Connecting...';
  heartRates = [];
  accelerometerX = [];
  accelerometerY = [];
  accelerometerZ = [];
  tkba.connect()
  .then(() => tkba.startNotificationsAccelerometer().then(handleAccelerometer))
  .then(() => tkba.startNotificationsCCD().then(handleCCD))
  .catch(error => {
    statusText.textContent = error;
  });
});

function handleAccelerometer(accData) {
  console.log('Accelerometer event settled');
  var postscale = 0;
  
  accData.addEventListener('characteristicvaluechanged', event => {
    //console.log('New notification - ' + event.target.value.getUint8(0) + ' ' + event.target.value.getUint8(1) + ' ' + event.target.value.getUint8(2));
    //statusText.textContent = event.target.value.getUint8(0) + event.target.value.getUint8(1) + event.target.value.getUint8(2) + event.target.value.getUint8(3) + event.target.value.getUint8(1) + event.target.value.getUint8(4) + event.target.value.getUint8(5);
    var accX, accY, accZ;
    
    var sign = event.target.value.getUint8(1) & (1 << 7);
    var accX = (((event.target.value.getUint8(1) & 0xFF) << 8) | (event.target.value.getUint8(0) & 0xFF));
    if (sign) {
       accX = 0xFFFF0000 | accX;  // fill in most significant bits with 1's
    }
    var sign = event.target.value.getUint8(3) & (1 << 7);
    var accY = (((event.target.value.getUint8(3) & 0xFF) << 8) | (event.target.value.getUint8(2) & 0xFF));
    if (sign) {
       accY = 0xFFFF0000 | accY;  // fill in most significant bits with 1's
    }
    var sign = event.target.value.getUint8(5) & (1 << 7);
    var accZ = (((event.target.value.getUint8(5) & 0xFF) << 8) | (event.target.value.getUint8(4) & 0xFF));
    if (sign) {
       accZ = 0xFFFF0000 | accZ;  // fill in most significant bits with 1's
    }

    postscale++;
    if(postscale>=20){
      postscale=0;
//      heartRates.push(accY);
//     accelerometerX.push(accX);
//      accelerometerY.push(accY);
//      accelerometerZ.push(accZ);
//      drawWaves();
    }
  });
}

function handleCCD(ccdData) {
  console.log('CCD event settled');
  var postscale = 0;
  
  ccdData.addEventListener('characteristicvaluechanged', event => {
    statusText.textContent = event.target.byteLenght;
    //console.log(event.target.value);
    
    if(ccdMode.innerHTML === "3"){
  
      var data = [event.target.value.getUint8(5),
                  event.target.value.getUint8(4),
                  event.target.value.getUint8(3),
                  event.target.value.getUint8(2)];
      var buf = new ArrayBuffer(4);
      var view = new DataView(buf);
      data.forEach(function (b, i) {
          view.setUint8(i, b);
      });
      var num = view.getFloat32(0);
      lbLaserDist.innerHTML = num.toString() + "mm";
      lbIntTime.innerHTML = (event.target.value.getUint8(0)<<8 | event.target.value.getUint8(1)).toString() + " CPU clocks";

      ccd.fill(0);
      ccd[Math.round(num/0.0635)] = 2800;
      

      /*
      console.log(event.target.value.getUint8(0).toString() + " " +
                  event.target.value.getUint8(1).toString() + " " +
                  event.target.value.getUint8(2).toString() + " " +
                  event.target.value.getUint8(3).toString() + " " +
                  event.target.value.getUint8(4).toString() + " " +
                  event.target.value.getUint8(5).toString() );
      */
    }
    else {

      if((event.target.value.getUint8(0) == 0xac && event.target.value.getUint8(5) == 0xac) || postscale > 25){
        postscale=0;

        laserStart = event.target.value.getUint8(3);
        laserLenght = event.target.value.getUint8(4);

        if(ccdMode.innerHTML === "2"){
          chartLenght = laserLenght;
        }
        
        lbLaserStart.innerHTML = "pixel number " + laserStart.toString();
        lbLaserLength.innerHTML = laserLenght.toString() + " pixels";
        lbIntTime.innerHTML = (event.target.value.getUint8(1)<<8 | event.target.value.getUint8(2)).toString() + " CPU clocks";
        lbLaserDist.innerHTML = ((event.target.value.getUint8(3)+(event.target.value.getUint8(4).toString()/2))*0.0635).toString() + "mm";
      }

      for(var i=0 ; i<20 ; i+=2){
        ccd[postscale*10+i/2]=(((event.target.value.getUint8(i) & 0xFF) << 8) | (event.target.value.getUint8(i+1) & 0xFF));
      }
      if(ccdMode.innerHTML === "1"){
        ccd[postscale*10+10]=0xaaaaaaaa; //Add a peak just to visualize the "scanning"
      }

      postscale++;
    }

    drawCCD();
    drawWaves();
  });
}

function drawCCD() {
  requestAnimationFrame(() => {
    ccdCanvas.width = parseInt(getComputedStyle(canvas).width);
    ccdCanvas.height = 50;
    
    var context = ccdCanvas.getContext('2d');
    context.clearRect(0, 0, ccdCanvas.width, ccdCanvas.height);

    var square_side = canvas.width/chartLenght;
    for(var i = 3; i<258 ; i++)
    {
      var pixel = ((ccd[i]>>4).toString(16));
      var RR = ((pixel.length==1)?("0"+pixel):(pixel));
      context.fillStyle = '#'+RR+'0000';
      context.fillRect((i-3)*square_side, 0, square_side, 50);
      context.stroke();
    }
  });
}


function drawWaves() {
  requestAnimationFrame(() => {
    canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
    canvas.height = 200;//parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;

    var context = canvas.getContext('2d');
    var margin = 2;
    var max = Math.max(0, Math.round(canvas.width / 11));
    var offset = Math.max(0, heartRates.length - max);
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.lineWidth = 6;
    context.lineJoin = 'round';
    context.shadowBlur = '1';
    context.strokeStyle = '#581845';
    context.shadowOffsetY = '1';
    for (var i = 0; i < Math.max(accelerometerX.length, max); i++) {
      var lineHeight = Math.round(5*canvas.height/6 + accelerometerX[i + offset ]/100);//Math.round(heartRates[i + offset ] * canvas.height / 200);
      if (i === 0) {
        context.moveTo(11 * i, canvas.height - lineHeight);
      } else {
        context.lineTo(11 * i, canvas.height - lineHeight);
      }
      context.stroke();
    }

    context.beginPath();
    context.lineWidth = 6;
    context.lineJoin = 'round';
    context.shadowBlur = '1';
    context.strokeStyle = '#900c3f';
    context.shadowOffsetY = '1';
    for (var i = 0; i < Math.max(accelerometerY.length, max); i++) {
      var lineHeight = Math.round(3*canvas.height/6 + accelerometerY[i + offset ]/100);//Math.round(heartRates[i + offset ] * canvas.height / 200);
      if (i === 0) {
        context.moveTo(11 * i, canvas.height - lineHeight);
      } else {
        context.lineTo(11 * i, canvas.height - lineHeight);
      }
      context.stroke();
    }

    context.beginPath();
    context.lineWidth = 6;
    context.lineJoin = 'round';
    context.shadowBlur = '1';
    context.strokeStyle = 'c70039';
    context.shadowOffsetY = '1';
    for (var i = 0; i < Math.max(accelerometerZ.length, max); i++) {
      var lineHeight = Math.round(1*canvas.height/6 + accelerometerZ[i + offset ]/100);//Math.round(heartRates[i + offset ] * canvas.height / 200);
      if (i === 0) {
        context.moveTo(11 * i, canvas.height - lineHeight);
      } else {
        context.lineTo(11 * i, canvas.height - lineHeight);
      }
      context.stroke();
    }

    context.beginPath();
    context.lineWidth = 6;
    context.lineJoin = 'round';
    context.shadowBlur = '1';
    
    var square_side = canvas.width/chartLenght;
    for(var i = 3; i<258 ; i++)
    {
      if (i === 3) {
        context.moveTo(square_side * (i-3), canvas.height-((ccd[i]>>4)&0xff)-10);
      } else {
          context.lineTo(square_side * (i-3), canvas.height-((ccd[i]>>4)&0xff)-10);
      }
    }
    context.stroke();
  });
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    drawCCD();
    drawWaves();
  }
});

