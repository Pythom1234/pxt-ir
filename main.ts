//% icon="\uf09e" color=#014598 block="IR Reciever" block.loc.cs="IR Přijímač"
namespace IRReciever {
    enum IrButton {
        //% block="any"
        Any = -1,
        //% block="▲"
        Up = 0x62,
        //% block=" "
        Unused_2 = -2,
        //% block="◀"
        Left = 0x22,
        //% block="OK"
        Ok = 0x02,
        //% block="▶"
        Right = 0xc2,
        //% block=" "
        Unused_3 = -3,
        //% block="▼"
        Down = 0xa8,
        //% block=" "
        Unused_4 = -4,
        //% block="1"
        Number_1 = 0x68,
        //% block="2"
        Number_2 = 0x98,
        //% block="3"
        Number_3 = 0xb0,
        //% block="4"
        Number_4 = 0x30,
        //% block="5"
        Number_5 = 0x18,
        //% block="6"
        Number_6 = 0x7a,
        //% block="7"
        Number_7 = 0x10,
        //% block="8"
        Number_8 = 0x38,
        //% block="9"
        Number_9 = 0x5a,
        //% block="*"
        Star = 0x42,
        //% block="0"
        Number_0 = 0x4a,
        //% block="#"
        Hash = 0x52,
    }
    enum IrButtonAction {
        //% block="pressed"
        Pressed = 0,
        //% block="released"
        Released = 1,
    }
    enum IrProtocol {
        //% block="Keyestudio"
        Keyestudio = 0,
        //% block="NEC"
        NEC = 1,
    }
    let irState: IrState;

    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;

    const REPEAT_TIMEOUT_MS = 120;

    interface IrState {
        protocol: IrProtocol;
        hasNewDatagram: boolean;
        bitsReceived: uint8;
        addressSectionBits: uint16;
        commandSectionBits: uint16;
        hiword: uint16;
        loword: uint16;
        activeCommand: number;
        repeatTimeout: number;
        onIrButtonPressed: IrButtonHandler[];
        onIrButtonReleased: IrButtonHandler[];
        onIrDatagram: () => void;
    }
    class IrButtonHandler {
        irButton: IrButton;
        onEvent: () => void;

        constructor(
            irButton: IrButton,
            onEvent: () => void
        ) {
            this.irButton = irButton;
            this.onEvent = onEvent;
        }
    }


    function appendBitToDatagram(bit: number): number {
        irState.bitsReceived += 1;

        if (irState.bitsReceived <= 8) {
            irState.hiword = (irState.hiword << 1) + bit;
            if (irState.protocol === IrProtocol.Keyestudio && bit === 1) {
                irState.bitsReceived = 9;
                irState.hiword = 1;
            }
        } else if (irState.bitsReceived <= 16) {
            irState.hiword = (irState.hiword << 1) + bit;
        } else if (irState.bitsReceived <= 32) {
            irState.loword = (irState.loword << 1) + bit;
        }

        if (irState.bitsReceived === 32) {
            irState.addressSectionBits = irState.hiword & 0xffff;
            irState.commandSectionBits = irState.loword & 0xffff;
            return IR_DATAGRAM;
        } else {
            return IR_INCOMPLETE;
        }
    }

    function decode(markAndSpace: number): number {
        if (markAndSpace < 1600) {
            return appendBitToDatagram(0);
        } else if (markAndSpace < 2700) {
            return appendBitToDatagram(1);
        }

        irState.bitsReceived = 0;

        if (markAndSpace < 12500) {
            return IR_REPEAT;
        } else if (markAndSpace < 14500) {
            return IR_INCOMPLETE;
        } else {
            return IR_INCOMPLETE;
        }
    }

    function enableIrMarkSpaceDetection(pin: DigitalPin) {
        pins.setPull(pin, PinPullMode.PullNone);

        let mark = 0;
        let space = 0;

        pins.onPulsed(pin, PulseValue.Low, () => {
            mark = pins.pulseDuration();
        });

        pins.onPulsed(pin, PulseValue.High, () => {
            space = pins.pulseDuration();
            const status = decode(mark + space);

            if (status !== IR_INCOMPLETE) {
                handleIrEvent(status);
            }
        });
    }

    function handleIrEvent(irEvent: number) {

        if (irEvent === IR_DATAGRAM || irEvent === IR_REPEAT) {
            irState.repeatTimeout = input.runningTime() + REPEAT_TIMEOUT_MS;
        }

        if (irEvent === IR_DATAGRAM) {
            irState.hasNewDatagram = true;

            if (irState.onIrDatagram) {
                makerbit.background.schedule(irState.onIrDatagram, makerbit.background.Thread.UserCallback, makerbit.background.Mode.Once, 0);
            }

            const newCommand = irState.commandSectionBits >> 8;

            if (newCommand !== irState.activeCommand) {

                if (irState.activeCommand >= 0) {
                    const releasedHandler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                    if (releasedHandler) {
                        makerbit.background.schedule(releasedHandler.onEvent, makerbit.background.Thread.UserCallback, makerbit.background.Mode.Once, 0);
                    }
                }

                const pressedHandler = irState.onIrButtonPressed.find(h => h.irButton === newCommand || IrButton.Any === h.irButton);
                if (pressedHandler) {
                    makerbit.background.schedule(pressedHandler.onEvent, makerbit.background.Thread.UserCallback, makerbit.background.Mode.Once, 0);
                }

                irState.activeCommand = newCommand;
            }
        }
    }

    function initIrState() {
        if (irState) {
            return;
        }

        irState = {
            protocol: undefined,
            bitsReceived: 0,
            hasNewDatagram: false,
            addressSectionBits: 0,
            commandSectionBits: 0,
            hiword: 0,
            loword: 0,
            activeCommand: -1,
            repeatTimeout: 0,
            onIrButtonPressed: [],
            onIrButtonReleased: [],
            onIrDatagram: undefined,
        };
    }

    //% block="connect IR receiver at pin %pin"
    //% weight=100
    export function connectIrReceiver(pin: DigitalPin): void {
        initIrState();

        if (irState.protocol) {
            return;
        }

        irState.protocol = IrProtocol.NEC;

        enableIrMarkSpaceDetection(pin);

        makerbit.background.schedule(notifyIrEvents, makerbit.background.Thread.Priority, makerbit.background.Mode.Repeat, REPEAT_TIMEOUT_MS);
    }

    function notifyIrEvents() {
        if (irState.activeCommand === -1) {
        } else {
            const now = input.runningTime();
            if (now > irState.repeatTimeout) {

                const handler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                if (handler) {
                    makerbit.background.schedule(handler.onEvent, makerbit.background.Thread.UserCallback, makerbit.background.Mode.Once, 0);
                }

                irState.bitsReceived = 0;
                irState.activeCommand = -1;
            }
        }
    }

    function onIrButton(
        button: IrButton,
        action: IrButtonAction,
        handler: () => void
    ) {
        initIrState();
        if (action === IrButtonAction.Pressed) {
            irState.onIrButtonPressed.push(new IrButtonHandler(button, handler));
        }
        else {
            irState.onIrButtonReleased.push(new IrButtonHandler(button, handler));
        }
    }

    function irButton(): number {
        basic.pause(0);
        if (!irState) {
            return IrButton.Any;
        }
        return irState.commandSectionBits >> 8;
    }

    //% block="on IR datagram received"
    //% weight=99
    export function onIrDatagram(handler: () => void) {
        initIrState();
        irState.onIrDatagram = handler;
    }

    //% block="IR datagram"
    //% weight=98
    export function irDatagram(): string {
        basic.pause(0);
        initIrState();
        return (
            "0x" +
            ir_rec_to16BitHex(irState.addressSectionBits) +
            ir_rec_to16BitHex(irState.commandSectionBits)
        );
    }

    function wasIrDataReceived(): boolean {
        basic.pause(0);
        initIrState();
        if (irState.hasNewDatagram) {
            irState.hasNewDatagram = false;
            return true;
        } else {
            return false;
        }
    }

    export function irButtonCode(button: IrButton): number {
        basic.pause(0);
        return button as number;
    }

    function ir_rec_to16BitHex(value: number): string {
        let hex = "";
        for (let pos = 0; pos < 4; pos++) {
            let remainder = value % 16;
            if (remainder < 10) {
                hex = remainder.toString() + hex;
            } else {
                hex = String.fromCharCode(55 + remainder) + hex;
            }
            value = Math.idiv(value, 16);
        }
        return hex;
    }
}




//% icon="\uf09e" color=#014598 block="IR Transmitter" block.loc.cs="IR Vysílač"
namespace IRTransmitter {
    let irPin: AnalogPin
    let waitCorrection: number
    let strengh = 511
    //% block="connect IR transmitter at pin %pin||signal strengh $signalStrengh"
    //% block.loc.cs="připojit IR vysílač na pin %pin||síla signálu $signalStrengh"
    //% signalStrengh.defl=511
    //% expandableArgumentMode=true
    //% weight=100
    export function connectTransmitter(pin: AnalogPin, signalStrengh?: number): void {
        if (signalStrengh) {
            strengh = signalStrengh
        }
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
        pins.analogWritePin(irPin, strengh)
        control.waitMicros(highMicros)
        pins.analogWritePin(irPin, 1)
        control.waitMicros(lowMicros)
    }
    //% block="send IR datagram $hex32bit"
    //% block.loc.cs="poslat IR datagram $hex32bit"
    //% weight=99
    export function sendNec(hex32bit: string): void {
        if (hex32bit.length != 10) {
            return
        }
        if (!irPin) {
            return
        }

        const IR_MARK = 9000 - waitCorrection
        const SPACE = 4500 - waitCorrection
        const BIT_MARK = 560 - waitCorrection + 50
        const HIGH_SPACE = 1690 - waitCorrection - 50
        const LOW_SPACE = 560 - waitCorrection - 50

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



//% icon="\uf09e" color=#014598  block="LEGO Powerfunctions"
namespace IRLegoPowerfunctions {
    export enum PowerFunctionsChannel {
        //% block="1"
        One = 0,
        //% block="2"
        Two = 1,
        //% block="3"
        Three = 2,
        //% block="4"
        Four = 3,
    }
    export enum PowerFunctionsDirection {
        //% block="left"
        //% block.loc.cs="doleva"
        Left = 1,
        //% block="right"
        //% block.loc.cs="doprava"
        Right = -1,
    }
    export enum PowerFunctionsOutput {
        //% block="red"
        //% block.loc.cs="červený"
        Red = 0,
        //% block="blue"
        //% block.loc.cs="modrý"
        Blue = 1,
    }
    export enum PowerFunctionsMotor {
        //% block="red | channel 1"
        //% block.loc.cs="červený, kanál 1"
        Red1 = 0,
        //% block="red | channel 2"
        //% block.loc.cs="červený, kanál 2"
        Red2 = 1,
        //% block="red | channel 3"
        //% block.loc.cs="červený, kanál 3"
        Red3 = 2,
        //% block="red | channel 4"
        //% block.loc.cs="červený, kanál 4"
        Red4 = 3,
        //% block="blue | channel 1"
        //% block.loc.cs="modrý, kanál 1"
        Blue1 = 4,
        //% block="blue | channel 2"
        //% block.loc.cs="modrý, kanál 2"
        Blue2 = 5,
        //% block="blue | channel 3"
        //% block.loc.cs="modrý, kanál 3"
        Blue3 = 6,
        //% block="blue | channel 4"
        //% block.loc.cs="modrý, kanál 4"
        Blue4 = 7,
    }
    export enum PowerFunctionsCommand {
        //% block="float"
        //% block.loc.cs="pomalu zastavit"
        Float = 0,
        //% block="forward"
        //% block.loc.cs="dopředu"
        Forward = 1,
        //% block="backward"
        //% block.loc.cs="dozadu"
        Backward = 2,
        //% block="brake"
        //% block.loc.cs="zastavit"
        Brake = 3,
    }
    interface PowerFunctionsState {
        irDevice: InfraredDevice;
        motorDirections: PowerFunctionsDirection[];
    }

    let state: PowerFunctionsState;

    function getChannel(motor: PowerFunctionsMotor): PowerFunctionsChannel {
        const MOTOR_TO_CHANNEL = [
            PowerFunctionsChannel.One,
            PowerFunctionsChannel.Two,
            PowerFunctionsChannel.Three,
            PowerFunctionsChannel.Four,
            PowerFunctionsChannel.One,
            PowerFunctionsChannel.Two,
            PowerFunctionsChannel.Three,
            PowerFunctionsChannel.Four,
        ];
        return MOTOR_TO_CHANNEL[motor];
    }

    function getOutput(motor: PowerFunctionsMotor): PowerFunctionsOutput {
        const MOTOR_TO_OUTPUT = [
            PowerFunctionsOutput.Red,
            PowerFunctionsOutput.Red,
            PowerFunctionsOutput.Red,
            PowerFunctionsOutput.Red,
            PowerFunctionsOutput.Blue,
            PowerFunctionsOutput.Blue,
            PowerFunctionsOutput.Blue,
            PowerFunctionsOutput.Blue,
        ];
        return MOTOR_TO_OUTPUT[motor];
    }

    function sendSingleOutputCommand(
        channel: PowerFunctionsChannel,
        output: PowerFunctionsOutput,
        speed: number
    ) {
        const msg = message.createSingleOutputPwmMessage(channel, output, speed);
        if (state) {
            state.irDevice.sendMessage(msg);
        }
    }

    //% block="connect IR LED at pin %pin"
    //% block.loc.cs="připojit IR vysílač na pin %pin"
    //% weight=100
    export function connectIrLed(pin: AnalogPin) {
        state = {
            irDevice: new InfraredDevice(pin),
            motorDirections: [
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
                PowerFunctionsDirection.Left,
            ],
        };
    }

    //% block="set motor %motor to %speed"
    //% block.loc.cs="nastavit motoru %motor rychlost %speed"
    //% speed.min=-7 speed.max=7
    //% weight=99
    //% motor.fieldEditor="gridpicker" motor.fieldOptions.columns=4 motor.fieldOptions.tooltips="false"
    export function setSpeed(motor: PowerFunctionsMotor, speed: number) {
        speed = Math.max(-7, Math.min(7, speed));
        if (state) {
            sendSingleOutputCommand(
                getChannel(motor),
                getOutput(motor),
                speed * state.motorDirections[motor]
            );
        }
    }

    //% block="brake motor %motor"
    //% block.loc.cs="zastavit motor %motor"
    //% weight=98
    //% motor.fieldEditor="gridpicker" motor.fieldOptions.columns=4 motor.fieldOptions.tooltips="false"
    export function brake(motor: PowerFunctionsMotor) {
        setSpeed(motor, 0);
    }

    //% block="float motor %motor to stop"
    //% block.loc.cs="pomalu zastavit motor %motor"
    //% weight=97
    //% motor.fieldEditor="gridpicker" motor.fieldOptions.columns=4 motor.fieldOptions.tooltips="false"
    export function float(motor: PowerFunctionsMotor) {
        if (state) {
            sendSingleOutputCommand(getChannel(motor), getOutput(motor), 8);
        }
    }

    //% block="set direction of motor %motor to %direction"
    //% block.loc.cs="nastavit směr otáčení motoru %motor na %direction"
    //% weight=96
    //% motor.fieldEditor="gridpicker" motor.fieldOptions.columns=4 motor.fieldOptions.tooltips="false"
    export function setMotorDirection(
        motor: PowerFunctionsMotor,
        direction: PowerFunctionsDirection
    ) {
        if (state) {
            state.motorDirections[motor] = direction;
        }
    }

    //% block="set light intensity %light to %intensity"
    //% block.loc.cs="nastavit intenzitu světla %light na %intensity"
    //% intensity.min=0 intensity.max=7
    //% weight=95
    //% light.fieldEditor="gridpicker" light.fieldOptions.columns=4 light.fieldOptions.tooltips="false"
    export function setLight(light: PowerFunctionsMotor, intensity: number) {
        intensity = Math.max(0, Math.min(7, intensity));
        if (state) {
            sendSingleOutputCommand(
                getChannel(light),
                getOutput(light),
                intensity * state.motorDirections[light]
            );
        }
    }

    //% block="set servo %servo to %angle"
    //% block.loc.cs="nastavit servu %servo natočení %angle"
    //% angle.min=-7 angle.max=7
    //% weight=94
    //% servo.fieldEditor="gridpicker" servo.fieldOptions.columns=4 servo.fieldOptions.tooltips="false"
    export function setServo(servo: PowerFunctionsMotor, angle: number) {
        angle = Math.max(-7, Math.min(7, angle));
        if (state) {
            sendSingleOutputCommand(
                getChannel(servo),
                getOutput(servo),
                angle * state.motorDirections[servo]
            );
        }
    }

    namespace message {
        function mapValueToPwmElseFloat(value: number): number {
            switch (value) {
                case 7:
                    return 0b0111;
                case 6:
                    return 0b0110;
                case 5:
                    return 0b0101;
                case 4:
                    return 0b0100;
                case 3:
                    return 0b0011;
                case 2:
                    return 0b0010;
                case 1:
                    return 0b0001;
                case 0:
                    return 0b1000;
                case -1:
                    return 0b1111;
                case -2:
                    return 0b1110;
                case -3:
                    return 0b1101;
                case -4:
                    return 0b1100;
                case -5:
                    return 0b1011;
                case -6:
                    return 0b1010;
                case -7:
                    return 0b1001;
                default:
                    return 0b0000;
            }
        }

        function createMessageFromNibbles(
            nibble1: number,
            nibble2: number,
            nibble3: number
        ) {
            const lrc = 0xf ^ nibble1 ^ nibble2 ^ nibble3;
            return (nibble1 << 12) | (nibble2 << 8) | (nibble3 << 4) | lrc;
        }

        export function createSingleOutputPwmMessage(
            channel: PowerFunctionsChannel,
            output: PowerFunctionsOutput,
            value: number
        ) {
            const nibble1 = 0b0000 + channel;
            const nibble2 = 0b0100 + output;
            const nibble3 = mapValueToPwmElseFloat(value);
            return createMessageFromNibbles(nibble1, nibble2, nibble3);
        }

        export function createComboDirectMessage(
            channel: PowerFunctionsChannel,
            outputRed: PowerFunctionsCommand,
            outputBlue: PowerFunctionsCommand
        ) {
            const nibble1 = 0b0000 + channel;
            const nibble2 = 0b0001;
            const nibble3 = (outputBlue << 2) + outputRed;
            return createMessageFromNibbles(nibble1, nibble2, nibble3);
        }

        export function createComboPwmMessage(
            channel: PowerFunctionsChannel,
            outputRed: number,
            outputBlue: number
        ) {
            const nibble1 = 0b0100 + channel;
            const nibble2 = mapValueToPwmElseFloat(outputBlue);
            const nibble3 = mapValueToPwmElseFloat(outputRed);
            return createMessageFromNibbles(nibble1, nibble2, nibble3);
        }
    }

    const IR_MARK = Math.idiv(6 * 1000000, 38000);
    const START_STOP_PAUSE = Math.idiv((45 - 6) * 1000000, 38000);
    const LOW_PAUSE = Math.idiv((16 - 6) * 1000000, 38000);
    const HIGH_PAUSE = Math.idiv((27 - 6) * 1000000, 38000);

    export class InfraredDevice {
        private pin: AnalogPin;
        private waitCorrection: number;

        constructor(pin: AnalogPin, pwmPeriod = 26) {
            this.pin = pin;
            pins.analogWritePin(this.pin, 0);
            pins.analogSetPeriod(this.pin, pwmPeriod);

            {
                const start = input.runningTimeMicros();
                const runs = 8;
                for (let i = 0; i < runs; i++) {
                    this.transmitBit(1, 1);
                }
                const end = input.runningTimeMicros();
                this.waitCorrection = Math.idiv(end - start - runs * 2, runs * 2);
            }

            control.waitMicros(2000);
        }

        public transmitBit(highMicros: number, lowMicros: number): void {
            pins.analogWritePin(this.pin, 511);
            control.waitMicros(highMicros);
            pins.analogWritePin(this.pin, 1);
            control.waitMicros(lowMicros);
        }

        public sendMessage(message: number): void {
            const MAX_LENGTH_MS = 16;
            const channel = 1 + ((message >> 12) & 0b0011);
            const ir_mark = IR_MARK - this.waitCorrection;
            const high_pause = HIGH_PAUSE - this.waitCorrection;
            const low_pause = LOW_PAUSE - this.waitCorrection;
            const start_stop_pause = START_STOP_PAUSE - this.waitCorrection;

            for (let sendCount = 0; sendCount < 5; sendCount++) {
                const MESSAGE_BITS = 16;

                let mask = 1 << (MESSAGE_BITS - 1);

                this.transmitBit(ir_mark, start_stop_pause);

                while (mask > 0) {
                    if (message & mask) {
                        this.transmitBit(ir_mark, high_pause);
                    } else {
                        this.transmitBit(ir_mark, low_pause);
                    }
                    mask >>= 1;
                }

                this.transmitBit(ir_mark, start_stop_pause);

                if (sendCount == 0 || sendCount == 1) {
                    basic.pause(5 * MAX_LENGTH_MS);
                } else {
                    basic.pause((6 + 2 * channel) * MAX_LENGTH_MS);
                }
            }
        }
    }
}
