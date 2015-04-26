/*eslint no-eval: 0*/

import ArgsParser from './args-parser';
import FS from './fs';
import File from './file';
import Stream from './stream';

export default class CommandManager {
  constructor() {
    this.commands = {};
    this.aliases = {};
  }

  load(cmd) {
    var path = File.open('/usr/bin');
    var source = path.open(cmd + '.js');
    var fn;
    if (!source.isFile()) {
      fn = false;
    } else {
      fn = eval('(function () { ' + source.read() + '})')();
    }
    return fn;
  }

  isValid(cmd) {
    return !!(this.commands[cmd] || this.aliases[cmd] || this.load(cmd));
  }

  autocomplete(cmd) {
    var matches = [];
    cmd = cmd.toLowerCase();

    (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
      if (command.substr(0, cmd.length).toLowerCase() === cmd) {
        matches.push(command);
      }
    });

    return matches;
  }

  parse(cmd, stdin, stdout, stderr, next) {
    if (~cmd.indexOf('|')) {
      cmd = cmd.split('|');
      cmd.forEach(CommandManager.parse);
    }

    cmd = cmd.split(' ');
    var command = cmd.shift();
    var args = cmd.join(' ');

    var index;

    if (~(index = args.indexOf('>'))) {
      var prev = args[index-1];
      var append = args[index+1] === '>';
      var init = index;

      if (~(['1','2','&']).indexOf(prev)) {
        init--;
      }

      var _args = args.substr(0, init);
      args = args.substr(index+append+1).split(' ').filter(String);
      var path = args.shift();
      args = _args + args.join(' ');

      if (!path) {
        stdout.write('zsh: parse error near `\\n\'');
        return;
      }

      var file = File.open(path);

      if (!file.parentExists()) {
        stdout.write('zsh: no such file or directory: ' + file.path);
        return;
      } else if (!file.isValid()) {
        stdout.write('zsh: not a directory: ' + file.path);
        return;
      } else if (file.isDir()) {
        stdout.write('zsh: is a directory: ' + file.path);
        return;
      }

      if (!append) {
        file.clear();
      }

      var _stdout = new Stream();
      _stdout.on('data', function(data) {
        file.write(data + '\n', true, true);
      });

      if (prev !== '2') {
        stdout = _stdout;
      }

      if (prev === '2' || prev === '&') {
        stderr = _stdout;
      }

      var _next = next;
      next = function () {
        FS.writeFS();
        _next();
      };
    }

    this.exec(command, args, stdin, stdout, stderr, next);
  }

  exec(cmd, args, stdin, stdout, stderr, next) {
    if (this.aliases[cmd]) {
      var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
      this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
      return;
    }

    var fn;
    if (typeof this.commands[cmd] === 'function') {
      fn = this.commands[cmd];
    } else if ((fn = this.load(cmd))) {
    } else {
      stderr.write('zsh: command not found: ' + cmd);
      next();
      return;
    }

    try {
      args = ArgsParser.parse(args);
      fn.call(undefined, args, stdin, stdout, stderr, next);
    } catch (err) {
      stderr.write(err.stack);
      next();
    }
  }

  register(cmd, fn) {
    this.commands[cmd] = fn;
  }

  alias(cmd, original) {
    if (arguments.length === 0) {
      return this.aliases;
    }
    this.aliases[cmd] = original;
  }

  unalias(cmd) {
    delete this.aliases[cmd];
  }

  get(cmd) {
    return this.commands[cmd];
  }
}
