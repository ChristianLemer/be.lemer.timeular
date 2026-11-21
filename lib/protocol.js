'use strict';

// Timeular Tracker BLE protocol — verified against a physical tracker
// (firmware advertising "Timeular Tra") on 2026-11-21.
// Homey expects UUIDs lowercase without dashes.

const uuid = (s) => s.replace(/-/g, '').toLowerCase();

module.exports = {
  NAME_PREFIX: 'Timeular',
  ORIENTATION_SERVICE: uuid('c7e70010-c847-11e6-8175-8c89a55d403c'),
  ORIENTATION_CHAR: uuid('c7e70012-c847-11e6-8175-8c89a55d403c'),
  BATTERY_SERVICE: uuid('0000180f-0000-1000-8000-00805f9b34fb'),
  BATTERY_CHAR: uuid('00002a19-0000-1000-8000-00805f9b34fb'),

  // One byte: 1..8 = face up, 0 = no face (on an edge / in motion).
  parseFace(buf) {
    if (!buf || buf.length < 1) return null;
    const face = buf[0];
    return face >= 0 && face <= 8 ? face : null;
  },

  isTracker(advertisement) {
    return typeof advertisement.localName === 'string'
      && advertisement.localName.startsWith('Timeular');
  },
};
