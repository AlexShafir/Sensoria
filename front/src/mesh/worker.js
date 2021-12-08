importScripts('../../dist/fld/tf-core.js')
importScripts('../../dist/fld/tf-converter.js')
importScripts('../../dist/fld/tf-backend-wasm.js')
importScripts('../../dist/fld/face-landmarks-detection.js')

let mlModel

async function prepare() {
    tf.wasm.setWasmPaths('../../dist/fld/')
    await tf.ready()

    mlModel = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
              //maxContinuousChecks:5,
              //detectionConfidence:.9,
              maxFaces:1,
              //iouThreshold:.3,
              //scoreThreshold:.85
        })
}

async function exec(event) {
    // Parse passed ArrayBuffer
    const buffer = event.data
    const array = new Uint8ClampedArray(buffer)
    const imData = new ImageData(array, 160, 144)

    const t0 = performance.now();
    const predictions = await mlModel.estimateFaces({
        input: imData,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true
    });
    const t1 = performance.now();

    postMessage({
        'results': predictions,
        'time': Math.round(t1 - t0)
    })
}

prepare().then(() => {
    // console.log('Worker prepared')
    postMessage('READY')
    // Set callback
    onmessage = (event) => {
        // console.log('Worker received message')
        exec(event).then(() => { /* console.log('Worker replied') */ })
    }
})



