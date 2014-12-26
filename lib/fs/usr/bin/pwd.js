return function (args, stdin, stdout, stderr, next) {
  var _pwd = FS.currentPath;

  if (stdout) {
    stdout.write(_pwd);
    next();
  } else {
    return _pwd;
  }
};
