//% icon="\uf09e" color=#014598 block="IR Reciever" block.loc.cs="IR příjimač"
namespace IRReciever {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    export function connectReciever(pin: AnalogPin):void {
        irPin = pin
    }

}