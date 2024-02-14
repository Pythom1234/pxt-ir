//% icon="\uf09e" color=#014598 block="IR Reciever" block.loc.cs="IR Příjímač"
namespace IRReciever {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    export function connectReciever(pin: AnalogPin):void {
        irPin = pin
    }

}
//% icon="\uf09e" color=#014598 block="IR Transmitter" block.loc.cs="IR Vysílač"
namespace IRTransmitter {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    export function connectTransmitter(pin: AnalogPin): void {
        irPin = pin
    }

}