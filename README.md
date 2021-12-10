# Sensoria 

This project is a demo for P2P WebRTC communication in 3D using TensorFlow [Face-Landmarks-Detection](https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection) for face tracking.

What you will see in unfiltered result of TensorFlow Facemesh (WASM backend).



## Try it
Available here: https://sensoria.herokuapp.com. 

Trick: you can open Sensoria in another browser tab to simulate conversation.

Chrome browser is recommended.

## Run it locally
This is regular NodeJS app written in vanilla JS, with frontend and backend separated and no frameworks used.

## Data transmission
Instead of video feed 468 xyz points are sent. For 30 FPS, it roughly equals to 30 * 468 * 3 = 1.5 mbps, equals to compressed video feed.

Upside is that de-compression step is not required, points can be directly rendered on 3D scene.

There is surely room for decreasing bandwidth, like transferring 2D points only, sending point deltas only etc.
