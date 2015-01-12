'use strict';

return function (args, stdin, stdout, stderr, next) {
  try {
    stdout.write(ZSH.argsParser.parseStrings(args.raw).join(' '));
  } catch (err) {
    stderr.write('zsh: ' + err.message);
  }
  
  next();
};
