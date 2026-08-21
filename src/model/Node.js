class Node {
    constructor(value, id) {
        this.value = value;
        this.next = null;
        this.previous = null;
        this.id = id; // Unique ID to map logical node to visual element
        this.memoryAddress = "0x" + Math.floor(Math.random() * 0xFFF + 0x1000).toString(16).toUpperCase(); // Endere\u00e7o fict\u00edcio did\u00e1tico
    }
}
