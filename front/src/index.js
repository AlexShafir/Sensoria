import FullMeshServer from './server.js'
import showAxis from './bjs_axes.js'
import Facemesh from './mesh/facemesh.js'
import WorkerUse from './mesh/worker_use.js'

class Peer {
  facemesh

  constructor(facemesh) {
    this.facemesh = facemesh
  }
}

// Fetch elements
const list = document.getElementById("list")
const addRoom = document.getElementById("add_room")
const localVideo = document.getElementById("local_video")
//const client1Video = document.getElementById("client1_video")
const canvas = document.getElementById("render-canvas")
const response = document.getElementById("response")
const sceneDiv = document.getElementById("scene")
const lobbyDiv = document.getElementById("lobby")

const worker = new WorkerUse(160, 144)

canvas.width = lobbyDiv.clientWidth
canvas.height = lobbyDiv.clientHeight

const peers = new Map()

// State
let isInRoom = false

// Set media stream

const localMediaStream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    width: 160,
    height: 144,
  }
})

const localAudioStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: false
})

localVideo.volume = 0
localVideo.srcObject = localMediaStream
localVideo.play()
  

// Room handling
addRoom.onclick = () => {
  const newId = uuidv4()
  onJoinRoom(newId)
}

function onRoomsUpdated(rooms) {
  list.innerHTML = ''

  // Fill list
  const parser = new DOMParser()
  rooms.forEach((id) => {
    const doc = parser.parseFromString(`
        <li>${id}
          <button id=${id}>Join Room</button>
        </li>
      `, 'text/html')

    doc.getElementById(id).onclick = () => { 
      onJoinRoom(id)
    }

    list.appendChild(doc.body)
  })
}

function onJoinRoom(id) {
  isInRoom = true
  lobbyDiv.style.display = "none"
  sceneDiv.style.display = "block"
  canvas.focus() // track keyboard
  window.history.replaceState('', 'Sensoria', '/room/' + id)

  server.join(id) 
}

// Peer handling
function onNewPeer(peerId, newAudioStream) {
  //client1Video.srcObject = newStream
  //client1Video.play()
  
  const newFacemesh = new Facemesh(scene, newAudioStream, peerId)
  const newPeer = new Peer(newFacemesh)
  peers.set(peerId, newPeer)
}

// meshData - DataView
function onFacemeshMessage(peerId, data) {
  if(!peers.has(peerId)) return // crutch

  //console.log("Facemesh: " + peerId + " " + data)
  const dataView = new DataView(data)
  const flatArr = Array.from(new Float32Array(dataView.buffer))
  const newArr = []
  while(flatArr.length) newArr.push(flatArr.splice(0,3)) 

  const pos = newArr[newArr.length - 2]
  const rot = newArr[newArr.length - 1]

  const peer = peers.get(peerId)
  peer.facemesh.renderFacemesh(newArr, pos, rot)
}

function leaveRoom() {
  lobbyDiv.style.display = "block"
  sceneDiv.style.display = "none"

  server.leaveRoom()
  peers.forEach(peer => peer.facemesh.dispose())
  peers.clear()
  canvas.focus()

  window.history.replaceState('', 'Sensoria', '/')
}

function onPeerRemoved(peerId) {
  if(!peers.has(peerId)) return // crutch
  peers.get(peerId).facemesh.dispose()
  peers.delete(peerId)
} 

// Server connection
// should be close to server
const options = {
  "force new connection": true,
  reconnectionAttempts: "Infinity", // avoid having user reconnect manually in order to prevent dead clients after a server restart
  timeout: 10000, // before connect_error and connect_timeout are emitted.
  transports: ["websocket"]
}

const socket = io('/', options)

const server = new FullMeshServer(socket)
server.listen(onRoomsUpdated, onNewPeer, onFacemeshMessage, onPeerRemoved, localAudioStream)

// Check room url
if(window.location.href.includes('room')) {
  const split = window.location.href.split('/')
  const id = split[split.length - 1]
  onJoinRoom(id)
}

// Setup for BabylonJs
const engine = new BABYLON.Engine(canvas)

const scene = new BABYLON.Scene(engine)
scene.clearColor = new BABYLON.Color3(1, 1, 1)

const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(5, 50, 5), scene)
camera.attachControl(canvas, true)

const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene)

showAxis(5, scene)

// Keyboard listener
scene.onKeyboardObservable.add((kbInfo) => {
  if(kbInfo.type == BABYLON.KeyboardEventTypes.KEYUP) {
    if(kbInfo.event.code == 'Escape' && isInRoom) {
      isInRoom = false
      leaveRoom()
    }
  }
})

// Sky box

const ground = BABYLON.MeshBuilder.CreateGround("ground", {height: 100, width: 100, subdivisions: 4});

//const hdrTexture = new BABYLON.CubeTexture("/res/country.env", scene)
//scene.createDefaultSkybox(hdrTexture, true, 10000)

const dome = new BABYLON.PhotoDome(
  "testdome",
  "/res/sidexside.jpg",
  {
      resolution: 32,
      size: 1000
  },
  scene
);

dome.imageMode = BABYLON.PhotoDome.MODE_SIDEBYSIDE;

engine.runRenderLoop(() => scene.render())

// Facemesh
const userFace = new Facemesh(scene, null, 'me')

worker.setCallback((results, average) => {

  // Process result
  if(results === undefined || results[0] === undefined) return
  const meshData = results[0].scaledMesh

  for(var i = 0; i < 478; i++) { // Scale and shift
    const p = meshData[i]
    p[0] = p[0] / 20 - 5
    p[1] = -p[1] / 20 + 15
    p[2] = p[2] / 20 + 5
  }

  // Render
  response.innerHTML = `av ms: ${Math.round(average)}`
  const pos = [camera.position.x, camera.position.y, camera.position.z]
  const rot = [-1 * camera.rotation.x, camera.rotation.y - Math.PI, -1 * camera.rotation.z]
  //userFace.renderFacemesh(meshData, pos, rot)

  // Send

  const sendData = meshData.concat([pos, rot])

  const buffer = Float32Array.from(sendData.flat()).buffer
  const dataview = new DataView(buffer)
  server.sendDataToAll(dataview)
})

// Intercept frames
setInterval(() => worker.process(localVideo), 1000 / 20)