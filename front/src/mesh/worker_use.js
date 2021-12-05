class WorkerUse {

    #callback
    #context2d
    #pushed = false
    #pushAllowed = false
    #worker

    constructor(width, height) {
        this.#worker = new Worker('src/mesh/worker.js')

        let count = 1
        let sum = 0

        this.#context2d = document.createElement("canvas").getContext('2d')

        this.#context2d.canvas.width = width
        this.#context2d.canvas.height = height

        this.#worker.onmessage = (event) => {
            if(event.data === 'READY') {
              this.#pushAllowed = true
              return
            }
          
            // console.log('Message received')
            this.#pushed = false
          
            const results = event.data.results
            const time = event.data.time
            sum += time
            const average = sum / count
            count += 1
          
            if(this.#callback !== undefined) this.#callback(results, average)
          }
    }

    setCallback(callback) {
        this.#callback = callback
    }

    process(videoElement) {
        if(this.#pushed || !this.#pushAllowed) {
            return
        }
        
        // console.log('Message sent')
          
        this.#pushed = true
        
        const context2d = this.#context2d
        context2d.drawImage(videoElement, 0, 0, context2d.canvas.width, context2d.canvas.height)
        const imData = context2d.getImageData(0, 0, context2d.canvas.width, context2d.canvas.height)
        this.#worker.postMessage(imData.data.buffer, [imData.data.buffer])  
    }

}

export default WorkerUse