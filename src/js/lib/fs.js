var CommandManager = require('./command-manager');
var localStorage = require('./local-storage');

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.root = JSON.parse(localStorage.getItem(FILE_SYSTEM_KEY)) || require('./file-system.json');
FS.currentPath = FS.home = '/Users/guest';
FS.currentDir = FS.root.Users.guest;

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

  return path.join('/');
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
    cwd = cwd[path.shift()];
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

FS.autocomplete = function (path) {
  path = path.split('/');
  var fileName = path.pop().toLowerCase();
  var parentPath = path.join('/');
  var dir = FS.open(parentPath);
  var options = [];

  if (dir) {
    for (var key in dir) {
      if (key.substr(0, fileName.length).toLowerCase() === fileName) {
        options.push(key);
      }
    }
  }

  return options;
};

FS.writeFS = function () {
  console.log('writing...');
  localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};

module.exports = FS;
