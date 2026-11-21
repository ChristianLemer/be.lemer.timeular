'use strict';

const Homey = require('homey');

module.exports = class TimeularApp extends Homey.App {

  async onInit() {
    this.log('Timeular app started');
  }

};
