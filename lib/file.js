import FS from './fs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default class File {
  constructor(path) {
    this.path = FS.translatePath(path);
    path = this.path.split('/');
    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = FS.open(this.dirname);
  }

  static open(path) {
    return new File(path);
  }

  static getTimestamp () {
    return new Date().toISOString();
  }

  parentExists() {
    return this.dir !== undefined;
  }

  isValid() {
    return typeof this.dir === 'object' && this.dir.type === 'd';
  }

  exists() {
    return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
  }

  isFile() {
    return this.exists() && this.filename &&
      this.dir.content[this.filename].type === 'f';
  }

  isDir() {
    return this.exists() &&
      (!this.filename || this.dir.content[this.filename].type === 'd');
  }

  delete() {
    if (this.exists()) {
      delete this.dir.content[this.filename];
      FS.writeFS();
    }
  }

  clear() {
    this.write('', false, true);
  }

  write(content, append, force) {
    var time = File.getTimestamp();

    if (!this.exists()) {
      if (force && this.isValid()) {
        this.createFile(time);
      } else {
        throw new Error('Invalid file: ' + this.path);
      }
    } else if (!this.isFile()) {
      throw new Error('Cannot write to directory: %s', this.path);
    }

    var _content = '';
    if (append) {
      _content += this.read();
    }

    this.dir.mtime = time;
    this.dir.content[this.filename].mtime = time;
    this.dir.content[this.filename].content = _content + content;
    FS.writeFS();
  }

  read() {
    if (!this.exists()) {
      throw new Error('File %s doesn\'t exist', this.path);
    }
    return this.filename ? this.dir.content[this.filename].content : this.dir.content;
  }

  _create(type, content, timestamp) {
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
  }

  createFolder(timestamp) {
    this._create('d', {}, timestamp);
  }

  createFile(timestamp) {
    this._create('f', '', timestamp);
  }

  self() {
    return this.filename ? this.dir.content[this.filename] : this.dir;
  }

  open(file) {
    return File.open(this.path + '/' + file);
  }

  length() {
    var content = this.read();

    if (this.isFile()) {
      return content.length;
    } else if (this.isDir()) {
      return Object.keys(content).length;
    } else {
      return 0;
    }
  }

  mtime() {
    var t = new Date(this.self().mtime);

    var dayAndMonth = MONTHS[t.getMonth()] + ' ' + t.getDay();
    if (Date.now() - t.getTime() > 6 * 30 * 24 * 60 * 60 * 1000) {
      return dayAndMonth + ' ' + t.getFullYear();
    } else {
      return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
    }
  };
}
