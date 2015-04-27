import File from './file';
import FS from './fs';

export default function (args, stdin, stdout, stderr, next) {
  var targetPath = args.arguments.pop();
  var sourcePaths = args.arguments;
  var target = File.open(targetPath);

  if (!targetPath ||
      !sourcePaths.length ||
        (sourcePaths.length > 1 &&
         (!target.exists() || target.isFile())
        )
     ) {
    stderr.write('usage: mv source target\n \t mv source ... directory');
  } else if (!target.parentExists()) {
      stderr.write(FS.notFound('mv', target.dirname));
  } else {
    var backup = target.self();
    var ok = sourcePaths.reduce(function (success, sourcePath) {
      if (success) {
        var source = File.open(sourcePath);

        if (!source.exists()) {
          stderr.write(FS.notFound('mv', sourcePaths[0]));
        } else if (source.isDir() && target.isFile()) {
          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));
        } else {
          if (!target.isFile()) {
            target.read()[source.filename] = source.self();
          } else {
            target.write(source.read(), false, true);
          }

          source.delete();
          return true;
        }
      }

      return false;
    }, true);

    if (ok) {
      FS.writeFS();
    } else {
      target.dir[target.filename] = backup;
    }
  }

  next();
}
