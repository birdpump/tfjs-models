//copy pasted from most recent code
/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';

import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`);

import * as faceDetection from '@tensorflow-models/face-detection';

import { Camera } from './camera';
import { setupDatGui } from './option_panel';
import { STATE, createDetector } from './shared/params';
import { setupStats } from './shared/stats_panel';
import { setBackendAndEnvFlags } from './shared/util';

let detector, camera, stats;
let startInferenceTime, numInferences = 0;
let inferenceTimeSum = 0, lastPanelUpdate = 0;
let rafId;



//TODO myvars
let kill = true


async function checkGuiUpdate() {
  if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {
    camera = await Camera.setupCamera(STATE.camera);
    STATE.isTargetFPSChanged = false;
    STATE.isSizeOptionChanged = false;
  }

  if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
    STATE.isModelChanged = true;

    window.cancelAnimationFrame(rafId);

    if (detector != null) {
      detector.dispose();
    }

    if (STATE.isFlagChanged || STATE.isBackendChanged) {
      await setBackendAndEnvFlags(STATE.flags, STATE.backend);
    }

    try {
      detector = await createDetector(STATE.model);
    } catch (error) {
      detector = null;
      alert(error);
    }

    STATE.isFlagChanged = false;
    STATE.isBackendChanged = false;
    STATE.isModelChanged = false;
  }
}

function beginEstimateFaceStats() {
  startInferenceTime = (performance || Date).now();
}

function endEstimateFaceStats() {
  const endInferenceTime = (performance || Date).now();
  inferenceTimeSum += endInferenceTime - startInferenceTime;
  ++numInferences;

  const panelUpdateMilliseconds = 1000;
  if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = inferenceTimeSum / numInferences;
    inferenceTimeSum = 0;
    numInferences = 0;
    stats.customFpsPanel.update(
      1000.0 / averageInferenceTime, 120 /* maxValue */);
    lastPanelUpdate = endInferenceTime;
  }
}

async function renderResult() {
  if (camera.video.readyState < 2) {
    await new Promise((resolve) => {
      camera.video.onloadeddata = () => {
        resolve(video);
      };
    });
  }

  let faces = null;

  // Detector can be null if initialization failed (for example when loading
  // from a URL that does not exist).
  if (detector != null) {
    // FPS only counts the time it takes to finish estimateFaces.
    beginEstimateFaceStats();

    // Detectors can throw errors, for example when using custom URLs that
    // contain a model that doesn't provide the expected output.
    try {
      faces =
        await detector.estimateFaces(camera.video, { flipHorizontal: false });
    } catch (error) {
      detector.dispose();
      detector = null;
      alert(error);
    }

    endEstimateFaceStats();
  }



  try {
    // let faceX = faces[0].keypoints[0].x
    // let faceY = faces[0].keypoints[0].y
    let faceX = (faces[0].box.xMin) + (faces[0].box.width / 2)
    let faceY = (faces[0].box.yMin) + (faces[0].box.height / 2)
    if(!kill) moveCamera(faceX, faceY);
    // console.log(faces[0])



  } catch (error) {
    console.log(error)
    
  }



  camera.drawCtx();

  // The null check makes sure the UI is not in the middle of changing to a
  // different model. If during model change, the result is from an old model,
  // which shouldn't be rendered.
  if (faces && faces.length > 0 && !STATE.isModelChanged) {
    camera.drawResults(
      faces, STATE.modelConfig.boundingBox, STATE.modelConfig.keypoints);
  }
}

async function renderPrediction() {
  await checkGuiUpdate();

  if (!STATE.isModelChanged) {
    await renderResult();
  }

  rafId = requestAnimationFrame(renderPrediction);
};

async function app() {
  // Gui content will change depending on which model is in the query string.
  const urlParams = new URLSearchParams(window.location.search);

  await setupDatGui(urlParams);

  stats = setupStats();

  camera = await Camera.setupCamera(STATE.camera);

  await setBackendAndEnvFlags(STATE.flags, STATE.backend);

  detector = await createDetector();

  renderPrediction();
};




//////////////// my code start
let inset = 50;
let offset = 60;
let movey = false;
let movex = false;

const smoothingFactor = 0.5;

let prevFaceCenterX = 0;
let prevFaceCenterY = 0;

const updateRate = 30; // 20mil

let lastUpdateTimestamp = 0;

function moveCamera(faceCenterX, faceCenterY) {
  const currentTime = Date.now();

  if (currentTime - lastUpdateTimestamp >= updateRate) {
    lastUpdateTimestamp = currentTime;

    let xcen = camera.video.width / 2;
    let ycen = camera.video.height / 2;

    // smoothing
    const smoothedFaceCenterX = (1 - smoothingFactor) * prevFaceCenterX + smoothingFactor * faceCenterX;
    const smoothedFaceCenterY = (1 - smoothingFactor) * prevFaceCenterY + smoothingFactor * faceCenterY;

    if (movey) {
      // up axis
      if (smoothedFaceCenterY < ycen) {
        sendDegrees(0, -1);
      }

      // down axis
      if (smoothedFaceCenterY > ycen) {
        sendDegrees(0, 1);
      }
    }

    if (movex) {
      // right axis
      if (smoothedFaceCenterX < xcen) {
        sendDegrees(1, 0);
      }

      // left axis
      if (smoothedFaceCenterX > xcen) {
        sendDegrees(-1, 0);
      }
    }

    if (ycen - inset < smoothedFaceCenterY && ycen + inset > smoothedFaceCenterY) {
      movey = false;
    }

    if (xcen - inset < smoothedFaceCenterX && xcen + inset > smoothedFaceCenterX) {
      movex = false;
    }

    if (!movey && (ycen - offset > smoothedFaceCenterY || ycen + offset < smoothedFaceCenterY)) {
      movey = true;
    }

    if (!movex && (xcen - offset > smoothedFaceCenterX || xcen + offset < smoothedFaceCenterX)) {
      movex = true;
    }

    prevFaceCenterX = smoothedFaceCenterX;
    prevFaceCenterY = smoothedFaceCenterY;
  }
}


let port;
const button = document.getElementById('myButton');

// Add a click event listener to the button
button.addEventListener('click', function () {
  connect();
});

const killbtn = document.getElementById('killButton');

// Add a click event listener to the button
killbtn.addEventListener('click', function () {
  if(kill){
    kill = false
    killbtn.style.backgroundColor = "green"
  }else{
    kill = true
    killbtn.style.backgroundColor = "red"
  }
});

const resetbtn = document.getElementById('centerButton');

// Add a click event listener to the button
resetbtn.addEventListener('click', function () {
  if (!port || !port.writable) {
    console.error("Port is not open. Make sure to connect first.");
    return;
  }

  const data = `<P100T100>`; // Wrapping data in < and >
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  const writer = port.writable.getWriter();
  writer.write(encoded).catch(err => console.error('Error writing to port:', err));
  writer.releaseLock();
});


export async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
  } catch (err) {
    console.error('Error connecting:', err);
  }
}



function sendDegrees(pan, tilt) {
  // console.log(`${pan}, ${tilt}`)
  if (!port || !port.writable) {
    console.error("Port is not open. Make sure to connect first.");
    return;
  }

  const data = `<P${pan}T${tilt}>`; // Wrapping data in < and >
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  const writer = port.writable.getWriter();
  writer.write(encoded).catch(err => console.error('Error writing to port:', err));
  writer.releaseLock();
}


// Keyboard handling
let x = 0;
let y = 0;

const xElement = document.getElementById("xValue");
const yElement = document.getElementById("yValue");

const xsElement = document.getElementById("xValues");
const ysElement = document.getElementById("yValues");

document.addEventListener('keydown', function (event) {
  switch (event.key) {
    case 'ArrowUp':
      if (y < 180) y += 5;
      break;
    case 'ArrowDown':
      if (y > 0) y -= 5;
      break;
    case 'ArrowLeft':
      if (x > 0) x -= 5;
      break;
    case 'ArrowRight':
      if (x < 180) x += 5;
      break;
  }

  xElement.textContent = x;
  yElement.textContent = y;

  xsElement.value = x
  ysElement.value = y
  sendDegrees(x, y);
});

function updateValue(value) {

  x = value
  xElement.textContent = x;
  yElement.textContent = y;
  sendDegrees(x, y);
}

function updateValue2(value) {
  y = value
  xElement.textContent = x;
  yElement.textContent = y;
  sendDegrees(x, y);
}

/////////////////////end my code


app();
