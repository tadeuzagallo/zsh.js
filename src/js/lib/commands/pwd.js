var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('pwd', pwd);

function pwd(args, stdin, stdout, stderr) {
  var pwd = FS.currentPath;

  if (args === true) {
    pwd = pwd.replace(FS.home, '~');
  }

  if (stdout) {
    stdout(pwd);
  } else {
    return pwd;
  }
}
