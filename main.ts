//% icon="\uf09e" color=#014598 block="IR Reciever" block.loc.cs="IR Přijímač"
namespace IRReciever {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    //% block.loc.cs="připojit IR přijímač na pin %pin"
    export function connectReciever(pin: AnalogPin): void {
        irPin = pin
    }

}
//% icon="\uf09e" color=#014598 block="IR Transmitter" block.loc.cs="IR Vysílač"
namespace IRTransmitter {
    let irPin: DigitalPin
    //% block="connect IR transmitter at pin %pin"
    //% block.loc.cs="připojit IR vysílač na pin %pin"
    export function connectTransmitter(pin: DigitalPin): void {
        irPin = pin
    }
    //% block
    export function sendDatagram(address: number, command: number): void {
        if (irPin) {
            pins.digitalWritePin(irPin, 0)
            basic.pause(9)
            pins.digitalWritePin(irPin, 1)
            basic.pause(4.5)
            pins.digitalWritePin(irPin, 0)

            for (let i = 0; i < 16; i++) {
                pins.digitalWritePin(irPin, (address >> i) & 1)
                basic.pause(2.25)
            }

            for (let i = 0; i < 16; i++) {
                pins.digitalWritePin(irPin, (~address >> i) & 1)
                basic.pause(2.25)
            }

            for (let i = 0; i < 16; i++) {
                pins.digitalWritePin(irPin, (command >> i) & 1)
                basic.pause(2.25)
            }

            pins.digitalWritePin(irPin, 1)
        }
    }


}