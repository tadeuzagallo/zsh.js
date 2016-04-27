import File from 'zsh.js/file';
import FS from 'zsh.js/fs';

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
