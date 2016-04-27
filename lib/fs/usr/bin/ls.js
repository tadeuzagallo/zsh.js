import File from 'zsh.js/file';
import FS from 'zsh.js/fs';

export default function (args, stdin, stdout, stderr, next) {
  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = File.open(arg);

    if (!dir.exists()) {
      stderr.write(FS.notFound('ls', arg));
    } else if (dir.isFile()) {
      stderr.write(FS.error('ls', arg, 'Is a file'));
    } else {
      var files = Object.keys(dir.read());

      if (!args.options.a) {
        files = files.filter(function (file) {
          return file[0] !== '.';
        });
      }

      if (args.arguments.length > 1) {
        stdout.write(arg + ':');
      }

      if (args.options.l) {
        files = files.map(function (name) {
          var file = dir.open(name);
          var type = file.isDir() ? 'd' : '-';
          var perms = type + 'rw-r--r--';

          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;
        });
      }

      stdout.write(files.join(args.options.l ? '\n' : ' '));
    }
  });

  next();
};
