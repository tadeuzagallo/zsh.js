'use strict';

var FS = require('./fs');

var File = (function () {
  function File(path) {
    path = FS.translatePath(path);
    this.path = path;

    path = path.split('/');

    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = FS.open(this.dirname);
  }

  File.open = function (path) {
    return new File(path);
  };

  File.getTimestamp = function () {
    return new Date().toISOString();
  };

  File.prototype.parentExists = function () {
    return this.dir !== undefined;
  };

  File.prototype.isValid = function () {
    return typeof this.dir === 'object' && this.dir.type === 'd';
  };

  File.prototype.exists = function () {
    return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
  };

  File.prototype.isFile = function () {
    return this.exists() && this.filename && this.dir.content[this.filename].type === 'f';
  };

  File.prototype.isDir = function () {
    return this.exists() && (!this.filename || this.dir.content[this.filename].type === 'd');
  };

  File.prototype.delete = function () {
    if (this.exists()) {
      delete this.dir.content[this.filename];
      FS.writeFS();
    }
  };

  File.prototype.clear = function () {
    this.write('', false, true);
  };

  File.prototype.write = function (content, append, force) {
    var time = File.getTimestamp();

    if (!this.exists()) {
      if (force && this.isValid()) {
        this.createFile(time);
      } else {
        throw new Error('Invalid file: ' + this.path);
      }
    } else if (!this.isFile()) {
      throw new Error('Cannot write to directory: %s', this.path);
    } else {
      var _content = '';
      if (append) {
        _content += this.read();
      }

      this.dir.mtime = time;
      this.dir.content[this.filename].mtime = time;
      this.dir.content[this.filename].content = _content + content;
      FS.writeFS();
    }
  };

  File.prototype.read = function () {
    return this.filename ? this.dir.content[this.filename].content : this.dir.content;
  };

  var _create = function (type, content) {
    return function (timestamp) {
      if (this.exists()) {
        throw new Error('File %s already exists', this.path);
      }

      if (!timestamp) {
        timestamp = File.getTimestamp();
      }

      this.dir.content[this.filename] = {
        ctime: timestamp,
        mtime: timestamp,
        content: content,
        type: type
      };

      FS.writeFS();
    };
  };

  File.prototype.createFolder = _create('d', {});
  File.prototype.createFile = _create('f', '');

  File.prototype.self = function () {
    return this.filename ? this.dir : this.dir.content[this.filename];
  };

  File.prototype.open = function (file) {
    return File.open(this.path + '/' + file);
  };

  File.prototype.length = function () {
    var content = this.read();

    if (this.isFile()) {
      return content.length;
    } else if (this.isDir()) {
      return Object.keys(content).length;
    } else {
      return 0;
    }
  };

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  File.prototype.mtime = function () {
    var t = new Date(this.self().mtime);

    var dayAndMonth =  months[t.getMonth()] + ' ' + t.getDay();
    if (Date.now() - t.getTime() > 6 * 30 * 24 * 60* 60 * 1000) {
      return dayAndMonth + ' ' + t.getFullYear();
    } else {
      return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
    }
  };

  return File;
})();

module.exports = File;
