var ArgsParser = require('./args-parser');

var CommandManager = {
  commands: {},
  aliases: {},
  isValid: function (cmd) {
    return !!(this.commands[cmd] || this.aliases[cmd]);
  },
  autoComplete: function (cmd) {
    var matches = [];

    (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
      if (command.substr(0, cmd.length) === cmd) {
        matches.push(command);
      }
    });

    return matches;
  },
  exec: function (cmd, args, stdin, stdout, stderr) {
    if (this.aliases[cmd]) {
      var line = (this.aliases[cmd] + args).trim().split(' ');
      return this.exec(line.shift(), line.join(' '), stdin, stdout, stderr);
    }
    if (!this.commands[cmd]) {
      stdout('zsh: command not found: ' + cmd);
    } else {
      this.commands[cmd].call(undefined, ArgsParser.parse(args), stdin, stdout, stderr);
    }
  },
  register: function (cmd, fn) {
    this.commands[cmd] = fn;
  },
  alias: function (cmd, original) {
    if (arguments.length === 0) {
      return this.aliases;
    }
    this.aliases[cmd] = original;
  },
  get: function(cmd) {
    return this.commands[cmd];
  }
};

module.exports = CommandManager;
