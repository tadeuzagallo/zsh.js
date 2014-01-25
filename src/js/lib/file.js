var FS = require('./fs');

var File = (function () {
  function File(path) {
    this.path = path;

    path = path.split('/');

    this.filename = path.pop();
    this.dirname = path.join('/');
    this.dir = FS.open(this.dirname);
  }

  File.prototype.parentExists = function () {
    return this.dir !== undefined;
  };

  File.prototype.isValid = function () {
    return typeof this.dir === 'object';
  };

  File.prototype.exists = function () {
    return this.dir !== undefined && this.dir[this.filename] !== undefined;
  };

  File.prototype.isFile = function () { 
    return this.dir !== undefined && typeof this.dir[this.filename] === 'string';
  };

  File.prototype.isDir = function () {
    return this.dir !== undefined && typeof this.dir[this.filename] === 'object';
  };

  File.prototype.delete = function () {
    if (this.exists()) {
      delete this.dir[this.filename];
    }
  };

  File.prototype.clear = function () {
    if (this.exists()) {
      var content = {};

      if (this.isFile()) {
        content = '';
      }

      this.dir[this.filename] = content;
    }
  };

  File.prototype.write = function (content, append, force) {
    if ((this.isFile() || (force && this.isValid() && !this.exists())) && typeof content === 'string') {
      var _content = '';
      if (append) {
        _content += [this.dir[this.filename]];
      }

      this.dir[this.filename] = _content + content;
    }
  };

  File.prototype.read = function (cb) {
    cb(this.dir[this.filename]);
  };

  return File;
})();

module.exports = File;
