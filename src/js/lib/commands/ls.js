var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('ls', ls);

function ls(args, stdin, stdout, stderr, next) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = FS.open(arg);

    outputs.push({
      path: arg,
      success: !!dir,
      files: dir ? Object.keys(dir).join(' ') : FS.notFound('ls', arg)
    });
  });

  function write(out, multiple) {
    if (out.success) {
      if (multiple) {
        stdout.write(out.path);
      }

      stdout.write(out.files);
    } else {
      stderr.write(out.files);
    }
  }

  if (outputs.length === 1) {
    write(outputs[0], false);
  } else {
    outputs.forEach(function (output) {
      write(output, true);
    });
  }

  next();
}
