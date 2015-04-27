import CommandManager from './command-manager';

export default function (args, stdin, stdout, stderr, next) {
  var cmd = args.arguments[0];

  if (cmd) {
    CommandManager.unalias(cmd);
  }

  next();
}
