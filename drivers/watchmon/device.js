'use strict';

const { Device } = require('homey');
const Watchmon = require('../../lib/batrium.js');
const enums = require('../../lib/enums.js');

const deviceClass = 'battery';

class WatchmonDevice extends Device {

    async onInit() {
        this.logMessage('Watchmon device initiated');

        // Change device class to evcharger if not already
        if (this.getClass() !== deviceClass) {
            await this.setClass(deviceClass);
        }

        // Setup capabilities
        await this.setupCapabilities();

        // Register device triggers
        this._battery_status_changed = this.homey.flow.getDeviceTriggerCard('battery_status_changed');
        this._charge_rate_status_changed = this.homey.flow.getDeviceTriggerCard('charge_rate_status_changed');
        this._discharge_rate_status_changed = this.homey.flow.getDeviceTriggerCard('discharge_rate_status_changed');
        this._cell_volt_diff_changed = this.homey.flow.getDeviceTriggerCard('cell_volt_diff_changed');
        this._soc_changed = this.homey.flow.getDeviceTriggerCard('soc_changed');

        this.watchmon = {
            cellVoltDiff: null,
            api: null
        };

        this.watchmon.api = new Watchmon({
            systemId: this.getData().systemId,
            device: this
        });

        this._initializeEventListeners();
    }

    async setupCapabilities() {
        this.logMessage('Setting up capabilities');
        await this.addCapabilityHelper('measure_battery');
        await this.removeCapabilityHelper('battery_capacity');
    }

    async removeCapabilityHelper(capability) {
        if (this.hasCapability(capability)) {
            try {
                this.logMessage(`Remove existing capability '${capability}'`);
                await this.removeCapability(capability);
            } catch (reason) {
                this.error(`Failed to removed capability '${capability}'`);
                this.error(reason);
            }
        }
    }
    async addCapabilityHelper(capability) {
        if (!this.hasCapability(capability)) {
            try {
                this.logMessage(`Adding missing capability '${capability}'`);
                await this.addCapability(capability);
            } catch (reason) {
                this.error(`Failed to add capability '${capability}'`);
                this.error(reason);
            }
        }
    }

    updateSetting(key, value) {
        let obj = {};
        if (typeof value === 'string' || value instanceof String) {
            obj[key] = value;
        } else {
            //If not of type string then make it string
            obj[key] = String(value);
        }

        this.setSettings(obj).catch(err => {
            this.error(`Failed to update setting '${key}' with value '${value}'`, err);
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
                    cellMaxVolt: maxCellVolt,
                    batteryVolt: this.getCapabilityValue('measure_voltage')
                }
                this._cell_volt_diff_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });
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
            self._updateProperty('measure_battery', message.shuntSOC);
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

            self.setSettings({
                numOfCellsActive: String(message.numOfCellsActive),
                firmwareVersion: String(message.systemFirmwareVersion),
                hardwareVersion: String(message.systemHardwareVersion)
            })
                .catch(err => {
                    self.error('Failed to update discoveryMessage settings', err);
                });
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

            const dateTime = new Date().toISOString();
            self.setSettings({ last_error: dateTime + '\n' + message })
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
                    this._battery_status_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });

                } else if (key == 'powerrate_status.Charge') {
                    let tokens = {
                        status: value
                    }
                    this._charge_rate_status_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });

                } else if (key == 'powerrate_status.Discharge') {
                    let tokens = {
                        status: value
                    }
                    this._discharge_rate_status_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });

                } else if (key == 'measure_battery') {
                    let tokens = {
                        soc: value
                    }
                    this._soc_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });
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
        this.logMessage('Deleting Watchmon from Homey.');
        this.watchmon.api.disconnect();
        this.watchmon = null;
    }

    logMessage(message) {
        this.log(`[${this.getName()}] ${message}`);
    }

    logError(error) {
        this.error(error);
        let message = '';
        if (this.isError(error)) {
            message = error.stack;
        } else {
            try {
                message = JSON.stringify(error, null, "  ");
            } catch (e) {
                this.error('Failed to stringify object', e);
                message = error.toString();
            }
        }
        let dateTime = new Date().toISOString();
        this.updateSetting('last_error', dateTime + '\n' + message);
    }
}

module.exports = WatchmonDevice;
