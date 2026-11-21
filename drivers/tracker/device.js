'use strict';

const Homey = require('homey');
const protocol = require('../../lib/protocol');

const RECONNECT_MIN_MS = 5 * 1000;
const RECONNECT_MAX_MS = 5 * 60 * 1000;
const BATTERY_EVERY_MS = 30 * 60 * 1000;
const POLL_EVERY_MS = 1000; // fallback when notifications are unavailable

module.exports = class TrackerDevice extends Homey.Device {

  async onInit() {
    this.peripheral = null;
    this.stopped = false;
    this.reconnectDelay = RECONNECT_MIN_MS;
    this.settleTimer = null;
    this.batteryTimer = null;
    this.pollTimer = null;
    this.lastSettledFace = this.getCapabilityValue('timeular_face');

    this.connect();
  }

  // --- connection ---------------------------------------------------------

  async connect() {
    if (this.stopped) return;
    try {
      const { id } = this.getData();
      const advertisement = await this.homey.ble.find(id);
      this.peripheral = await advertisement.connect();
      this.peripheral.once('disconnect', () => this.onDisconnect());
      this.log('Connected');

      await this.listenOrientation();
      await this.readBattery();
      this.batteryTimer = this.homey.setInterval(() => this.readBattery(), BATTERY_EVERY_MS);

      this.reconnectDelay = RECONNECT_MIN_MS;
      await this.setAvailable();
    } catch (err) {
      this.log('Connection failed:', err.message);
      await this.setUnavailable(this.homey.__('unavailable')).catch(this.error);
      this.scheduleReconnect();
    }
  }

  onDisconnect() {
    this.log('Disconnected');
    this.clearTimers();
    this.peripheral = null;
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.stopped) return;
    this.homey.setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }

  // --- orientation --------------------------------------------------------

  async listenOrientation() {
    const service = await this.peripheral.getService(protocol.ORIENTATION_SERVICE);
    const characteristic = await service.getCharacteristic(protocol.ORIENTATION_CHAR);

    this.onRawFace(protocol.parseFace(await characteristic.read()));

    try {
      await characteristic.subscribeToNotifications((data) => this.onRawFace(protocol.parseFace(data)));
      this.log('Subscribed to orientation notifications');
    } catch (err) {
      // Homey documents notify, not indicate: fall back to polling.
      this.log('Notifications unavailable, polling instead:', err.message);
      this.pollTimer = this.homey.setInterval(async () => {
        try {
          this.onRawFace(protocol.parseFace(await characteristic.read()));
        } catch (e) {
          this.error('Poll failed:', e.message);
        }
      }, POLL_EVERY_MS);
    }
  }

  // Every raw face restarts the settle timer; only a face that rests fires.
  onRawFace(face) {
    if (face === null) return;
    if (this.settleTimer) this.homey.clearTimeout(this.settleTimer);
    if (face === 0) return; // on an edge: wait

    const settleMs = this.getSetting('settle_ms') ?? 1500;
    this.settleTimer = this.homey.setTimeout(() => this.onSettledFace(face), settleMs);
  }

  async onSettledFace(face) {
    this.settleTimer = null;
    if (face === this.lastSettledFace) return;
    this.lastSettledFace = face;
    this.log('Face', face);
    await this.setCapabilityValue('timeular_face', face).catch(this.error);
    await this.driver.triggerFace(this, face);
  }

  // --- battery ------------------------------------------------------------

  async readBattery() {
    if (!this.peripheral) return;
    try {
      const data = await this.peripheral.read(protocol.BATTERY_SERVICE, protocol.BATTERY_CHAR);
      await this.setCapabilityValue('measure_battery', data[0]);
    } catch (err) {
      this.error('Battery read failed:', err.message);
    }
  }

  // --- lifecycle ----------------------------------------------------------

  clearTimers() {
    for (const t of [this.batteryTimer, this.pollTimer]) if (t) this.homey.clearInterval(t);
    if (this.settleTimer) this.homey.clearTimeout(this.settleTimer);
    this.batteryTimer = this.pollTimer = this.settleTimer = null;
  }

  async shutdown() {
    this.stopped = true;
    this.clearTimers();
    if (this.peripheral) await this.peripheral.disconnect().catch(this.error);
    this.peripheral = null;
  }

  async onDeleted() {
    await this.shutdown();
  }

  async onUninit() {
    await this.shutdown();
  }

};
