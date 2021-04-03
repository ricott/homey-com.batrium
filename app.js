'use strict';

const { App } = require('homey');
const { Log } = require('homey-log');

class BatriumApp extends App {
  async onInit() {
    this.homeyLog = new Log({ homey: this.homey });
    this.log('Batrium app has been initialized');
  }
}

module.exports = BatriumApp;