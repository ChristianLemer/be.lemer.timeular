'use strict';

const Homey = require('homey');
const protocol = require('../../lib/protocol');

module.exports = class TrackerDriver extends Homey.Driver {

  async onInit() {
    this.faceChanged = this.homey.flow.getDeviceTriggerCard('face_changed');

    this.faceTurnedTo = this.homey.flow.getDeviceTriggerCard('face_turned_to');
    this.faceTurnedTo.registerRunListener(async (args, state) => String(state.face) === args.face);

    this.homey.flow.getConditionCard('face_is')
      .registerRunListener(async (args) => String(args.device.getCapabilityValue('timeular_face')) === args.face);
  }

  // Called by the device once a face has settled.
  async triggerFace(device, face) {
    const tokens = { face };
    const state = { face };
    await Promise.all([
      this.faceChanged.trigger(device, tokens, state),
      this.faceTurnedTo.trigger(device, tokens, state),
    ]).catch((err) => this.error('Flow trigger failed:', err));
  }

  // The tracker sleeps when still: ask the user to move it before searching.
  async onPairListDevices() {
    const advertisements = await this.homey.ble.discover();
    this.log(`Pairing: ${advertisements.length} BLE advertisements:`,
      advertisements.map((a) => a.localName || a.address).join(', '));
    return advertisements
      .filter(protocol.isTracker)
      .map((adv) => ({
        name: 'Timeular Tracker',
        data: { id: adv.uuid },
      }));
  }

};
