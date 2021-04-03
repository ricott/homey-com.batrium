'use strict';

const dgram = require("dgram");
var EventEmitter = require('events');
var util = require('util');

const PORT = 18542;

class WatchmonUDP {
    constructor(options) {
        EventEmitter.call(this);
        this.options = options;
        this.shouldBeConnected = false;
        this.connected = false;

        console.log(`Initializing WatchmonUDP for System '${this.options.systemId || 'n/a'}'`);
        initListenersAndConnect(this);
    }

    disconnect() {
        this.shouldBeConnected = false;
        if (this.server) {
            console.log('Closing watchmon socket');
            this.server.close();
        }
    }
}
util.inherits(WatchmonUDP, EventEmitter);
module.exports = WatchmonUDP;

function initListenersAndConnect(self) {
    self.server = dgram.createSocket({ type: "udp4", reuseAddr: true });

    self.server.on("listening", function () {
        self.server.setBroadcast(true);
        self.shouldBeConnected = true;
    });

    self.server.on("message", function (message, rinfo) {
        if (!self.connected) {
            self.connected = true;
        }

        //Decode header of message to get systemId and messageId
        //let payload = self.payloadParser.parse(message);

        let payload = {
            messageId: message.readUInt16LE(1).toString(16),
            systemId: message.readUInt16LE(4)
        };

        //console.log(`System: ${payload.SystemId}, Message: ${payload.MessageId}`);

        //We are only interested in matching systemId's, if that is passed as a filter
        //For discovery messages from driver this will not be supplied
        if (!self.options.systemId || self.options.systemId == payload.systemId) {
            //We are only interested in the following messageId's
            if (payload.messageId == '3233') {
                //LiveDisplay, interval 20 seconds
                payload.systemOpStatus = message.readUInt8(8);
                payload.minCellVolt = message.readUInt16LE(12)/1000;
                payload.maxCellVolt = message.readUInt16LE(14)/1000;
                payload.minCellTemp = message.readUInt8(18)-40;
                payload.maxCellTemp = message.readUInt8(19)-40;
                payload.shuntVoltage = message.readUInt16LE(22)/100;
                payload.shuntCurrent = message.readFloatLE(24)/1000;
                payload.shuntPowerVA = message.readFloatLE(28)/1000; //kW
                payload.ShuntSOC = message.readUInt16LE(32)/100;
                payload.nomCapacityToEmpty = message.readFloatLE(34)/1000; //Ah
                payload.shuntCumulkWhCharge = message.readFloatLE(38)/1000; //kWh
                payload.shuntCumulkWhDischg = message.readFloatLE(42)/1000; //kWh
                self.emit('liveDisplay', payload);
            } else if (payload.messageId == '5732') {
                //DiscoveryMessage, interval 2 seconds
                payload.systemFirmwareVersion = message.readUInt16LE(16);
                payload.systemHardwareVersion = message.readUInt16LE(18);
                payload.systemOpStatus = message.readUInt8(24);
                payload.chargePowerRateState = message.readUInt8(27);
                payload.dischargePowerRateState = message.readUInt8(28);
                payload.minCellVolt = message.readUInt16LE(31)/1000;
                payload.maxCellVolt = message.readUInt16LE(33)/1000;
                payload.minCellTemp = message.readUInt8(37)-40;
                payload.numOfCellsActive = message.readUInt8(38);
                payload.shuntSOC = message.readUInt8(41)/2-5;
                payload.shuntVoltage = message.readUInt16LE(42)/100;
                payload.shuntCurrent = message.readFloatLE(44)/1000;
                //console.log(payload);
                self.emit('discoveryMessage', payload);
            }
        }
    });

    self.server.on('close', () => {
        self.connected = false;
        if (self.shouldBeConnected) {
            //Not supposed to be closed
            self.emit('error', new Error('Socket closed unexpectedly, restart app'));
        }
    });

    self.server.on('error', (err) => {
        self.emit('error', err);
    });

    self.server.bind(PORT);
}