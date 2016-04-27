import File from 'zsh.js/file';
import FS from 'zsh.js/fs';

export default function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = File.open(path);

    if (!file.parentExists()) {
      stderr.write(FS.notFound('touch', path));
    } else if (!file.isValid()){
      stderr.write(FS.error('touch', path, 'Not a directory'));
    } else {
      file.write('', true, true);
    }
  });

  FS.writeFS();
  next();
}
