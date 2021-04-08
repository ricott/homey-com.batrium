'use strict';

const { Device } = require('homey');
//const util = require('util');
const Watchmon = require('../../lib/batrium.js');
const enums = require('../../lib/enums.js');
const dateFormat = require("dateformat");

class WatchmonDevice extends Device {

    async onInit() {
        this.log(`[${this.getName()}] Watchmon device initiated`);

        this.watchmon = {
            id: this.getData().id,
            systemId: this.getData().systemId,
            name: this.getName(),
            systemFirmwareVersion: null,
            systemHardwareVersion: null,
            numOfCellsActive: null,
            cellVoltDiff: null
        };

        this.watchmon.api = new Watchmon({ systemId: this.watchmon.systemId });

        this._initializeEventListeners();
    }

    updateSetting(key, value) {
        let obj = {};
        obj[key] = String(value);
        this.setSettings(obj).catch(err => {
            this.error('Failed to update settings', err);
        });
    }

    calculateMaxCellVoltDiff(minCellVolt, maxCellVolt) {
        let voltDiff = maxCellVolt - minCellVolt;
        voltDiff = parseFloat((voltDiff * 1000).toFixed(0));
        if (this.watchmon.cellVoltDiff != null) {
            if (this.watchmon.cellVoltDiff != voltDiff) {
                this.watchmon.cellVoltDiff = voltDiff;
                let tokens = {
                    difference: voltDiff, //mV
                    cellMinVolt: minCellVolt,
                    cellMaxVolt: maxCellVolt
                }
                this.driver.triggerDeviceFlow('cell_volt_diff_changed', tokens, this);
            }
        } else {
            //First update since start of app
            this.watchmon.cellVoltDiff = voltDiff;
        }
    }

    _initializeEventListeners() {
        let self = this;

        self.watchmon.api.on('liveDisplay', message => {
            self._updateProperty('remaining_capacity', message.nomCapacityToEmpty);
            self._updateProperty('measure_temperature.cellMin', message.minCellTemp);
            self._updateProperty('measure_temperature.cellMax', message.maxCellTemp);
            self._updateProperty('meter_power.charge', message.shuntCumulkWhCharge);
            self._updateProperty('meter_power.discharge', message.shuntCumulkWhDischg);
        });

        self.watchmon.api.on('discoveryMessage', message => {

            self._updateProperty('battery_status', enums.decodeBatteryStatus(message.systemOpStatus));
            self._updateProperty('battery_capacity', message.shuntSOC);
            self._updateProperty('measure_power', message.shuntPowerVA);
            self._updateProperty('measure_voltage', message.shuntVoltage);
            self._updateProperty('measure_current', message.shuntCurrent);
            self._updateProperty('measure_voltage.cellMin', message.minCellVolt);
            self._updateProperty('measure_voltage.cellMax', message.maxCellVolt);
            self.calculateMaxCellVoltDiff(message.minCellVolt, message.maxCellVolt);

            self._updateProperty('powerrate_status.Charge',
                enums.decodePowerRateState(message.chargePowerRateState));
            self._updateProperty('powerrate_status.Discharge',
                enums.decodePowerRateState(message.dischargePowerRateState));

            if (message.systemHardwareVersion != self.watchmon.systemHardwareVersion) {
                self.watchmon.systemHardwareVersion = message.systemHardwareVersion;
                self.updateSetting('hardwareVersion', message.systemHardwareVersion);
            }

            if (message.systemFirmwareVersion != self.watchmon.systemFirmwareVersion) {
                self.watchmon.systemFirmwareVersion = message.systemFirmwareVersion;
                self.updateSetting('firmwareVersion', message.systemFirmwareVersion);
            }

            if (message.numOfCellsActive != self.watchmon.numOfCellsActive) {
                self.watchmon.numOfCellsActive = message.numOfCellsActive;
                self.updateSetting('numOfCellsActive', message.numOfCellsActive);
            }

        });


        self.watchmon.api.on('error', error => {
            self.error('Houston we have a problem', error);

            let message = '';
            if (self.isError(error)) {
                message = error.stack;
            } else {
                try {
                    message = JSON.stringify(error, null, "  ");
                } catch (e) {
                    self.log('Failed to stringify object', e);
                    message = error.toString();
                }
            }

            self.setSettings({ last_error: dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss') + '\n' + message })
                .catch(err => {
                    self.error('Failed to update settings', err);
                });
        });
    }

    isError(err) {
        return (err && err.stack && err.message);
    }

    _updateProperty(key, value) {
        //Ignore unknown capabilities
        if (this.hasCapability(key)) {
            //All trigger logic only applies to changed values
            if (this.isCapabilityValueChanged(key, value)) {
                this.setCapabilityValue(key, value);

                if (key == 'battery_status') {
                    let tokens = {
                        status: value
                    }
                    this.driver.triggerDeviceFlow('battery_status_changed', tokens, this);

                } else if (key == 'powerrate_status.Charge') {
                    let tokens = {
                        status: value
                    }
                    this.driver.triggerDeviceFlow('charge_rate_status_changed', tokens, this);

                } else if (key == 'powerrate_status.Discharge') {
                    let tokens = {
                        status: value
                    }
                    this.driver.triggerDeviceFlow('discharge_rate_status_changed', tokens, this);

                } else if (key == 'battery_capacity') {
                    let tokens = {
                        soc: value
                    }
                    this.driver.triggerDeviceFlow('soc_changed', tokens, this);
                }
            } else {
                //Update value to refresh timestamp in app
                this.setCapabilityValue(key, value);
            }
        }
    }

    isCapabilityValueChanged(key, value) {
        let oldValue = this.getCapabilityValue(key);
        //If oldValue===null then it is a newly added device, lets not trigger flows on that
        if (oldValue !== null && oldValue != value) {
            return true;
        } else {
            return false;
        }
    }

    onDeleted() {
        this.log(`Deleting Watchmon '${this.getName()}' from Homey.`);
        this.watchmon.api.disconnect();
        this.watchmon = null;
    }

    onRenamed(name) {
        this.log(`Renaming Watchmon from '${this.watchmon.name}' to '${name}'`);
        this.watchmon.name = name;
    }
}

module.exports = WatchmonDevice;
