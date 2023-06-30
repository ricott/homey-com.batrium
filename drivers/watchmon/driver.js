'use strict';

const { Driver } = require('homey');
const Watchmon = require('../../lib/batrium.js');
const enums = require('../../lib/enums.js');

class WatchmonDriver extends Driver {

    async onInit() {
        this.log('Watchmon driver has been initialized');
        this._registerFlows();
    }

    _registerFlows() {
        this.log('Registering flows');

        //Conditions
        const battery_status_condition = this.homey.flow.getConditionCard('battery_status_condition');
        battery_status_condition.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'battery_status_condition' triggered`);
            let status = args.device.getCapabilityValue('battery_status');
            this.log(`[${args.device.getName()}] status: ${status}`);
            this.log(`[${args.device.getName()}] condition.status: ${args.status.name}`);

            if (status == args.status.name) {
                return true;
            } else {
                return false;
            }
        });
        battery_status_condition.registerArgumentAutocompleteListener('status',
            async (query, args) => {
                return enums.getBatteryStatuses();
            }
        );


        const battery_soc_condition = this.homey.flow.getConditionCard('battery_soc_condition');
        battery_soc_condition.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'battery_soc_condition' triggered`);
            let soc = args.device.getCapabilityValue('battery_capacity');
            this.log(`[${args.device.getName()}] soc: ${soc}`);
            this.log(`[${args.device.getName()}] condition.soc: ${args.soc}`);

            if (soc < args.soc) {
                return true;
            } else {
                return false;
            }
        });

        const cell_diff_condition = this.homey.flow.getConditionCard('cell_diff_condition');
        cell_diff_condition.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'cell_diff_condition' triggered`);
            this.log(`[${args.device.getName()}] cell diff: ${args.device.watchmon.cellVoltDiff}`);
            this.log(`[${args.device.getName()}] condition.volt: ${args.volt}`);

            if (args.device.watchmon.cellVoltDiff < args.volt) {
                return true;
            } else {
                return false;
            }
        });

    }

    async onPair(session) {
        session.setHandler('list_devices', async (data) => {
            let devices = [];
            let watchmon = new Watchmon({
                device: this
            });

            watchmon.on('discoveryMessage', message => {
                let systemId = `SYS${message.systemId}`
                if (!devices.find((wm) => wm.data.id === systemId)) {
                    this.log(`Adding to devices: ${systemId}`);
                    devices.push({
                        name: `Watchmon (${systemId})`,
                        data: {
                            id: systemId,
                            systemId: message.systemId
                        }
                    });
                }
            });

            //Wait for some time and see what we find
            return await this.#sleep(2500).then(() => {
                try {
                    watchmon.disconnect();
                } catch (err) {
                    this.log(err);
                }

                if (devices.length == 0) {
                    this.log('No Watchmon UDP datagrams received...');
                }
                return devices;
            }).catch(reason => {
                this.log('Timeout error', reason);
                return devices;
            });
        });
    }

    #sleep(time) {
        return new Promise((resolve) => this.homey.setTimeout(resolve, time));
    }
}
module.exports = WatchmonDriver;
