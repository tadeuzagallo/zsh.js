export default class Stream {
  constructor() {
    this._callbacks = {};
  }

  on(event, callback) {
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }

    this._callbacks[event].push(callback);
  }

  write(data) {
    this.emmit('data', data);
  }

  emmit(event, data) {
    var callbacks = this._callbacks[event];
    callbacks && callbacks.forEach(function (callback) {
      callback(data);
    });
  }
}
