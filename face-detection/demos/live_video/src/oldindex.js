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
    let faceX = faces[0].keypoints[0].x
    let faceY = faces[0].keypoints[0].y
    moveCamera(faceX, faceY)
    // console.log(faceX)

  } catch (error) {
    console.log(error)
  }

  // console.log(Camera)







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




////////////////my code start
let inset = 50
let offset = 70

// let inset = 40
// let offset = 80

let movey = false;
let movex = false;

function moveCamera(faceCenterX, faceCenterY) {
  let xcen = 640 / 2
  let ycen = 480 / 2
  if (movey) {
    // up axis
    if (faceCenterY < ycen) {
      sendDegrees(0, -1)
    }

    //down axis
    if (faceCenterY > ycen) {
      sendDegrees(0, 1)
    }
  }

  if (movex) {
    //down axis
    if (faceCenterX < xcen) {
      sendDegrees(1, 0)
    }

    //down axis
    if (faceCenterX > xcen) {
      sendDegrees(-1, 0)
    }
  }


  if (ycen - inset < faceCenterY && ycen + inset > faceCenterY) {
    movey = false
  }

  if (xcen - inset < faceCenterX && xcen + inset > faceCenterX) {
    movex = false
  }


  if (!movey && (ycen - offset > faceCenterY || ycen + offset < faceCenterY)) {
    movey = true
    // console.log("walla")
  }

  if (!movex && (xcen - offset > faceCenterX || xcen + offset < faceCenterX)) {
    movex = true
    // console.log("allah")
  }
}



// Example usage:
// Let's assume the face is detected at


let port;
const button = document.getElementById('myButton');

// Add a click event listener to the button
button.addEventListener('click', function () {
  connect();
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
  console.log(`${pan}, ${tilt}`)
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
