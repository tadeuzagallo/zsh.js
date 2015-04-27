import File from './file';
import FS from './fs';

export default function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = File.open(path);

    if (!file.exists()) {
      stderr.write(FS.notFound('cat', path));
    } else if (file.isDir()) {
      stderr.write(FS.error('cat', path, 'Is a directory'));
    } else {
      stdout.write(file.read());
    }
  });

  next();
}
