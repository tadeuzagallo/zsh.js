var CommandManager = require('./command-manager');

var FS = {};

FS.home = '/Users/guest';
FS.root = require('./file-system.json');

FS.currentDir = null;
FS.currentPath = '~';
FS.pwd = FS.root.Users.guest;

FS.absolutePath = function(path) {
  return path.replace(/[^\/]+\/\.\./g, '')
    .replace(/\./g, '')
    .replace(/\/{2,}/g, '/');
};
FS.parse = function (path) {
  if (path === '~') {
    path = FS.home;
  }

  path = FS.absolutePath(path);

  var directories = path.split('/').filter(String);
  var root;

  if (path[0] === '/') {
    root = FS.root;
    directories.shift();
  } else {
    root = FS.pwd;
  }

  directories.forEach(function (dir) {
    if (!dir || !root) {
      root = null;
      return;
    }

    root = root[dir];
  });
  console.log(root, directories, FS.pwd);

  return root;
};

FS.ls = function (args, stdout) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = FS.parse(arg);
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
