import File from './file';
import FS from './fs';

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
