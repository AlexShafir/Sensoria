import faceTriangulation from './triangulation_data_new.js'

class Facemesh {

    #eyeMeshL
    #eyeMeshR
    #faceVertices
    #faceVertexData
    #faceMesh
    #voice
    #pivot

    constructor(scene, soundStream, id) {
        /*************** Face ****************/
        
        const faceMat = new BABYLON.StandardMaterial("faceMaterial" + id, scene) 
        faceMat.diffuseColor = new BABYLON.Color3(0.95703125, 0.95703125, 0.859375)
        //myMaterial.wireframe = true
        faceMat.backFaceCulling = false

        const faceIndices = []
        for(var i = 0; i < faceTriangulation.length; i++) { 
            faceIndices.push(faceTriangulation[i][0]) 
            faceIndices.push(faceTriangulation[i][1]) 
            faceIndices.push(faceTriangulation[i][2]) 
        }

        this.#pivot = new BABYLON.TransformNode("root" + id)

        this.#faceMesh = new BABYLON.Mesh("faceMesh" + id, scene)
        this.#faceMesh.parent = this.#pivot
        this.#faceMesh.position = new BABYLON.Vector3(-2, -11, -10)

        this.#faceMesh.material = faceMat

        this.#faceVertices = Array(468 * 3)

        this.#faceVertexData = new BABYLON.VertexData()
        this.#faceVertexData.positions = this.#faceVertices 
        this.#faceVertexData.indices = faceIndices 

        /*************** Eyes ****************/
        const matEye = new BABYLON.StandardMaterial('matEye' + id, scene)
        matEye.diffuseColor = new BABYLON.Color3(0.99, 0.99, 0.99)

        const matDecal = new BABYLON.StandardMaterial("matDecal" + id, scene)
        matDecal.diffuseTexture = new BABYLON.Texture("../../res/iris_orange.png", scene)
        matDecal.diffuseTexture.hasAlpha = true
        matDecal.zOffset = -2

        const diam = 1
        const leftEye = BABYLON.MeshBuilder.CreateSphere("sphereL" + id, {diameter:diam})
        const rightEye = BABYLON.MeshBuilder.CreateSphere("sphereR" + id, {diameter:diam})

        const decalLe = BABYLON.MeshBuilder.CreateDecal("decalLe" + id, leftEye, 
                    { position: new BABYLON.Vector3(0, 0, diam/2), normal: new BABYLON.Vector3(0, 0, 1), size: new BABYLON.Vector3(0.7, 0.7, 0.7) })

        const decalRe = BABYLON.MeshBuilder.CreateDecal("decalRe" + id, rightEye, 
                    { position: new BABYLON.Vector3(0, 0, diam/2), normal: new BABYLON.Vector3(0, 0, 1), size: new BABYLON.Vector3(0.7, 0.7, 0.7) })

        leftEye.material = matEye
        rightEye.material = matEye
        decalLe.material = matDecal
        decalRe.material = matDecal

        this.#eyeMeshL = BABYLON.Mesh.MergeMeshes([leftEye, decalLe], true, true, undefined, false, true)
        this.#eyeMeshR = BABYLON.Mesh.MergeMeshes([rightEye, decalRe], true, true, undefined, false, true)
        
        this.#eyeMeshL.parent = this.#faceMesh
        this.#eyeMeshR.parent = this.#faceMesh

        // Sound
        if(soundStream != null) {
          const peerAudio = document.createElement("audio")
          peerAudio.srcObject = soundStream
          const voice = new BABYLON.Sound("audio", peerAudio.srcObject, scene, null, 
            { streaming: true, autoplay: true, spatialSound: true }
          )
          this.#voice = voice
          voice.attachToMesh(this.#faceMesh)
          voice.setDirectionalCone(90, 180, 0)
          voice.setLocalDirectionToMesh(new BABYLON.Vector3(1, 0, 0))
          voice.play() // bug: https://forum.babylonjs.com/t/9931
        }
    }

    renderEye(vz, eyeMesh, pl1, pl2, iris1) {
        const avx = (pl1[0] + pl2[0]) / 2
        const avy = (pl1[1] + pl2[1]) / 2
        const avz = (pl1[2] + pl2[2]) / 2
      
        const newDiam = new BABYLON.Vector3(pl1[0] - pl2[0], pl1[1] - pl2[1], pl1[2] - pl2[2]).length() * 1.2
        //const oldDiam = eyeMesh.getBoundingInfo().boundingSphere.radiusWorld * 2
        //const scaleF = newDiam / oldDiam
      
        //eyeMesh.scaling = new BABYLON.Vector3(scaleF, scaleF, scaleF)
        eyeMesh.position = new BABYLON.Vector3(avx, avy, avz).add(vz.scale(0.5 * newDiam))
        eyeMesh.lookAt(new BABYLON.Vector3(iris1[0], iris1[1], iris1[2]))
    }

    // meshData - 468 point mesh
    /**
     * 
     * @param {Array<number>} meshData 
     * @param {Array<number>} position 
     * @param {Array<number>} rotation - radians
     */
    renderFacemesh(meshData, position, rotation) {


      
        // Set mesh data
        for(var i = 0; i < 468; i++) {
         const p = meshData[i]
         this.#faceVertices[3*i + 0] = p[0]
         this.#faceVertices[3*i + 1] = p[1]
         this.#faceVertices[3*i + 2] = p[2]
       }
      
        // Find direction vectors for left-handed system
        const p1 = meshData[127]
        const p2 = meshData[356]
        const p3 = meshData[6]
      
        const vhelp = new BABYLON.Vector3(p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2])
        const vx_d = new BABYLON.Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2])
        const vy_d = vhelp.cross(vx_d)
        const vz = vy_d.cross(vx_d).normalize() // BabylonJs is left-handed
      
        const vx = vx_d.normalize()
        const vy = vy_d.normalize()
      
        // Update eyes
        this.renderEye(vz, this.#eyeMeshR, meshData[33], meshData[133], meshData[467 + 6])
        this.renderEye(vz, this.#eyeMeshL, meshData[362], meshData[263], meshData[467 + 1])
      
        // Update face mesh
        this.#pivot.position = new BABYLON.Vector3(position[0], position[1], position[2])
        this.#pivot.rotation = new BABYLON.Vector3(rotation[0], rotation[1], rotation[2])
        this.#faceVertexData.applyToMesh(this.#faceMesh, true)

        if(this.#voice != null) {
          this.#voice.setLocalDirectionToMesh(vz.negate())
        }
      }

      dispose() {
        this.#faceMesh.dispose()
      }

}

export default Facemesh