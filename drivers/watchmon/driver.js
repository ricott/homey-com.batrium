'use strict';

const { Driver } = require('homey');
const Watchmon = require('../../lib/batrium.js');

class WatchmonDriver extends Driver {

    async onInit() {
        this.log('Watchmon driver has been initialized');
		this.flowCards = {};
		this._registerFlows();
    }

	_registerFlows() {
		this.log('Registering flows');

    	// Register device triggers
		this.flowCards['operational_status_changed'] = this.homey.flow.getDeviceTriggerCard('operational_status_changed');
        this.flowCards['charge_rate_status_changed'] = this.homey.flow.getDeviceTriggerCard('charge_rate_status_changed');
        this.flowCards['discharge_rate_status_changed'] = this.homey.flow.getDeviceTriggerCard('discharge_rate_status_changed');
        this.flowCards['cell_volt_diff_changed'] = this.homey.flow.getDeviceTriggerCard('cell_volt_diff_changed');
    }

	triggerDeviceFlow(flow, tokens, device) {
		this.log(`[${device.getName()}] Triggering device flow '${flow}' with tokens`, tokens);
		this.flowCards[flow].trigger(device, tokens);
	}

    async onPair(session) {
        session.setHandler('list_devices', async (data) => {
            let devices = [];

            let watchmon = new Watchmon({});
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
            return await sleep(2500).then(() => {
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

}
module.exports = WatchmonDriver;

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
