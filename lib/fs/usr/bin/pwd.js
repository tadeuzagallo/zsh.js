import FS from './fs';

export default function (args, stdin, stdout, stderr, next) {
  var pwd = FS.currentPath;

  if (stdout) {
    stdout.write(pwd);
    next();
  } else {
    return pwd;
  }
}
