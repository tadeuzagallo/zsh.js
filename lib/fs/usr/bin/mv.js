'use strict';

return function (args, stdin, stdout, stderr, next) {
  var targetPath = args.arguments.pop();
  var sourcePaths = args.arguments;
  var target = ZSH.file.open(targetPath);

  if (!targetPath ||
      !sourcePaths.length ||
        (sourcePaths.length > 1 &&
         (!target.exists() || target.isFile())
        )
     ) {
    stderr.write('usage: mv source target\n \t mv source ... directory');
  } else if (!target.parentExists()) {
      stderr.write(ZSH.fs.notFound('mv', target.dirname));
  } else {
    var backup = target.self();
    var success = sourcePaths.reduce(function (success, sourcePath) {
      if (success) {
        var source = ZSH.file.open(sourcePath);

        if (!source.exists()) {
          stderr.write(ZSH.fs.notFound('mv', sourcePaths[0]));
        } else if (source.isDir() && target.isFile()) {
          stderr.write(ZSH.fs.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));
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

    if (success) {
      ZSH.fs.writeFS();
    } else {
      target.dir[target.filename] = backup;
    }
  }

  next();
};
