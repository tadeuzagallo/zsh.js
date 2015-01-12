'use strict';

return function (args, stdin, stdout, stderr, next) {
  var _pwd = ZSH.fs.currentPath;

  if (stdout) {
    stdout.write(_pwd);
    next();
  } else {
    return _pwd;
  }
};
