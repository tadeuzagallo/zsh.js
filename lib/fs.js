// jshint strict:false
var LocalStorage = require('./local-storage');

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.writeFS = function () {
  LocalStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};


var hasOwnProp = Object.prototype.hasOwnProperty;

FS.root = JSON.parse(LocalStorage.getItem(FILE_SYSTEM_KEY));
var fileSystem = require('./file-system.json');
if (!FS.root) {
  FS.root = fileSystem;
} else {
  (function readdir(root, file) {
    for (var key in file) {
      if (!hasOwnProp.call(root, key)) {
        root[key] = file[key];
      } else if (file[key].type === 'd') {
        if (!root[key].content) {
          // backward compatible
          var content = root[key];
          var time = new Date().toISOString();
          root[key] = {
            ctime: time,
            mtime: time,
            content: content
          };
        }
        readdir(root[key].content || root[key], file[key].content);
      } else {
        if (root[key].mtime === root[key].ctime) {
          root[key] = file[key];
        }
      }
    }
  })(FS.root, fileSystem);
  FS.writeFS();
}

FS.currentPath = FS.home = '/Users/guest';
FS.currentDir = FS.root.Users.content.guest;

FS.dirname = function (path) {
  return path.split('/').slice(0, -1).join('/');
};

FS.basename = function (path) {
  return path.split('/').pop();
};

FS.translatePath = function (path) {
  var index;

  path = path.replace('~', FS.home);

  if (path[0] !== '/') {
    path = (FS.currentPath !== '/' ? FS.currentPath + '/' : '/') + path;
  }

  path = path.split('/');

  while(~(index = path.indexOf('..'))) {
    path.splice(index-1, 2);
  }

  while(~(index = path.indexOf('.'))) {
    path.splice(index, 1);
  }

  if (path[0] === '.') {
    path.shift();
  }

  if (path.length < 2) {
    path = [,,];
  }

  return path.join('/').replace(/([^/]+)\/+$/, '$1');
};

FS.realpath = function(path) {
  path = FS.translatePath(path);

  return FS.exists(path) ? path : null;
};


FS.open = function (path) {
  if (path[0] !== '/') {
    path = FS.translatePath(path);
  }

  path = path.substr(1).split('/').filter(String);

  var cwd = FS.root;
  while(path.length && cwd) {
    cwd = (cwd[path.shift()] || 0).content;
  }

  return cwd;
};

FS.exists = function (path) {
  return !!FS.open(path);
};

FS.error = function () {
  return [].join.call(arguments, ': ');
};

FS.notFound = function (cmd, arg) {
  return FS.error(cmd, arg, 'No such file or directory');
};

FS.autocomplete = function (_path) {
  var path = this.translatePath(_path);
  var options = [];

  if (_path.slice(-1) === '/') {
    path += '/';
  }

  if (path !== undefined) {
    var filename = _path.split('/').pop();
    var openPath = filename.length > 1 ? path.slice(0, -1) : path;
    var dir = FS.open(openPath);
    var fileName = '';
    var parentPath = path;

    if (!dir) {
      path = path.split('/');
      fileName = path.pop().toLowerCase();
      parentPath = path.join('/') || '/';
      dir = FS.open(parentPath);
    }

    if (dir && typeof dir === 'object') {
      for (var key in dir) {
        if (key.substr(0, fileName.length).toLowerCase() === fileName) {
          if (typeof dir[key].content === 'object') {
            key += '/';
          }

          options.push(key);
        }
      }
    }
  }

  return options;
};

module.exports = FS;
