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
    export function sendNec(hex32bit: string): void {
        if (hex32bit.length != 10) {
            return
        }

        const IR_MARK = 157 - waitCorrection
        const SPACE = 1026 - waitCorrection
        const BIT_MARK = IR_MARK//560 - waitCorrection + 50
        const HIGH_SPACE = 552 - waitCorrection - 50
        const LOW_SPACE = 263 - waitCorrection - 50

        const addressSection = parseInt(hex32bit.substr(0, 6))
        const commandSection = parseInt("0x" + hex32bit.substr(6, 4))
        const sections = [addressSection, commandSection]

        transmitBit(IR_MARK, SPACE)

        sections.forEach((section) => {
            let mask = 1 << 15;
            while (mask > 0) {
                if (section & mask) {
                    transmitBit(BIT_MARK, HIGH_SPACE)
                } else {
                    transmitBit(BIT_MARK, LOW_SPACE)
                }
                mask >>= 1
            }
        })
        
        transmitBit(BIT_MARK, 100)
    }
}