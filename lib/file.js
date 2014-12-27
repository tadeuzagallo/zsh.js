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
    return typeof this.dir === 'object';
  };

  File.prototype.exists = function () {
    return this.dir !== undefined && typeof this.dir[this.filename] !== 'undefined';
  };

  File.prototype.isFile = function () { 
    return this.exists() && typeof this.dir[this.filename].content === 'string';
  };

  File.prototype.isDir = function () {
    return this.exists() && this.dir[this.filename].content === 'object';
  };

  File.prototype.delete = function () {
    if (this.exists()) {
      delete this.dir[this.filename];
    }
  };

  File.prototype.clear = function () {
    this.write('');
  };

  File.prototype.write = function (content, append, force) {
    var time = File.getTimestamp();

    if (!this.exists()) {
      if (force && this.isValid()) {
        this.createFile(time);
      } else {
        throw new Error('Invalid file: %s', this.path);
      }
    } else if (!this.isFile()) {
      throw new Error('Cannot write to directory: %s', this.path);
    } else {
      var _content = '';
      if (append) {
        _content += this.read();
      }

      this.dir.mtime = time;
      this.dir[this.filename].mtime = time;
      this.dir[this.filename].content = _content + content;
    }
  };

  File.prototype.read = function () {
    return this.dir[this.filename].content;
  };

  var _create = function (type) {
    return function () {
      if (this.exists()) {
        throw new Error('File %s already exists', this.path);
      }

      var timestamp = File.getTimestamp();
      this.dir[this.filename] = {
        ctime: timestamp,
        mtime: timestamp,
        content: type
      };
    };
  };

  File.prototype.createFolder = _create({});
  File.prototype.createFile = _create('');

  File.prototype.self = function () {
    return this.dir[this.filename];
  };

  return File;
})();

module.exports = File;
