import ACTIONS from './actions.js'
import FREEICE from '../dist/freeice.js'

/**
 * Server that establishes Full Mesh WebRTC network.
 */
class FullMeshServer {

    dataChannels
    socket

    constructor(socket) {
        // Fields
        const dataChannels = {}
        this.dataChannels = dataChannels
        this.socket = socket
    }

    listen(onRoomsUpdated, onNewPeer, onDataMessage, onPeerRemoved, localMediaStream) {
        const peerConnections = {}
        const socket = this.socket
        const dataChannels = this.dataChannels

        // SHARE_ROOMS
        
        socket.on(ACTIONS.SHARE_ROOMS, ({rooms = []} = {}) => {
            console.log(ACTIONS.SHARE_ROOMS)
        
            onRoomsUpdated(rooms)
        })
        
        // ICE_CANDIDATE
        
        socket.on(ACTIONS.ICE_CANDIDATE, ({peerID, iceCandidate}) => {
          console.log(ACTIONS.ICE_CANDIDATE)
        
          peerConnections[peerID]?.addIceCandidate(
            new RTCIceCandidate(iceCandidate)
          )
        })
        
        // ADD_PEER
        
        async function handleNewPeer({peerID, createOffer}) {
          console.log(ACTIONS.ADD_PEER + ":" + createOffer)
        
          if (peerID in peerConnections) {
            return console.warn(`Already connected to peer ${peerID}`)
          }
          
          peerConnections[peerID] = new RTCPeerConnection({
            iceServers: FREEICE,
          })
        
          if(createOffer) {
            const channel = peerConnections[peerID].createDataChannel("data")
            channel.onmessage = (ev) => {
              const message = ev.data
              onDataMessage(peerID, message)
            }
            channel.onopen = (ev) => {
              dataChannels[peerID] = channel
              //channel.send('HelloChannel')
            }
            
          } else {
            peerConnections[peerID].ondatachannel = (ev) => {
              const channel = ev.channel
              dataChannels[peerID] = channel
              channel.onmessage = (ev) => {
                const message = ev.data
                onDataMessage(peerID, message)
              }
              //channel.send('HelloChannel')
            }
          }
        
          peerConnections[peerID].onicecandidate = event => {
            if (event.candidate) {
              socket.emit(ACTIONS.RELAY_ICE, {
                peerID,
                iceCandidate: event.candidate,
              })
            }
          }
        
          let tracksNumber = 0
          peerConnections[peerID].ontrack = ({streams: [remoteStream]}) => {
            tracksNumber++
        
            if (tracksNumber === 1) { // audio tracks received
              tracksNumber = 0
              onNewPeer(peerID, remoteStream)
            }
          }
        
          localMediaStream.getTracks().forEach(track => {
            peerConnections[peerID].addTrack(track, localMediaStream)
          })
        
          if (createOffer) {
            const offer = await peerConnections[peerID].createOffer()
        
            await peerConnections[peerID].setLocalDescription(offer)
        
            socket.emit(ACTIONS.RELAY_SDP, {
              peerID,
              sessionDescription: offer,
            })
          }
        }
        
        socket.on(ACTIONS.ADD_PEER, handleNewPeer)
        
        // SESSION_DESCRIPTION
        
        async function setRemoteMedia({peerID, sessionDescription: remoteDescription}) {
          console.log(ACTIONS.SESSION_DESCRIPTION)
        
          await peerConnections[peerID]?.setRemoteDescription(
            new RTCSessionDescription(remoteDescription)
          )
        
          if (remoteDescription.type === 'offer') {
            const answer = await peerConnections[peerID].createAnswer()
        
            await peerConnections[peerID].setLocalDescription(answer)
        
            socket.emit(ACTIONS.RELAY_SDP, {
              peerID,
              sessionDescription: answer,
            })
          }
        }
        
        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia)
        
        // REMOVE_PEER
        
        const handleRemovePeer = ({peerID}) => {
          console.log(ACTIONS.REMOVE_PEER)
          onPeerRemoved(peerID)
        
          if (peerConnections[peerID]) {
            peerConnections[peerID].close()
          }
        
          delete peerConnections[peerID]
        }
        
        socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer)
    }

    join(newId) {
        this.socket.emit(ACTIONS.JOIN, {room: newId})
    }

    leaveRoom() {
      this.socket.emit(ACTIONS.LEAVE)
    }

    sendDataToAll(data) {
        Object.values(this.dataChannels).forEach(channel => 
            channel.send(data)    
        )
    }

}

export default FullMeshServer