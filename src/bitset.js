class BitSet {
    constructor(initialState) {
        this.bytesArray = new Uint8Array(initialState.length)
        for (let i = 0; i < initialState.length; i++) {
            this.bytesArray[i] = parseInt(initialState[i])
        }
    }

    get(index) {
        return this.bytesArray[index]
    }

    set(index) {
        this.bytesArray[index] = 1 - this.bytesArray[index]
    }

}

export default BitSet