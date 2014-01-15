var ArgsParser = require('./args-parser');

window.CommandManager = {
  commands: {},
  isValid: function (cmd) {
    return !!this.commands[cmd];
  },
  autoComplete: function (cmd) {
    var matches = [];

    Object.keys(this.commands).forEach(function (command) {
      if (command.indexOf(cmd) == 0) {
        matches.push(command);
      }
    });

    return matches;
  },
  exec: function (cmd, args, stdout) {
    if (!this.commands[cmd]) {
      stdout('zsh: command not found: ' + cmd);
    } else {
      this.commands[cmd].call(undefined, ArgsParser.parse(args), stdout);
    }
  },
  register: function (cmd, fn) {
    this.commands[cmd] = fn;
  }
};

module.exports = CommandManager;
