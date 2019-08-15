(function() {
  'use strict';

  class TKBA {
    constructor() {
      this.device = null;
      this.server = null;
      this._characteristics = new Map();
    }
    connect() {
      return navigator.bluetooth.requestDevice({
        filters: [{
          services : ['f0ba1b00-c6b5-11e2-8b8b-0800200c9a66']
        }]
      })
      .then(device => {
        this.device = device;
        return device.gatt.connect();
      })
      .then(server => {
        this.server = server;
        console.log('Getting Service');
        return Promise.all([
          server.getPrimaryService('f0ba1b00-c6b5-11e2-8b8b-0800200c9a66').then(service => {
            console.log('Primary service ok...');
            return Promise.all([
              this._cacheCharacteristic(service, 'f0ba1b01-c6b5-11e2-8b8b-0800200c9a66'),
              this._cacheCharacteristic(service, 'f0ba1b02-c6b5-11e2-8b8b-0800200c9a66'),
              this._cacheCharacteristic(service, 'f0ba1b03-c6b5-11e2-8b8b-0800200c9a66'),
            ])
          })
        ]);
      })
    }

    /* Notifications */

    startNotificationsCCD() {
      console.log('Starting notifications for CCD');
      return this._startNotifications('f0ba1b01-c6b5-11e2-8b8b-0800200c9a66');
    }
    stopNotificationsCCD() {
      console.log('Starting notifications for CCD');
      return this._stopNotifications('f0ba1b01-c6b5-11e2-8b8b-0800200c9a66');
    }
    startNotificationsAccelerometer() {
      console.log('Starting notifications for Accelerometer');
      return this._startNotifications('f0ba1b02-c6b5-11e2-8b8b-0800200c9a66');
    }
    stopNotificationsAccelerometer() {
      return this._stopNotifications('f0ba1b02-c6b5-11e2-8b8b-0800200c9a66');
    }
    
    /* Utils */

    _cacheCharacteristic(service, characteristicUuid) {
      return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        this._characteristics.set(characteristicUuid, characteristic);
      });
    }
    _readCharacteristicValue(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.readValue()
      .then(value => {
        // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
        value = value.buffer ? value : new DataView(value);
        return value;
      });
    }
    _writeCharacteristicValue(characteristicUuid, value) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.writeValue(value);
    }
    _startNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to set up characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.startNotifications()
      .then(() => characteristic);
    }
    _stopNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to remove characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.stopNotifications()
      .then(() => characteristic);
    }
  }

  window.tkba = new TKBA();

})();
