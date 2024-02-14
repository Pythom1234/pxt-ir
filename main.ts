//% icon="\uf09e" color=#014598
namespace IR_Reciever {
    let irPin: AnalogPin
    //% block="connect IR reciever at pin %pin"
    export function connectReciever(pin: AnalogPin):void {
        irPin = pin
    }

}