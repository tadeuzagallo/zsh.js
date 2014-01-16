var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('pwd', pwd);

function pwd(args, stdin, stdout, stderr) {
  var _pwd = FS.currentPath;

  if (args === true) {
    _pwd = _pwd.replace(FS.home, '~');
  }

  if (stdout) {
    stdout(_pwd);
  } else {
    return pwd;
  }
}
