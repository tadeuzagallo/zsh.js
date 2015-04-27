/*eslint no-eval: 0*/
import Console from './console';
import File from './file';

export default function (args, stdin, stdout, stderr, next) {
  if (args.arguments.length) {
    var file = File.open(args.arguments[0]);
    if (!file.exists()) {
      stderr.write('source: no such file or directory: ' + file.path);
    } else {
      try {
        var console = new Console(stdout, stderr); // jshint ignore: line
        var result = JSON.stringify(eval(file.read()));
        stdout.write('<- ' + result);
      } catch (err) {
        stderr.write(err.stack);
      }
    }
  } else {
    stderr.write('source: not enough arguments');
  }

  next();
}
