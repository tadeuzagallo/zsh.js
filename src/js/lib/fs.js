var CommandManager = require('./command-manager');

var FS = {};

FS.currentPath = FS.home = '/Users/guest';
FS.root = require('./file-system.json');

FS.currentDir = null;
FS.pwd = FS.root.Users.guest;

FS.translatePath = function (path) {
  var index;

  path = path.replace('~', FS.home);

  if (path[0] !== '/') {
    path = FS.currentPath + '/' + path;
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

  path = path.substr(1).split('/');

  var cwd = FS.root;
  while(path.length && cwd) {
    cwd = cwd[path.shift()];
  }

  return cwd;
};

FS.exists = function (path) {
  return !!FS.open(path);
};

FS.ls = function (args, stdout) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = FS.open(arg);

    outputs.push({
      path: arg,
      success: !!dir,
      files: dir ? Object.keys(dir).join(' ') : 'ls: ' + arg + ': No such file or directory'
    });
  });

  if (outputs.length === 1) {
    stdout(outputs.shift().files);
  } else {
    var out = '';
    outputs.forEach(function (output) {
      out += (output.success ? output.path+':\n' + output.files:output.files) + '\n';
    });
    stdout(out);
  }
};

FS.cd = function (args, stdout) {
};

FS.autocomplete = function () {
};

FS.read = function () {
};

CommandManager.register('ls', FS.ls);
CommandManager.register('cd', FS.cd);
CommandManager.register('read', FS.read);

module.exports = FS;
