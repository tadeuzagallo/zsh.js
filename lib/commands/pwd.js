var CommandManager = require('../command-manager');
var FS = require('../fs');

function pwd(args, stdin, stdout, stderr, next) {
  var _pwd = FS.currentPath;

  if (args === true) {
    _pwd = _pwd.replace(FS.home, '~');
  }

  if (stdout) {
    stdout.write(_pwd);
    next();
  } else {
    return _pwd;
  }
}

CommandManager.register('pwd', pwd);
module.exports = pwd;
