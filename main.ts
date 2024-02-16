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
    let irPin: AnalogPin
    let waitCorrection: number
    //% block="connect IR transmitter at pin %pin"
    //% block.loc.cs="připojit IR vysílač na pin %pin"
    export function connectTransmitter(pin: AnalogPin): void {
        irPin = pin
        pins.analogWritePin(irPin, 0)
        pins.analogSetPeriod(irPin, 26)
        const start = input.runningTimeMicros()
        const runs = 32
        for (let i = 0; i < runs; i++) {
            transmitBit(1, 1)
        }
        const end = input.runningTimeMicros()
        waitCorrection = Math.idiv(end - start - runs * 2, runs * 2)
        control.waitMicros(2000)
    }
    function transmitBit(highMicros: number, lowMicros: number): void {
        pins.analogWritePin(irPin, 511);
        control.waitMicros(highMicros);
        pins.analogWritePin(irPin, 1);
        control.waitMicros(lowMicros);
    }
    //% block="send IR datagram $hex32bit"
    //% block.loc.cs="poslat IR datagram $hex32bit"
    export function sendMessage(message: number): void {
        const IR_MARK = Math.idiv(6 * 1000000, 38000)
        const START_STOP_PAUSE = Math.idiv((45 - 6) * 1000000, 38000)
        const LOW_PAUSE = Math.idiv((16 - 6) * 1000000, 38000)
        const HIGH_PAUSE = Math.idiv((27 - 6) * 1000000, 38000)
        const MAX_LENGTH_MS = 16
        const channel = 1 + ((message >> 12) & 0b0011)
        const ir_mark = IR_MARK - waitCorrection
        const high_pause = HIGH_PAUSE - waitCorrection
        const low_pause = LOW_PAUSE - waitCorrection
        const start_stop_pause = START_STOP_PAUSE - waitCorrection

        for (let sendCount = 0; sendCount < 5; sendCount++) {
            const MESSAGE_BITS = 16;

            let mask = 1 << (MESSAGE_BITS - 1);

            transmitBit(ir_mark, start_stop_pause);

            while (mask > 0) {
                if (message & mask) {
                    transmitBit(ir_mark, high_pause);
                } else {
                    transmitBit(ir_mark, low_pause);
                }
                mask >>= 1;
            }

            transmitBit(ir_mark, start_stop_pause);

            if (sendCount == 0 || sendCount == 1) {
                basic.pause(5 * MAX_LENGTH_MS);
            } else {
                basic.pause((6 + 2 * channel) * MAX_LENGTH_MS);
            }
        }
    }
}