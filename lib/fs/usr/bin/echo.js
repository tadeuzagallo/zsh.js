var ArgsParser = require('zsh.js/lib/args-parser');

return function (args, stdin, stdout, stderr, next) {
  try {
    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));
  } catch (err) {
    stderr.write('zsh: ' + err.message);
  }
  
  next();
};
