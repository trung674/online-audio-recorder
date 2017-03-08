'use strict';

var btnRecord = $('#btn-record');
var btnBack = $('#btn-back');
var btnNext = $('#btn-next');

var errorElement = $('#errorMsg');
var dataElement = $('#data');
var soundClips = $('div.sound-clips');
var canvas = document.querySelector('.visualizer'); // use Jquery selector here will cause mediaStream not running, weird bug
var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

var isSecureOrigin = location.protocol === 'https:' ||
location.host === 'localhost:3000';
if (!isSecureOrigin) {
  alert('getUserMedia() must be run from a secure origin: HTTPS or localhost.' +
    '\n\nChanging protocol to HTTPS');
  location.protocol = 'HTTPS';
}

// Media constraint
var constraints = window.constraints = {
  audio: true,
  video: false
};

function handleSuccess(mediaStream) {
  var audioTracks = mediaStream.getAudioTracks();
  console.log(mediaStream);
  console.log('Got stream with constraints:', constraints);
  console.log('Using audio device: ' + audioTracks[0].label);
  window.stream = mediaStream;
}

function handleError(error) {
  if (error.name === 'ConstraintNotSatisfiedError') {
    errorMsg('The resolution ' + constraints.video.width.exact + 'x' +
        constraints.video.width.exact + ' px is not supported by your device.');
  } else if (error.name === 'PermissionDeniedError') {
    errorMsg('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.');
  } else if (error.name === 'DevicesNotFoundError') {
    errorMsg('No recording device found');
  }
  errorMsg('getUserMedia error: ' + error.name, error);
}

function errorMsg(msg, error) {
  errorElement.innerHTML += '<p>' + msg + '</p>';
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

var socket = io.connect('http://localhost:3000');
socket.on('user', function(data){
  console.log(data);
  console.log("I heared you!");
});

var mediaRecorder;
var chunks = [];
var recordAudio;

function onBtnRecordClicked (){
  // startRecording
  recordAudio = new RecordRTC(window.stream, {recorderType: StereoAudioRecorder, sampleRate: 44100, bufferSize: 4096});
	// recordAudio.setRecordingDuration(5000);
  recordAudio.startRecording();
  visualize(window.stream);

  btnRecord.replaceWith("<a class='btn-control' id='btn-pause' onClick='onBtnPauseClicked()'><i class='fa fa-pause fa-4x'></i></a>");
}

function onBtnNextClicked(){
  var currentWord = $('#word').text();
  recordAudio.stopRecording(function() {
      // get audio data-URL
      recordAudio.getDataURL(function(audioDataURL) {
          var files = {
              audio: {
                  type: recordAudio.getBlob().type || 'audio/wav',
                  dataURL: audioDataURL,
                  word: currentWord,
                  username: username,
                  recordingID: recordingID
              }
          };
          socket.emit('incomingdata', files);
      });
  });
}

function onBtnPauseClicked(){
  $('#btn-pause').replaceWith("<a class='btn-control' id='btn-resume' onClick='onBtnResumeClicked()'><i class='fa fa-play fa-4x'></i></a>");
  recordAudio.pauseRecording();
	console.log("pause");
}

function onBtnResumeClicked(){
  $('#btn-resume').replaceWith("<a class='btn-control' id='btn-pause' onClick='onBtnPauseClicked()'><i class='fa fa-pause fa-4x'></i></a>");
  recordAudio.resumeRecording();
  console.log("resume");
}

function log(message){
	dataElement.innerHTML = dataElement.innerHTML+'<br>'+message ;
}

function download() {
  var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'test.ogg';
  a.click();
}

function visualize(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);

  var WIDTH = canvas.width
  var HEIGHT = canvas.height;

  draw()

  function draw() {

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;


    for(var i = 0; i < bufferLength; i++) {

      var v = dataArray[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();

  }
}
