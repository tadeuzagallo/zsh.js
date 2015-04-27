import File from './file';
import FS from './fs';

export default function (args, stdin, stdout, stderr, next) {
  var path = args.arguments[0] || '~';
  var dir = File.open(path);

  if (!dir.exists()) {
    stderr.write(FS.notFound('cd', path));
  } else if (dir.isFile()) {
    stderr.write(FS.error('cd', path, 'Is a file'));
  } else {
    FS.currentPath = dir.path;
    FS.currentDir = dir.self();
  }

  FS.writeFS();
  next();
}
