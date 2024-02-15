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
        console.log(waitCorrection)
    }
    function transmitBit(highMicros: number, lowMicros: number): void {
        pins.analogWritePin(irPin, 511);
        control.waitMicros(highMicros);
        pins.analogWritePin(irPin, 1);
        control.waitMicros(lowMicros);
    }
    //% block
    export function sendNec(hex32bit: string): void {
        if (hex32bit.length != 10) {
            return
        }

        const NEC_HDR_MARK = 9000 - waitCorrection
        const NEC_HDR_SPACE = 4500 - waitCorrection
        const NEC_BIT_MARK = 560 - waitCorrection + 50
        const NEC_HIGH_SPACE = 1690 - waitCorrection - 50
        const NEC_LOW_SPACE = 560 - waitCorrection - 50

        const addressSection = parseInt(hex32bit.substr(0, 6))
        const commandSection = parseInt("0x" + hex32bit.substr(6, 4))
        const sections = [addressSection, commandSection]

        transmitBit(NEC_HDR_MARK, NEC_HDR_SPACE)

        sections.forEach((section) => {
            let mask = 1 << 15;
            while (mask > 0) {
                if (section & mask) {
                    transmitBit(NEC_BIT_MARK, NEC_HIGH_SPACE)
                } else {
                    transmitBit(NEC_BIT_MARK, NEC_LOW_SPACE)
                }
                mask >>= 1
            }
        })
        transmitBit(NEC_BIT_MARK, 0)
    }
}
