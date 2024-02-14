//% icon="\uf09e" color=#014598 block="IR Reciever" block.loc.cs="IR Přijímač"
namespace IRReciever {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    //% block.loc.cs="připojit IR přijímač na pin %pin"
    export function connectReciever(pin: AnalogPin):void {
        irPin = pin
    }

}
//% icon="\uf09e" color=#014598 block="IR Transmitter" block.loc.cs="IR Vysílač"
namespace IRTransmitter {
    let irPin: AnalogPin
    //% block="connect IR transmitter at pin %pin"
    //% block.loc.cs="připojit IR vysílač na pin %pin"
    export function connectTransmitter(pin: AnalogPin): void {
        irPin = pin
    }

}