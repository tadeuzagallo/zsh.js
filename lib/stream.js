'use strict';

function Stream() {
  this._callbacks = {};
}

Stream.prototype.on = function (event, callback) {
  if (!this._callbacks[event]) {
    this._callbacks[event] = [];
  }

  this._callbacks[event].push(callback);
};

Stream.prototype.write = function (data) {
  this.emmit('data', data);
};

Stream.prototype.emmit = function (event, data) {
  var callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

module.exports = Stream;
