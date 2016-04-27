require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _CommandManager = require('./command-manager');

var _CommandManager2 = _interopRequireDefault(_CommandManager);

var _LocalStorage = require('./local-storage');

var _LocalStorage2 = _interopRequireDefault(_LocalStorage);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

// TODO: Implement VI bindings

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;

var TAB = 9;
var ENTER = 13;
var BACKSPACE = 8;
var SPACE = 32;

var HISTORY_STORAGE_KEY = 'TERMINAL_HISTORY';
var HISTORY_SIZE = 100;
var HISTORY_SEPARATOR = '%%HISTORY_SEPARATOR%%';

var REPL = (function () {
  function REPL(zsh) {
    var _this = this;

    _classCallCheck(this, REPL);

    this.input = '';
    this.index = 0;
    this.listeners = {};
    this.lastKey = null;
    this.zsh = zsh;

    this.fullHistory = ([_LocalStorage2['default'].getItem(HISTORY_STORAGE_KEY)] + '').split(HISTORY_SEPARATOR).filter(String);
    this.history = this.fullHistory.slice(0) || [];
    this.historyIndex = this.history.length;

    this.createCaret();
    zsh.stdin.on('data', function (event) {
      return _this.parse(event);
    });
  }

  _createClass(REPL, [{
    key: 'createCaret',
    value: function createCaret() {
      this.caret = document.createElement('span');
      this.caret.className = 'caret';
    }
  }, {
    key: 'on',
    value: function on(event, callback) {
      (this.listeners[event] = this.listeners[event] || []).push(callback);
    }
  }, {
    key: 'use',
    value: function use(span) {
      this.span && this.removeCaret();
      this.span = span;
      this.write();
      return this;
    }
  }, {
    key: 'parse',
    value: function parse(event) {
      if (event.metaKey) {
        return;
      }

      event.preventDefault();
      switch (event.keyCode) {
        case LEFT:
        case RIGHT:
          this.moveCaret(event.keyCode);
          break;
        case UP:
        case DOWN:
          this.navigateHistory(event.keyCode);
          break;
        case TAB:
          this.autocomplete();
          break;
        case ENTER:
          this.submit();
          break;
        case BACKSPACE:
          this.backspace();
          break;
        default:
          if (event.ctrlKey) {
            this.action(event);
          } else {
            this.update(event);
          }
      }
    }
  }, {
    key: 'moveCaret',
    value: function moveCaret(direction) {
      if (direction === LEFT) {
        this.index = Math.max(this.index - 1, 0);
      } else {
        this.index = Math.min(this.index + 1, this.input.length + 1);
      }
      this.write();
    }
  }, {
    key: 'autocomplete',
    value: function autocomplete() {
      var options;
      var path = false;

      if (this.command() === this.input) {
        options = this.zsh.CommandManager.autocomplete(this.command());
      } else {
        path = this.input.split(' ').pop();
        options = _FS2['default'].autocomplete(path);
      }

      if (options.length === 1) {
        if (path !== false) {
          path = path.split('/');
          path.pop();
          path.push('');

          this.input = this.input.replace(/ [^ ]*$/, ' ' + path.join('/') + options.shift());
        } else {
          this.input = options.shift() + ' ';
        }

        this.index = this.input.length;
        this.write();
      } else if (options.length) {
        this.zsh.stdout.write(options.join(' '));
        this.zsh.prompt();
      }
    }
  }, {
    key: 'navigateHistory',
    value: function navigateHistory(direction) {
      if (direction === UP) {
        this.historyIndex = Math.max(this.historyIndex - 1, 0);
      } else {
        this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      }

      this.input = this.history[this.historyIndex] || '';
      this.index = this.input.length;
      this.write();
    }
  }, {
    key: 'submit',
    value: function submit(preventWrite) {
      this.index = this.input.length;

      if (!preventWrite) {
        this.write();
      }

      var input = this.input.trim();

      if (input && input !== this.fullHistory[this.fullHistory.length - 1]) {
        this.fullHistory[this.fullHistory.length] = input;
        _LocalStorage2['default'].setItem(HISTORY_STORAGE_KEY, this.fullHistory.slice(-HISTORY_SIZE).join(HISTORY_SEPARATOR));
      }

      this.history = this.fullHistory.slice(0);
      this.historyIndex = this.history.length;

      this.clear();

      if (input) {
        this.zsh.CommandManager.parse(input, this.zsh.stdin, this.zsh.stdout, this.zsh.stderr, this.zsh.prompt.bind(this.zsh));
      } else {
        this.zsh.prompt();
      }
    }
  }, {
    key: 'trigger',
    value: function trigger(evt, msg) {
      var callbacks = this.listeners[evt] || [];

      callbacks.forEach(function (callback) {
        callback(msg);
      });
    }
  }, {
    key: 'removeCaret',
    value: function removeCaret() {
      var caret = this.span.getElementsByClassName('caret');

      if (caret && caret[0]) {
        caret[0].remove();
      }
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.input = '';
      this.index = 0;
    }
  }, {
    key: 'backspace',
    value: function backspace() {
      if (this.index > 0) {
        this.input = this.input.substr(0, this.index - 1) + this.input.substr(this.index);
        this.index--;
        this.write();
      }
    }
  }, {
    key: 'actualCharCode',
    value: function actualCharCode(event) {
      var options;
      var code = event.keyCode;

      code = ({
        173: 189
      })[code] || code;

      if (code >= 65 && code <= 90) {
        if (!event.shiftKey) {
          code += 32;
        }
      } else if (code >= 48 && code <= 57) {
        if (event.shiftKey) {
          code = ')!@#$%^&*('.charCodeAt(code - 48);
        }
      } else if (code >= 186 && code <= 192) {
        options = ';=,-./`:+<_>?~';

        code -= 186;

        if (event.shiftKey) {
          code += options.length / 2;
        }

        code = options.charCodeAt(code);
      } else if (code >= 219 && code <= 222) {
        options = '[\\]\'{|}"';
        code -= 219;

        if (event.shiftKey) {
          code += options.length / 2;
        }

        code = options.charCodeAt(code);
      } else if (code !== SPACE) {
        code = -1;
      }

      return code;
    }
  }, {
    key: 'action',
    value: function action(event) {
      if (String.fromCharCode(event.keyCode) === 'C') {
        this.index = this.input.length;
        this.write();
        this.input = '';
        this.submit(true);
      }
    }
  }, {
    key: 'update',
    value: function update(event) {
      var code = this.actualCharCode(event);

      if (! ~code) {
        return;
      }

      var char = String.fromCharCode(code);

      this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
      this.index++;
      this.write();
    }
  }, {
    key: 'command',
    value: function command() {
      if (this.input !== this.__inputCommand) {
        this.__inputCommand = this.input;
        this.__command = this.input.split(' ').shift();
      }

      return this.__command;
    }
  }, {
    key: 'commandArgsString',
    value: function commandArgsString() {
      if (this.input !== this.__inputCArgs) {
        this.__inputCArgs = this.input;
        this.__cargs = this.input.substr(this.command().length);
      }

      return this.__cargs;
    }
  }, {
    key: 'write',
    value: function write() {
      this.history[this.historyIndex] = this.input;
      this.caret.innerHTML = this.input[this.index] || '';

      var span = document.createElement('span');
      var command = this.command();
      var input = this.commandArgsString();
      var self = this;

      var putCaret = function putCaret(str, index) {
        self.caret.innerText = str[index] || ' ';
        return str.substr(0, index) + self.caret.outerHTML + str.substr(index + 1);
      };

      span.className = this.zsh.CommandManager.isValid(command) ? 'valid' : 'invalid';

      if (this.index < command.length) {
        command = putCaret(command, this.index);
      } else {
        input = putCaret(input, this.index - command.length);
      }

      span.innerHTML = command;
      this.span.innerHTML = span.outerHTML + input;
    }
  }]);

  return REPL;
})();

exports['default'] = REPL;
module.exports = exports['default'];

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/args-parser":[function(require,module,exports){
module.exports=require('3ed2tT');
},{}],"3ed2tT":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var ArgsParser = {};

ArgsParser.parseStrings = function (rawString) {
  var _args = [];
  var word = '';
  var string = false;
  var i, l;

  for (i = 0, l = rawString.length; i < l; i++) {
    var char = rawString[i];
    if (char === '"' || char === '\'') {
      if (string) {
        if (char === string) {
          if (rawString[i - 1] === '\\') {
            word = word.slice(0, -1) + char;
          } else {
            _args.push(word);
            word = '';
            string = null;
          }
        } else {
          word += char;
        }
      } else {
        string = char;
      }
    } else if (char === ' ' && !string) {
      _args.push(word);
      word = '';
    } else {
      word += char;
    }
  }

  if (string) {
    throw new Error('unterminated string');
  } else if (word) {
    _args.push(word);
  }

  return _args;
};

ArgsParser.parse = function (args) {
  args = ([args] + '').trim();

  var out = {
    arguments: [],
    options: {},
    raw: args
  };

  args = ArgsParser.parseStrings(args);

  function addOption(option, value) {
    out.options[option] = typeof value === 'string' ? value : true;
  }

  for (var i = 0, l = args.length; i < l; i++) {
    var arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg.substr(0, 2) === '--') {
      var next = args[i + 1];
      if (next && next[0] !== '-') {
        addOption(arg.substr(2), next);
        i++;
      } else {
        addOption(arg.substr(2));
      }
    } else if (arg[0] === '-') {
      [].forEach.call(arg.substr(1), addOption);
    } else {
      out.arguments.push(arg);
    }
  }

  return out;
};

exports['default'] = ArgsParser;
module.exports = exports['default'];

},{}],"8EyLTk":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});
/*eslint no-eval: 0*/

var _ArgsParser = require('./args-parser');

var _ArgsParser2 = _interopRequireDefault(_ArgsParser);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var _File = require('./file');

var _File2 = _interopRequireDefault(_File);

var _Stream = require('./stream');

var _Stream2 = _interopRequireDefault(_Stream);

var CommandManager = (function () {
  function CommandManager(zsh) {
    _classCallCheck(this, CommandManager);

    this.commands = {};
    this.aliases = {};
    this.zsh = zsh;
  }

  _createClass(CommandManager, [{
    key: 'exists',
    value: function exists(cmd) {
      var path = _File2['default'].open('/usr/bin');
      return path.open(cmd + '.js').isFile();
    }
  }, {
    key: 'import',
    value: function _import(originalFile) {
      var file = originalFile.toLowerCase();
      switch (file) {
        case './zsh':
          return 'self.zsh';
        case './repl':
          return 'self.zsh.repl';
        case './command-manager':
          return 'self';
        default:
          return 'require(\'' + originalFile + '\')';
      }
    }
  }, {
    key: 'load',
    value: function load(cmd) {
      var _this = this;

      var path = _File2['default'].open('/usr/bin');
      var source = path.open(cmd + '.js');
      var fn;
      if (source.isFile()) {
        var self = this;
        source = source.read();
        source = source.replace(/^import +([A-Za-z]+) +from +'([./\-_A-Za-z]+)'/gm, function (match, variable, file) {
          return 'var ' + variable + ' = ' + _this['import'](file);
        });
        source = source.replace('export default', 'var __default__ =');
        fn = eval('(function () { ' + source + '; return __default__;})')();
      }
      return fn;
    }
  }, {
    key: 'isValid',
    value: function isValid(cmd) {
      return !!(this.commands[cmd] || this.aliases[cmd] || this.exists(cmd));
    }
  }, {
    key: 'autocomplete',
    value: function autocomplete(cmd) {
      var matches = [];
      cmd = cmd.toLowerCase();

      Object.keys(this.commands).concat(Object.keys(this.aliases)).forEach(function (command) {
        if (command.substr(0, cmd.length).toLowerCase() === cmd) {
          matches.push(command);
        }
      });

      return matches;
    }
  }, {
    key: 'parse',
    value: function parse(cmd, stdin, stdout, stderr, next) {
      if (~cmd.indexOf('|')) {
        cmd = cmd.split('|');
        cmd.forEach(this.parse.bind(this));
      }

      cmd = cmd.split(' ');
      var command = cmd.shift();
      var args = cmd.join(' ');

      var index;

      if (~(index = args.indexOf('>'))) {
        var prev = args[index - 1];
        var append = args[index + 1] === '>';
        var init = index;

        if (~['1', '2', '&'].indexOf(prev)) {
          init--;
        }

        var _args = args.substr(0, init);
        args = args.substr(index + append + 1).split(' ').filter(String);
        var path = args.shift();
        args = _args + args.join(' ');

        if (!path) {
          stdout.write('zsh: parse error near `\\n\'');
          return;
        }

        var file = _File2['default'].open(path);

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

        var _stdout = new _Stream2['default']();
        _stdout.on('data', function (data) {
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
          _FS2['default'].writeFS();
          _next();
        };
      }

      this.exec(command, args, stdin, stdout, stderr, next);
    }
  }, {
    key: 'exec',
    value: function exec(cmd, args, stdin, stdout, stderr, next) {
      if (this.aliases[cmd]) {
        var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
        this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
        return;
      }

      var fn;
      if (typeof this.commands[cmd] === 'function') {
        fn = this.commands[cmd];
      } else if (fn = this.load(cmd)) {} else {
        stderr.write('zsh: command not found: ' + cmd);
        next();
        return;
      }

      try {
        args = _ArgsParser2['default'].parse(args);
        fn.call(undefined, args, stdin, stdout, stderr, next);
      } catch (err) {
        stderr.write(err.stack);
        next();
      }
    }
  }, {
    key: 'register',
    value: function register(cmd, fn) {
      this.commands[cmd] = fn;
    }
  }, {
    key: 'alias',
    value: function alias(cmd, original) {
      if (arguments.length === 0) {
        return this.aliases;
      }
      this.aliases[cmd] = original;
    }
  }, {
    key: 'unalias',
    value: function unalias(cmd) {
      delete this.aliases[cmd];
    }
  }, {
    key: 'get',
    value: function get(cmd) {
      return this.commands[cmd];
    }
  }]);

  return CommandManager;
})();

exports['default'] = CommandManager;
module.exports = exports['default'];

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":15}],"zsh.js/command-manager":[function(require,module,exports){
module.exports=require('8EyLTk');
},{}],"zsh.js/console":[function(require,module,exports){
module.exports=require('CjB+4o');
},{}],"CjB+4o":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _zsh = require('./zsh');

var _zsh2 = _interopRequireDefault(_zsh);

'use strict';

var map = Array.prototype.map;
var stringify = function stringify(args) {
  return map.call(args, function (a) {
    return JSON.stringify(a) || [a] + '';
  }).join(' ');
};

var Console = (function () {
  function Console(stdout, stderr) {
    _classCallCheck(this, Console);

    this.stdout = stdout;
    this.stderr = stderr;
  }

  _createClass(Console, [{
    key: 'log',
    value: function log() {
      this.stdout.write(stringify(arguments));
    }
  }, {
    key: 'error',
    value: function error() {
      this.stderr.write(stringify(arguments));
    }
  }, {
    key: 'clear',
    value: function clear() {
      _zsh2['default'].clear();
    }
  }]);

  return Console;
})();

exports['default'] = Console;
module.exports = exports['default'];

},{"./zsh":"F2/ljt"}],8:[function(require,module,exports){
module.exports={
  "mtime": "2015-04-26T21:21:59.000Z",
  "ctime": "2015-04-26T21:21:59.000Z",
  "content": {
    "Users": {
      "mtime": "2015-04-26T21:21:59.000Z",
      "ctime": "2015-04-26T21:21:59.000Z",
      "content": {
        "guest": {
          "mtime": "2015-04-26T21:21:59.000Z",
          "ctime": "2015-04-26T21:21:59.000Z",
          "content": {
            ".vimrc": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "",
              "type": "f"
            },
            ".zshrc": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "",
              "type": "f"
            },
            "about.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# tadeuzagallo.com\n\n* About me\n  I'm a Full Stack Developer, JS Passionate, Ruby Fan, C++ Something, Game Development Enthusiast,\n  Always willing to contribute to open source projects and trying to learn some more math.\n\n* About this website\n  I wanted more than just show my work, I wanted to show my work environment.\n  Since I do some mobile development as well  I also use (sadly) some IDEs, but always trying\n  to do as much as I can on this terminal, so I made a very similar copy (at least visually)\n  of it so people could get to see what I do and how I (usually) do.\n\n* Commands\n  If you want to know more about me, there are a few commands:\n    * about  (currently running)\n    * contact \n    * resume\n    * projects\n\n  If you need some help about the terminal, or want to know what functionalities are currrently implemented, type `help` any time.\n\nHope you have as much fun as I had doing it :)\n\nTadeu Zagallo\n      \n",
              "type": "f"
            },
            "contact.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# All my contacts, feel free to reach me at any of these\n\n* <a href=\"mailto:tadeuzagallo@gmail.com\" alt=\"Email\">[Email](mailto:tadeuzagallo@gmail.com)</a>\n* <a href=\"https://github.com/tadeuzagallo\" alt=\"GitHub\" target=\"_blank\">[GitHub](https://github.com/tadeuzagallo)</a>\n* <a href=\"https://twitter.com/tadeuzagallo\" alt=\"Twitter\" target=\"_blank\">[Twitter](https://twitter.com/tadeuzagallo)</a>\n* <a href=\"https://facebook.com/tadeuzagallo\" alt=\"Facebook\" target=\"_blank\">[Facebook](https://facebook.com/tadeuzagallo)</a>\n* <a href=\"https://plus.google.com/+TadeuZagallo\" alt=\"Google +\" target=\"_blank\">[Google +](https://plus.google.com/+TadeuZagallo)</a>\n* <a href=\"http://www.linkedin.com/profile/view?id=160177159\" alt=\"Linkedin\" target=\"_blank\">[Linkedin](http://www.linkedin.com/profile/view?id=160177159)</a>\n* <a href=\"skype://tadeuzagallo\" alt=\"Linkedin\">[Skype](skype://tadeuzagallo)</a>\n",
              "type": "f"
            },
            "projects.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "For now you can have a look at this one! :)\n(That's what I'm doing)\n",
              "type": "f"
            },
            "readme.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "foo bar baz\n",
              "type": "f"
            },
            "resume.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# Tadeu Zagallo da Silva\n---\n\n## Profile\n--- \n  I am passionate for all kinds of development, love to learn new languages and paradigms, always ready for a good challenge.\n  I also like Math, Game development and when possible contribute to open source projects.\n\n## General Information\n---\n  * Email: tadeuzagallo@gmail.com\n  * Phone: +55 32 8863 3684\n  * Skype: tadeuzagallo\n  * Github: github.com/tadeuzagallo\n  * Location: Juiz de Fora/MG, Brazil\n\n## Educational Background\n---\n\n  * Web Development at Instituto Vianna Junior, 2010\n  * General English at The Carlyle Institute, 2011\n\n# Work Experience\n---\n\n  * <i>*iOS Developer*</i> at <i>*Qranio*</i> from <i>*December, 2013*</i> and <i>*currently employed*</i>\n    - Qranio is a startup that grew inside the company I work (eMiolo.com) and I was invited to lead the iOS development team\n      on a completely rewriten version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*Bonuz*</i> from <i>*February, 2013*</i> and <i>*currently employed*</i>\n    - I started developing the iOS app as a freelancer, after the app was published I was invited to maintain the Ruby on Rails\n      api and work on the Android version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*eMiolo.com*</i> from <i>*April, 2013*</i> and <i>*currently employed*</i>\n    - The company just worked with PHP, so I joined with the intention of bringing new technologies. Worked with Python, Ruby, iOS,\n      Android and HTML5 applications\n\n  * <i>*iOS Developer*</i> at <i>*ProDoctor Software Ltda.*</i> from <i>*July, 2012*</i> until <i>*October, 2012*</i>\n    - Briefly worked with the iOS team on the development of their first mobile version of their main product, a medical software\n\n  * <i>*Web Developer*</i> at <i>*Ato Interativo*</i> from <i>*February, 2012*</i> until <i>*July, 2012*</i>\n    - Most of the work was with PHP and MySQL, also working with JavaScript on the client side. Worked with MSSQL\n      and Oracle databases as well\n\n  * <i>*Web Developer*</i> at <i>*Maria Fumaça Criações*</i> from <i>*October, 2010*</i> until <i>*June, 2011*</i>\n    - I worked mostly with PHP and MySQL, also making the front end with HTML and CSS and most animations in JavaScript,\n      although I also worked with a few in AS3. Briefly worked with MongoDB\n\n## Additional Information\n---\n\n* Experience under Linux and OS X environment\n* Student Exchange: 6 months of residence in Ireland\n\n## Languages\n---\n\n* Portuguese – Native Speaker\n* English – Fluent Level\n* Spanish – Intermediate Level\n\n## Programming languages (ordered by knowledge)\n---\n\n* JavaScript\n* Objective­C\n* C/C++\n* Ruby on Rails\n* NodeJS\n* PHP\n* Java\n* Python\n\n## Additional skills\n---\n\n* HTML5/CSS3\n* MVC\n* Design Patterns\n* TDD/BDD\n* Git\n* Analysis and Design of Algorithms\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    },
    "usr": {
      "mtime": "2015-04-26T21:21:59.000Z",
      "ctime": "2015-04-26T21:21:59.000Z",
      "content": {
        "bin": {
          "mtime": "2016-04-27T21:26:58.000Z",
          "ctime": "2016-04-27T21:26:58.000Z",
          "content": {
            "alias.js": {
              "mtime": "2016-04-27T21:24:43.000Z",
              "ctime": "2016-04-27T21:24:43.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index + 1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        CommandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = CommandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n}\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2016-04-27T21:25:32.000Z",
              "ctime": "2016-04-27T21:25:32.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n}\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2016-04-27T21:25:44.000Z",
              "ctime": "2016-04-27T21:25:44.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = File.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(FS.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(FS.error('cd', path, 'Is a file'));\n  } else {\n    FS.currentPath = dir.path;\n    FS.currentDir = dir.self();\n  }\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2016-04-27T21:25:57.000Z",
              "ctime": "2016-04-27T21:25:57.000Z",
              "content": "import ArgsParser from 'zsh.js/args-parser';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2016-04-27T21:26:10.000Z",
              "ctime": "2016-04-27T21:26:10.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\nimport File from 'zsh.js/file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  stdout.write('registered commands:');\n  stdout.write(Object.keys(CommandManager.commands).join(' '));\n\n  stdout.write('\\n');\n  stdout.write('executables (on /usr/bin)');\n  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {\n    return file.replace(/\\.js$/, '');\n  }).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n  stdout.write(Object.keys(CommandManager.aliases).map(function (key) {\n    return key + '=\"' + CommandManager.aliases[key] + '\"';\n  }).join(' '));\n\n  next();\n}\n",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2016-04-27T21:26:16.000Z",
              "ctime": "2016-04-27T21:26:16.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = File.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(FS.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(FS.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2016-04-27T21:26:20.000Z",
              "ctime": "2016-04-27T21:26:20.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(FS.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2016-04-27T21:26:25.000Z",
              "ctime": "2016-04-27T21:26:25.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var ok = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (!target.isFile()) {\n            target.read()[source.filename] = source.self();\n          } else {\n            target.write(source.read(), false, true);\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (ok) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2016-04-27T21:26:29.000Z",
              "ctime": "2016-04-27T21:26:29.000Z",
              "content": "import FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var pwd = FS.currentPath;\n\n  if (stdout) {\n    stdout.write(pwd);\n    next();\n  } else {\n    return pwd;\n  }\n}\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2016-04-27T21:26:33.000Z",
              "ctime": "2016-04-27T21:26:33.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2016-04-27T21:26:38.000Z",
              "ctime": "2016-04-27T21:26:38.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(FS.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(FS.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2016-04-27T21:26:44.000Z",
              "ctime": "2016-04-27T21:26:44.000Z",
              "content": "/*eslint no-eval: 0*/\nimport Console from 'zsh.js/console';\nimport File from 'zsh.js/file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = File.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2016-04-27T21:26:53.000Z",
              "ctime": "2016-04-27T21:26:53.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(FS.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2016-04-27T21:26:58.000Z",
              "ctime": "2016-04-27T21:26:58.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    CommandManager.unalias(cmd);\n  }\n\n  next();\n}\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    }
  },
  "type": "d"
}
},{}],"zsh.js/file":[function(require,module,exports){
module.exports=require('bMs+/F');
},{}],"bMs+/F":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var File = (function () {
  function File(path) {
    _classCallCheck(this, File);

    this.path = _FS2['default'].translatePath(path);
    path = this.path.split('/');
    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = _FS2['default'].open(this.dirname);
  }

  _createClass(File, [{
    key: 'parentExists',
    value: function parentExists() {
      return this.dir !== undefined;
    }
  }, {
    key: 'isValid',
    value: function isValid() {
      return typeof this.dir === 'object' && this.dir.type === 'd';
    }
  }, {
    key: 'exists',
    value: function exists() {
      return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
    }
  }, {
    key: 'isFile',
    value: function isFile() {
      return this.exists() && this.filename && this.dir.content[this.filename].type === 'f';
    }
  }, {
    key: 'isDir',
    value: function isDir() {
      return this.exists() && (!this.filename || this.dir.content[this.filename].type === 'd');
    }
  }, {
    key: 'delete',
    value: function _delete() {
      if (this.exists()) {
        delete this.dir.content[this.filename];
        _FS2['default'].writeFS();
      }
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.write('', false, true);
    }
  }, {
    key: 'write',
    value: function write(content, append, force) {
      var time = File.getTimestamp();

      if (!this.exists()) {
        if (force && this.isValid()) {
          this.createFile(time);
        } else {
          throw new Error('Invalid file: ' + this.path);
        }
      } else if (!this.isFile()) {
        throw new Error('Cannot write to directory: %s', this.path);
      } else {
        var _content = '';
        if (append) {
          _content += this.read();
        }

        this.dir.mtime = time;
        this.dir.content[this.filename].mtime = time;
        this.dir.content[this.filename].content = _content + content;
        _FS2['default'].writeFS();
      }
    }
  }, {
    key: 'read',
    value: function read() {
      return this.filename ? this.dir.content[this.filename].content : this.dir.content;
    }
  }, {
    key: '_create',
    value: function _create(type, content, timestamp) {
      if (this.exists()) {
        throw new Error('File %s already exists', this.path);
      }

      if (!timestamp) {
        timestamp = File.getTimestamp();
      }

      this.dir.content[this.filename] = {
        ctime: timestamp,
        mtime: timestamp,
        content: content,
        type: type
      };

      _FS2['default'].writeFS();
    }
  }, {
    key: 'createFolder',
    value: function createFolder(timestamp) {
      this._create('d', {}, timestamp);
    }
  }, {
    key: 'createFile',
    value: function createFile(timestamp) {
      this._create('f', '', timestamp);
    }
  }, {
    key: 'self',
    value: function self() {
      return this.filename ? this.dir : this.dir.content[this.filename];
    }
  }, {
    key: 'open',
    value: function open(file) {
      return File.open(this.path + '/' + file);
    }
  }, {
    key: 'length',
    value: function length() {
      var content = this.read();

      if (this.isFile()) {
        return content.length;
      } else if (this.isDir()) {
        return Object.keys(content).length;
      } else {
        return 0;
      }
    }
  }, {
    key: 'mtime',
    value: function mtime() {
      var t = new Date(this.self().mtime);

      var dayAndMonth = MONTHS[t.getMonth()] + ' ' + t.getDay();
      if (Date.now() - t.getTime() > 6 * 30 * 24 * 60 * 60 * 1000) {
        return dayAndMonth + ' ' + t.getFullYear();
      } else {
        return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
      }
    }
  }], [{
    key: 'open',
    value: function open(path) {
      return new File(path);
    }
  }, {
    key: 'getTimestamp',
    value: function getTimestamp() {
      return new Date().toISOString();
    }
  }]);

  return File;
})();

exports['default'] = File;
module.exports = exports['default'];

},{"./fs":"dDj8kd"}],"zsh.js/fs":[function(require,module,exports){
module.exports=require('dDj8kd');
},{}],"dDj8kd":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { 'default': obj };
};

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _LocalStorage = require('./local-storage');

var _LocalStorage2 = _interopRequireDefault(_LocalStorage);

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.writeFS = function () {
  _LocalStorage2['default'].setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};

FS.root = JSON.parse(_LocalStorage2['default'].getItem(FILE_SYSTEM_KEY));
var fileSystem = require('./file-system.json');
var copy = function copy(old, nnew) {
  for (var key in nnew) {
    old[key] = nnew[key];
  }
};

if (!FS.root || !FS.root.content) {
  FS.root = fileSystem;
} else {
  var time = new Date().toISOString();

  (function readdir(old, nnew) {
    if (typeof old.content !== 'undefined') {
      for (var key in nnew.content) {
        var n = nnew.content[key];
        var o = old.content[key];

        if (!o.content) {
          o = {
            ctime: time,
            mtime: time,
            content: o.content,
            type: typeof o === 'string' ? 'f' : 'd'
          };
        }

        if (o.type === 'f' && o.mtime === o.ctime) {
          copy(o, n);
        } else if (o.type === 'd') {
          readdir(o, n);
        }
      }
    }
  })(FS.root, fileSystem);

  FS.writeFS();
}

FS.currentPath = FS.home = '/Users/guest';
FS.currentDir = FS.root.content.Users.content.guest;

FS.dirname = function (path) {
  return path.split('/').slice(0, -1).join('/');
};

FS.basename = function (path) {
  return path.split('/').pop();
};

FS.translatePath = function (path) {
  var index;

  path = path.replace('~', FS.home);

  if (path[0] !== '/') {
    path = (FS.currentPath !== '/' ? FS.currentPath + '/' : '/') + path;
  }

  path = path.split('/');

  while (~(index = path.indexOf('..'))) {
    path.splice(index - 1, 2);
  }

  while (~(index = path.indexOf('.'))) {
    path.splice(index, 1);
  }

  if (path[0] === '.') {
    path.shift();
  }

  if (path.length < 2) {
    path = [,,];
  }

  return path.join('/').replace(/([^/]+)\/+$/, '$1');
};

FS.realpath = function (path) {
  path = FS.translatePath(path);

  return FS.exists(path) ? path : null;
};

FS.open = function (path) {
  if (path[0] !== '/') {
    path = FS.translatePath(path);
  }

  path = path.substr(1).split('/').filter(String);

  var cwd = FS.root;
  while (path.length && cwd.content) {
    cwd = cwd.content[path.shift()];
  }

  return cwd;
};

FS.exists = function (path) {
  return !!FS.open(path);
};

FS.error = function () {
  return [].join.call(arguments, ': ');
};

FS.notFound = function (cmd, arg) {
  return FS.error(cmd, arg, 'No such file or directory');
};

FS.autocomplete = function (_path) {
  var path = this.translatePath(_path);
  var options = [];

  if (_path.slice(-1) === '/') {
    path += '/';
  }

  if (path !== undefined) {
    var filename = _path.split('/').pop();
    var openPath = filename.length > 1 ? path.slice(0, -1) : path;
    var dir = FS.open(openPath);
    var fileName = '';
    var parentPath = path;

    if (!dir) {
      path = path.split('/');
      fileName = path.pop().toLowerCase();
      parentPath = path.join('/') || '/';
      dir = FS.open(parentPath);
    }

    if (dir && typeof dir.content === 'object') {
      for (var key in dir.content) {
        if (key.substr(0, fileName.length).toLowerCase() === fileName) {
          if (typeof dir.content[key].content === 'object') {
            key += '/';
          }

          options.push(key);
        }
      }
    }
  }

  return options;
};

exports['default'] = FS;
module.exports = exports['default'];

},{"./file-system.json":8,"./local-storage":14}],13:[function(require,module,exports){
'use strict';

module.exports = function (container, scroll) {
  window.onresize = scroll;

  container.querySelector('.full-screen').onclick = function (e) {
    e.preventDefault();

    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };
};

},{}],14:[function(require,module,exports){
'use strict';

module.exports = typeof localStorage === 'undefined' ? {
  setItem: function setItem() {},
  getItem: function getItem() {
    return null;
  }
} : localStorage;

},{}],15:[function(require,module,exports){
'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var Stream = (function () {
  function Stream() {
    _classCallCheck(this, Stream);

    this._callbacks = {};
  }

  _createClass(Stream, [{
    key: 'on',
    value: function on(event, callback) {
      if (!this._callbacks[event]) {
        this._callbacks[event] = [];
      }

      this._callbacks[event].push(callback);
    }
  }, {
    key: 'write',
    value: function write(data) {
      this.emmit('data', data);
    }
  }, {
    key: 'emmit',
    value: function emmit(event, data) {
      var callbacks = this._callbacks[event];
      callbacks && callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  }]);

  return Stream;
})();

exports['default'] = Stream;
module.exports = exports['default'];

},{}],"F2/ljt":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _bindFullScreen = require('./full-screen');

var _bindFullScreen2 = _interopRequireDefault(_bindFullScreen);

var _CommandManager = require('./command-manager');

var _CommandManager2 = _interopRequireDefault(_CommandManager);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var _REPL = require('./REPL');

var _REPL2 = _interopRequireDefault(_REPL);

var _Stream = require('./stream');

var _Stream2 = _interopRequireDefault(_Stream);

/**
 * Only used by source.js - unused import so it gets into the bundle
 */

var _Console = require('./console');

var _Console2 = _interopRequireDefault(_Console);

var ZSH = (function () {
  function ZSH(container, statusbar, createHTML) {
    _classCallCheck(this, ZSH);

    if (createHTML) {
      this.create(container);
    } else {
      this.container = container;
      this.statusbar = statusbar;
    }

    this.createStreams();

    this.rootContainer = this.container;
    this.CommandManager = new _CommandManager2['default']();
    this.REPL = new _REPL2['default'](this);
    this.FS = _FS2['default'];
    this.initializeInput();
    this.prompt();

    _bindFullScreen2['default'](this.container.parentElement, this.scroll.bind(this));

    this.CommandManager.register('clear', this.clear.bind(this));
  }

  _createClass(ZSH, [{
    key: 'createStreams',
    value: function createStreams() {
      var _this = this;

      this.stdin = new _Stream2['default']();
      this.stderr = new _Stream2['default']();
      this.stdout = new _Stream2['default']();

      this.stderr.on('data', function (d) {
        return _this.output(d, 'stderr');
      });
      this.stdout.on('data', function (d) {
        return _this.output(d, 'stdout');
      });

      window.addEventListener('keydown', function (event) {
        _this.stdin.write(event);
      });
    }
  }, {
    key: 'pwd',
    value: function pwd() {
      return _FS2['default'].currentPath.replace(_FS2['default'].home, '~');
    }
  }, {
    key: '$PS1',
    value: function $PS1() {
      return '\n      <span class="who">guest</span>\n      on\n      <span class="where"> ' + this.pwd() + ' </span>\n      <span class="branch">±master</span>&gt;\n    ';
    }
  }, {
    key: 'prompt',
    value: function prompt() {
      var row = document.createElement('div');
      var span = document.createElement('span');
      var code = document.createElement('span');

      span.className = 'ps1';
      code.className = 'code';

      span.innerHTML = this.$PS1();

      row.appendChild(span);
      row.appendChild(code);

      this.container.appendChild(row);
      this.REPL.use(code);
      this.status(this.pwd());
      this.scroll();
      row.appendChild(this.input);
      this.input.focus();
    }
  }, {
    key: 'status',
    value: function status(text) {
      if (this.statusbar) {
        this.statusbar.innerHTML = text;
      }
    }
  }, {
    key: 'initializeInput',
    value: function initializeInput() {
      var input = document.createElement('input');
      input.className = 'fake-input';
      this.rootContainer.addEventListener('click', function (e) {
        e.preventDefault();
        if (input === document.activeElement) {
          input.blur();
        } else {
          input.focus();
        }
      });

      this.input = input;
    }
  }, {
    key: 'create',
    value: function create(container) {
      if (typeof container === 'string') {
        container = document.getElementById(container);
      }

      container.innerHTML = '\n      <div class="terminal">\n        <div class="bar">\n          <div class="buttons">\n            <a class="close" href="#"></a>\n            <a class="minimize" href="#"></a>\n            <a class="maximize" href="#"></a>\n          </div>\n          <div class="title"></div>\n          <a class="full-screen" href="#"></a>\n        </div>\n        <div class="content"></div>\n        <div class="status-bar"></div>\n      </div>\n    ';

      this.container = container.querySelector('.content');
      this.statusbar = container.querySelector('.status-bar');
    }
  }, {
    key: 'update',
    value: function update() {
      var codes = this.container.getElementsByClassName('code');
      if (!codes.length) {
        this.prompt();
      } else {
        this.REPL.use(codes[codes.length - 1], ZSH);
      }
    }
  }, {
    key: 'output',
    value: function output(text, className) {
      var out = document.createElement('div');
      out.className = 'code ' + [className];
      out.innerHTML = text;

      this.container.appendChild(out);
      this.scroll();
    }
  }, {
    key: 'scroll',
    value: function scroll() {
      var c = this.rootContainer;
      setTimeout(function () {
        return c.scrollTop = c.scrollHeight;
      }, 0);
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.container.innerHTML = '';
      this.prompt();
    }
  }]);

  return ZSH;
})();

window.ZSH = ZSH;
exports['default'] = ZSH;
module.exports = exports['default'];

},{"./REPL":1,"./command-manager":"8EyLTk","./console":"CjB+4o","./fs":"dDj8kd","./full-screen":13,"./stream":15}],"zsh.js":[function(require,module,exports){
module.exports=require('F2/ljt');
},{}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztrQkNoS2UsTUFBTTs7OztBQUVyQixJQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7O0lBRS9FLElBQUk7QUFDWixXQURRLElBQUksQ0FDWCxJQUFJLEVBQUU7MEJBREMsSUFBSTs7QUFFckIsUUFBSSxDQUFDLElBQUksR0FBRyxnQkFBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkMsUUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLFFBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzNCLFFBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7QUFDckMsUUFBSSxDQUFDLEdBQUcsR0FBRyxnQkFBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2xDOztlQVBrQixJQUFJOztXQWlCWCx3QkFBRztBQUNiLGFBQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUM7S0FDL0I7OztXQUVNLG1CQUFHO0FBQ1IsYUFBTyxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztLQUM5RDs7O1dBRUssa0JBQUc7QUFDUCxhQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssV0FBVyxDQUFBLEFBQUMsQ0FBQztLQUNyRzs7O1dBRUssa0JBQUc7QUFDUCxhQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztLQUNoRDs7O1dBRUksaUJBQUc7QUFDTixhQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FDakIsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFBLEFBQUMsQ0FBQztLQUNwRTs7O1dBRUssbUJBQUc7QUFDUCxVQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtBQUNqQixlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN2Qyx3QkFBRyxPQUFPLEVBQUUsQ0FBQztPQUNkO0tBQ0Y7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzdCOzs7V0FFSSxlQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO0FBQzVCLFVBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7QUFFL0IsVUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtBQUNsQixZQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUU7QUFDM0IsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN2QixNQUFNO0FBQ0wsZ0JBQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9DO09BQ0YsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ3pCLGNBQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQzdELE1BQU07QUFDTCxZQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDbEIsWUFBSSxNQUFNLEVBQUU7QUFDVixrQkFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUN6Qjs7QUFFRCxZQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDdEIsWUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDN0MsWUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sR0FBRyxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBQzdELHdCQUFHLE9BQU8sRUFBRSxDQUFDO09BQ2Q7S0FDRjs7O1dBRUcsZ0JBQUc7QUFDTCxhQUFPLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztLQUNuRjs7O1dBRU0saUJBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDaEMsVUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7QUFDakIsY0FBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDdEQ7O0FBRUQsVUFBSSxDQUFDLFNBQVMsRUFBRTtBQUNkLGlCQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO09BQ2pDOztBQUVELFVBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRztBQUNoQyxhQUFLLEVBQUUsU0FBUztBQUNoQixhQUFLLEVBQUUsU0FBUztBQUNoQixlQUFPLEVBQUUsT0FBTztBQUNoQixZQUFJLEVBQUUsSUFBSTtPQUNYLENBQUM7O0FBRUYsc0JBQUcsT0FBTyxFQUFFLENBQUM7S0FDZDs7O1dBRVcsc0JBQUMsU0FBUyxFQUFFO0FBQ3RCLFVBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUNsQzs7O1dBRVMsb0JBQUMsU0FBUyxFQUFFO0FBQ3BCLFVBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUNsQzs7O1dBRUcsZ0JBQUc7QUFDTCxhQUFPLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDbkU7OztXQUVHLGNBQUMsSUFBSSxFQUFFO0FBQ1QsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0tBQzFDOzs7V0FFSyxrQkFBRztBQUNQLFVBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7QUFFMUIsVUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7QUFDakIsZUFBTyxPQUFPLENBQUMsTUFBTSxDQUFDO09BQ3ZCLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7QUFDdkIsZUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztPQUNwQyxNQUFNO0FBQ0wsZUFBTyxDQUFDLENBQUM7T0FDVjtLQUNGOzs7V0FFSSxpQkFBRztBQUNOLFVBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFcEMsVUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDMUQsVUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0FBQzNELGVBQU8sV0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7T0FDNUMsTUFBTTtBQUNMLGVBQU8sV0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztPQUNoRTtLQUNGOzs7V0E3SFUsY0FBQyxJQUFJLEVBQUU7QUFDaEIsYUFBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN2Qjs7O1dBRW1CLHdCQUFHO0FBQ3JCLGFBQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztLQUNqQzs7O1NBZmtCLElBQUk7OztxQkFBSixJQUFJOzs7Ozs7QUNKekIsWUFBWSxDQUFDOztBQUViLElBQUksc0JBQXNCLEdBQUcsZ0NBQVUsR0FBRyxFQUFFO0FBQUUsU0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUM7Q0FBRSxDQUFDOztBQUV6RyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUU7QUFDM0MsT0FBSyxFQUFFLElBQUk7Q0FDWixDQUFDLENBQUM7O0FBRUgsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQVJGLGlCQUFpQixDQUFBLENBQUE7O0FBVTFDLElBQUksY0FBYyxHQUFHLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQVIzRCxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDWixJQUFJLGVBQWUsR0FBRyxhQUFhLENBQUM7O0FBRXBDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsWUFBWTtBQUN2QixnQkFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFhLE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNoRSxDQUFDOztBQUdGLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFBLENBQUEsU0FBQSxDQUFBLENBQWEsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDNUQsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDL0MsSUFBSSxJQUFJLEdBQUcsU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtBQUNsQyxPQUFLLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtBQUNwQixPQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ3RCO0NBQ0YsQ0FBQzs7QUFFRixJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ2hDLElBQUUsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0NBQ3RCLE1BQU07QUFDTCxNQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDOztBQUVwQyxHQUFDLFNBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7QUFDM0IsUUFBSSxPQUFPLEdBQUcsQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFO0FBQ3RDLFdBQUssSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUM1QixZQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFCLFlBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXpCLFlBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFO0FBQ2QsV0FBQyxHQUFHO0FBQ0YsaUJBQUssRUFBRSxJQUFJO0FBQ1gsaUJBQUssRUFBRSxJQUFJO0FBQ1gsbUJBQU8sRUFBRSxDQUFDLENBQUMsT0FBTztBQUNsQixnQkFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLFFBQVEsR0FBRyxHQUFHLEdBQUcsR0FBRztXQUN4QyxDQUFDO1NBQ0g7O0FBRUQsWUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUU7QUFDekMsY0FBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNaLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTtBQUN6QixpQkFBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNmO09BQ0Y7S0FDRjtHQUNGLENBQUEsQ0FBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDOztBQUV4QixJQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7Q0FDZDs7QUFFRCxFQUFFLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDO0FBQzFDLEVBQUUsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7O0FBRXBELEVBQUUsQ0FBQyxPQUFPLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDM0IsU0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDL0MsQ0FBQzs7QUFFRixFQUFFLENBQUMsUUFBUSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQzVCLFNBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUM5QixDQUFDOztBQUVGLEVBQUUsQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsTUFBSSxLQUFLLENBQUM7O0FBRVYsTUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFbEMsTUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ25CLFFBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQSxHQUFJLElBQUksQ0FBQztHQUNyRTs7QUFFRCxNQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFdkIsU0FBTSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBLEVBQUc7QUFDbkMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzNCOztBQUVELFNBQU0sRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQSxFQUFHO0FBQ2xDLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQ3ZCOztBQUVELE1BQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUNuQixRQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7R0FDZDs7QUFFRCxNQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQ25CLFFBQUksR0FBRyxJQUFNLENBQUM7R0FDZjs7QUFFRCxTQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztDQUNwRCxDQUFDOztBQUVGLEVBQUUsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFJLEVBQUU7QUFDM0IsTUFBSSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRTlCLFNBQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0NBQ3RDLENBQUM7O0FBR0YsRUFBRSxDQUFDLElBQUksR0FBRyxVQUFVLElBQUksRUFBRTtBQUN4QixNQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDbkIsUUFBSSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDL0I7O0FBRUQsTUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFFaEQsTUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztBQUNsQixTQUFNLElBQUksQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNoQyxPQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztHQUNqQzs7QUFFRCxTQUFPLEdBQUcsQ0FBQztDQUNaLENBQUM7O0FBRUYsRUFBRSxDQUFDLE1BQU0sR0FBRyxVQUFVLElBQUksRUFBRTtBQUMxQixTQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3hCLENBQUM7O0FBRUYsRUFBRSxDQUFDLEtBQUssR0FBRyxZQUFZO0FBQ3JCLFNBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQ3RDLENBQUM7O0FBRUYsRUFBRSxDQUFDLFFBQVEsR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDaEMsU0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztDQUN4RCxDQUFDOztBQUVGLEVBQUUsQ0FBQyxZQUFZLEdBQUcsVUFBVSxLQUFLLEVBQUU7QUFDakMsTUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxNQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRWpCLE1BQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUMzQixRQUFJLElBQUksR0FBRyxDQUFDO0dBQ2I7O0FBRUQsTUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO0FBQ3RCLFFBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDdEMsUUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDOUQsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QixRQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDbEIsUUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDOztBQUV0QixRQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1IsVUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkIsY0FBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNwQyxnQkFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDO0FBQ25DLFNBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQzNCOztBQUVELFFBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUU7QUFDMUMsV0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO0FBQzNCLFlBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsRUFBRTtBQUM3RCxjQUFJLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFO0FBQ2hELGVBQUcsSUFBSSxHQUFHLENBQUM7V0FDWjs7QUFFRCxpQkFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjtPQUNGO0tBQ0Y7R0FDRjs7QUFFRCxTQUFPLE9BQU8sQ0FBQztDQUNoQixDQUFDOztBQVVGLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FSSCxFQUFFLENBQUE7QUFTakIsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7OztBQzVLcEMsWUFBWSxDQUFDOztBQUViLE1BQU0sQ0FBQyxPQUFPLEdBQUcsVUFBUyxTQUFTLEVBQUUsTUFBTSxFQUFFO0FBQzNDLFFBQU0sQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDOztBQUV6QixXQUFTLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsRUFBRTtBQUM3RCxLQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7O0FBRW5CLFFBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQzNCLENBQUMsUUFBUSxDQUFDLG9CQUFvQixJQUM1QixDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsSUFDL0IsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUc7QUFDdEMsVUFBSSxTQUFTLENBQUMsaUJBQWlCLEVBQUU7QUFDL0IsaUJBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO09BQy9CLE1BQU0sSUFBSSxTQUFTLENBQUMsbUJBQW1CLEVBQUU7QUFDeEMsaUJBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO09BQ2pDLE1BQU0sSUFBSSxTQUFTLENBQUMsb0JBQW9CLEVBQUU7QUFDekMsaUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO09BQ2xDLE1BQU0sSUFBSSxTQUFTLENBQUMsdUJBQXVCLEVBQUU7QUFDNUMsaUJBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztPQUNqRTtLQUNGLE1BQU07QUFDTCxVQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUU7QUFDM0IsZ0JBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztPQUMzQixNQUFNLElBQUksUUFBUSxDQUFDLGdCQUFnQixFQUFFO0FBQ3BDLGdCQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztPQUM3QixNQUFNLElBQUksUUFBUSxDQUFDLG1CQUFtQixFQUFFO0FBQ3ZDLGdCQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztPQUNoQyxNQUFNLElBQUksUUFBUSxDQUFDLG9CQUFvQixFQUFFO0FBQ3hDLGdCQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztPQUNqQztLQUNGO0dBQ0YsQ0FBQztDQUNILENBQUM7OztBQ2pDRixZQUFZLENBQUM7O0FBRWIsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLFlBQVksS0FBSyxXQUFXLEdBQ2xEO0FBQ0UsU0FBTyxFQUFFLG1CQUFXLEVBQUU7QUFDdEIsU0FBTyxFQUFFLG1CQUFXO0FBQUUsV0FBTyxJQUFJLENBQUM7R0FBRTtDQUNyQyxHQUVELFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7OztJQ1JNLE1BQU07QUFDZCxXQURRLE1BQU0sR0FDWDswQkFESyxNQUFNOztBQUV2QixRQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztHQUN0Qjs7ZUFIa0IsTUFBTTs7V0FLdkIsWUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ2xCLFVBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzNCLFlBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO09BQzdCOztBQUVELFVBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3ZDOzs7V0FFSSxlQUFDLElBQUksRUFBRTtBQUNWLFVBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzFCOzs7V0FFSSxlQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7QUFDakIsVUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxlQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUNqRCxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2hCLENBQUMsQ0FBQztLQUNKOzs7U0F0QmtCLE1BQU07OztxQkFBTixNQUFNOzs7Ozs7Ozs7Ozs7Ozs7OzhCQ0FBLGVBQWU7Ozs7OEJBQ2YsbUJBQW1COzs7O2tCQUMvQixNQUFNOzs7O29CQUNKLFFBQVE7Ozs7c0JBQ04sVUFBVTs7Ozs7Ozs7dUJBS1QsV0FBVzs7OztJQUV6QixHQUFHO0FBQ0ksV0FEUCxHQUFHLENBQ0ssU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7MEJBRDFDLEdBQUc7O0FBRUwsUUFBSSxVQUFVLEVBQUU7QUFDZCxVQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3hCLE1BQU07QUFDTCxVQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUMzQixVQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztLQUM1Qjs7QUFFRCxRQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7O0FBRXJCLFFBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUNwQyxRQUFJLENBQUMsY0FBYyxHQUFHLGlDQUFvQixDQUFDO0FBQzNDLFFBQUksQ0FBQyxJQUFJLEdBQUcsc0JBQVMsSUFBSSxDQUFDLENBQUM7QUFDM0IsUUFBSSxDQUFDLEVBQUUsa0JBQUssQ0FBQztBQUNiLFFBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN2QixRQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRWQsZ0NBQWUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7QUFFckUsUUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7R0FDOUQ7O2VBckJHLEdBQUc7O1dBdUJNLHlCQUFHOzs7QUFDZCxVQUFJLENBQUMsS0FBSyxHQUFHLHlCQUFZLENBQUM7QUFDMUIsVUFBSSxDQUFDLE1BQU0sR0FBRyx5QkFBWSxDQUFDO0FBQzNCLFVBQUksQ0FBQyxNQUFNLEdBQUcseUJBQVksQ0FBQzs7QUFFM0IsVUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsQ0FBQztlQUFLLE1BQUssTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7T0FBQSxDQUFDLENBQUM7QUFDeEQsVUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsQ0FBQztlQUFLLE1BQUssTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7T0FBQSxDQUFDLENBQUM7O0FBRXhELFlBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsVUFBQyxLQUFLLEVBQUs7QUFDNUMsY0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO09BQ3pCLENBQUMsQ0FBQztLQUNKOzs7V0FFRSxlQUFHO0FBQ0osYUFBTyxnQkFBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFHLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztLQUM3Qzs7O1dBRUcsZ0JBQUc7QUFDTCwrRkFHeUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxtRUFFakM7S0FDSDs7O1dBRUssa0JBQUc7QUFDUCxVQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hDLFVBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUMsVUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFFMUMsVUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDdkIsVUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7O0FBRXhCLFVBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDOztBQUU3QixTQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RCLFNBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXRCLFVBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLFVBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLFVBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDeEIsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2QsU0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUIsVUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNwQjs7O1dBRUssZ0JBQUMsSUFBSSxFQUFFO0FBQ1gsVUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ2xCLFlBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztPQUNqQztLQUNGOzs7V0FFYywyQkFBRztBQUNoQixVQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLFdBQUssQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO0FBQy9CLFVBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFVBQUMsQ0FBQyxFQUFLO0FBQ2xELFNBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNuQixZQUFJLEtBQUssS0FBSyxRQUFRLENBQUMsYUFBYSxFQUFFO0FBQ3BDLGVBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNkLE1BQU07QUFDTCxlQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDZjtPQUNGLENBQUMsQ0FBQzs7QUFFSCxVQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUNwQjs7O1dBRUssZ0JBQUMsU0FBUyxFQUFFO0FBQ2hCLFVBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQ2pDLGlCQUFTLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztPQUNoRDs7QUFFRCxlQUFTLENBQUMsU0FBUyxpY0FjbEIsQ0FBQzs7QUFFRixVQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckQsVUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQ3pEOzs7V0FFSyxrQkFBRztBQUNQLFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUQsVUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDakIsWUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO09BQ2YsTUFBTTtBQUNMLFlBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO09BQzdDO0tBQ0Y7OztXQUVLLGdCQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7QUFDdEIsVUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QyxTQUFHLENBQUMsU0FBUyxHQUFHLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RDLFNBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDOztBQUVyQixVQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQyxVQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDZjs7O1dBRUssa0JBQUc7QUFDUCxVQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO0FBQzNCLGdCQUFVLENBQUM7ZUFBTSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZO09BQUEsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNuRDs7O1dBRUksaUJBQUc7QUFDTixVQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDOUIsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ2Y7OztTQTlJRyxHQUFHOzs7QUFrSlQsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7cUJBQ0YsR0FBRyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xuaW1wb3J0IExvY2FsU3RvcmFnZSBmcm9tICcuL2xvY2FsLXN0b3JhZ2UnO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuXG4vLyBUT0RPOiBJbXBsZW1lbnQgVkkgYmluZGluZ3NcblxuY29uc3QgTEVGVCA9IDM3O1xuY29uc3QgVVAgPSAzODtcbmNvbnN0IFJJR0hUID0gMzk7XG5jb25zdCBET1dOID0gNDA7XG5cbmNvbnN0IFRBQiA9IDk7XG5jb25zdCBFTlRFUiA9IDEzO1xuY29uc3QgQkFDS1NQQUNFID0gODtcbmNvbnN0IFNQQUNFID0gMzI7XG5cbmNvbnN0IEhJU1RPUllfU1RPUkFHRV9LRVkgPSAnVEVSTUlOQUxfSElTVE9SWSc7XG5jb25zdCBISVNUT1JZX1NJWkUgPSAxMDA7XG5jb25zdCBISVNUT1JZX1NFUEFSQVRPUiA9ICclJUhJU1RPUllfU0VQQVJBVE9SJSUnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSRVBMIHtcbiAgY29uc3RydWN0b3IoenNoKSB7XG4gICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5sYXN0S2V5ID0gbnVsbDtcbiAgICB0aGlzLnpzaCA9IHpzaDtcblxuICAgIHRoaXMuZnVsbEhpc3RvcnkgPSAoW0xvY2FsU3RvcmFnZS5nZXRJdGVtKEhJU1RPUllfU1RPUkFHRV9LRVkpXSArICcnKS5zcGxpdChISVNUT1JZX1NFUEFSQVRPUikuZmlsdGVyKFN0cmluZyk7XG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgwKSB8fCBbXTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0aGlzLmNyZWF0ZUNhcmV0KCk7XG4gICAgenNoLnN0ZGluLm9uKCdkYXRhJywgKGV2ZW50KSA9PiB0aGlzLnBhcnNlKGV2ZW50KSk7XG4gIH1cblxuICBjcmVhdGVDYXJldCgpIHtcbiAgICB0aGlzLmNhcmV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHRoaXMuY2FyZXQuY2xhc3NOYW1lID0gJ2NhcmV0JztcbiAgfVxuXG4gIG9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICgodGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKSkucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICB1c2Uoc3Bhbikge1xuICAgIHRoaXMuc3BhbiAmJiB0aGlzLnJlbW92ZUNhcmV0KCk7XG4gICAgdGhpcy5zcGFuID0gc3BhbjtcbiAgICB0aGlzLndyaXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwYXJzZShldmVudCkge1xuICAgIGlmIChldmVudC5tZXRhS2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICAgIGNhc2UgTEVGVDpcbiAgICAgIGNhc2UgUklHSFQ6XG4gICAgICAgIHRoaXMubW92ZUNhcmV0KGV2ZW50LmtleUNvZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVVA6XG4gICAgICBjYXNlIERPV046XG4gICAgICAgIHRoaXMubmF2aWdhdGVIaXN0b3J5KGV2ZW50LmtleUNvZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVEFCOlxuICAgICAgICB0aGlzLmF1dG9jb21wbGV0ZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRU5URVI6XG4gICAgICAgIHRoaXMuc3VibWl0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCQUNLU1BBQ0U6XG4gICAgICAgIHRoaXMuYmFja3NwYWNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgICB0aGlzLmFjdGlvbihldmVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy51cGRhdGUoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfVxuICB9XG5cbiAgbW92ZUNhcmV0KGRpcmVjdGlvbikge1xuICAgIGlmIChkaXJlY3Rpb24gPT09IExFRlQpIHtcbiAgICAgIHRoaXMuaW5kZXggPSBNYXRoLm1heCh0aGlzLmluZGV4IC0gMSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5kZXggPSBNYXRoLm1pbih0aGlzLmluZGV4ICsgMSwgdGhpcy5pbnB1dC5sZW5ndGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgYXV0b2NvbXBsZXRlKCkge1xuICAgIHZhciBvcHRpb25zO1xuICAgIHZhciBwYXRoID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5jb21tYW5kKCkgPT09IHRoaXMuaW5wdXQpIHtcbiAgICAgIG9wdGlvbnMgPSB0aGlzLnpzaC5Db21tYW5kTWFuYWdlci5hdXRvY29tcGxldGUodGhpcy5jb21tYW5kKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoID0gdGhpcy5pbnB1dC5zcGxpdCgnICcpLnBvcCgpO1xuICAgICAgb3B0aW9ucyA9IEZTLmF1dG9jb21wbGV0ZShwYXRoKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChwYXRoICE9PSBmYWxzZSkge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgICBwYXRoLnB1c2goJycpO1xuXG4gICAgICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnJlcGxhY2UoLyBbXiBdKiQvLCAnICcgKyBwYXRoLmpvaW4oJy8nKSArIG9wdGlvbnMuc2hpZnQoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlucHV0ID0gb3B0aW9ucy5zaGlmdCgpICsgJyAnO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmxlbmd0aCl7XG4gICAgICB0aGlzLnpzaC5zdGRvdXQud3JpdGUob3B0aW9ucy5qb2luKCcgJykpO1xuICAgICAgdGhpcy56c2gucHJvbXB0KCk7XG4gICAgfVxuICB9XG5cbiAgbmF2aWdhdGVIaXN0b3J5KGRpcmVjdGlvbikge1xuICAgIGlmIChkaXJlY3Rpb24gPT09IFVQKSB7XG4gICAgICB0aGlzLmhpc3RvcnlJbmRleCA9IE1hdGgubWF4KHRoaXMuaGlzdG9yeUluZGV4IC0gMSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gTWF0aC5taW4odGhpcy5oaXN0b3J5SW5kZXggKyAxLCB0aGlzLmhpc3RvcnkubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dCA9IHRoaXMuaGlzdG9yeVt0aGlzLmhpc3RvcnlJbmRleF0gfHwgJyc7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIHN1Ym1pdChwcmV2ZW50V3JpdGUpIHtcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG5cbiAgICBpZiAoIXByZXZlbnRXcml0ZSkge1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH1cblxuICAgIHZhciBpbnB1dCA9IHRoaXMuaW5wdXQudHJpbSgpO1xuXG4gICAgaWYgKGlucHV0ICYmIGlucHV0ICE9PSB0aGlzLmZ1bGxIaXN0b3J5W3RoaXMuZnVsbEhpc3RvcnkubGVuZ3RoIC0gMV0pIHtcbiAgICAgIHRoaXMuZnVsbEhpc3RvcnlbdGhpcy5mdWxsSGlzdG9yeS5sZW5ndGhdID0gaW5wdXQ7XG4gICAgICBMb2NhbFN0b3JhZ2Uuc2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZLCB0aGlzLmZ1bGxIaXN0b3J5LnNsaWNlKC1ISVNUT1JZX1NJWkUpLmpvaW4oSElTVE9SWV9TRVBBUkFUT1IpKTtcbiAgICB9XG5cbiAgICB0aGlzLmhpc3RvcnkgPSB0aGlzLmZ1bGxIaXN0b3J5LnNsaWNlKDApO1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gdGhpcy5oaXN0b3J5Lmxlbmd0aDtcblxuICAgIHRoaXMuY2xlYXIoKTtcblxuICAgIGlmIChpbnB1dCkge1xuICAgICAgdGhpcy56c2guQ29tbWFuZE1hbmFnZXIucGFyc2UoXG4gICAgICAgIGlucHV0LFxuICAgICAgICB0aGlzLnpzaC5zdGRpbixcbiAgICAgICAgdGhpcy56c2guc3Rkb3V0LFxuICAgICAgICB0aGlzLnpzaC5zdGRlcnIsXG4gICAgICAgIHRoaXMuenNoLnByb21wdC5iaW5kKHRoaXMuenNoKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy56c2gucHJvbXB0KCk7XG4gICAgfVxuICB9XG5cbiAgdHJpZ2dlcihldnQsIG1zZykge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmxpc3RlbmVyc1tldnRdIHx8IFtdO1xuXG4gICAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhtc2cpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVtb3ZlQ2FyZXQoKSB7XG4gICAgdmFyIGNhcmV0ID0gdGhpcy5zcGFuLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhcmV0Jyk7XG5cbiAgICBpZiAoY2FyZXQgJiYgY2FyZXRbMF0pIHtcbiAgICAgIGNhcmV0WzBdLnJlbW92ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgfVxuXG4gIGJhY2tzcGFjZSgpIHtcbiAgICBpZiAodGhpcy5pbmRleCA+IDApIHtcbiAgICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnN1YnN0cigwLCB0aGlzLmluZGV4IC0gMSkgKyB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmluZGV4KTtcbiAgICAgIHRoaXMuaW5kZXgtLTtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9XG4gIH1cblxuICBhY3R1YWxDaGFyQ29kZShldmVudCkge1xuICAgIHZhciBvcHRpb25zO1xuICAgIHZhciBjb2RlID0gZXZlbnQua2V5Q29kZTtcblxuICAgIGNvZGUgPSB7XG4gICAgICAxNzM6IDE4OVxuICAgIH1bY29kZV0gfHwgY29kZTtcblxuICAgIGlmIChjb2RlID49IDY1ICYmIGNvZGUgPD0gOTApIHtcbiAgICAgIGlmICghZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSAzMjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gNDggJiYgY29kZSA8PSA1Nykge1xuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgPSAnKSFAIyQlXiYqKCcuY2hhckNvZGVBdChjb2RlIC0gNDgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29kZSA+PSAxODYgJiYgY29kZSA8PSAxOTIpe1xuICAgICAgb3B0aW9ucyA9ICc7PSwtLi9gOis8Xz4/fic7XG5cbiAgICAgIGNvZGUgLT0gMTg2O1xuXG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgICB9XG5cbiAgICAgIGNvZGUgPSBvcHRpb25zLmNoYXJDb2RlQXQoY29kZSk7XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDIxOSAmJiBjb2RlIDw9IDIyMikge1xuICAgICAgb3B0aW9ucyA9ICdbXFxcXF1cXCd7fH1cIic7XG4gICAgICBjb2RlIC09IDIxOTtcblxuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gb3B0aW9ucy5sZW5ndGggLyAyO1xuICAgICAgfVxuXG4gICAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICAgIH0gZWxzZSBpZiAoY29kZSAhPT0gU1BBQ0UpIHtcbiAgICAgIGNvZGUgPSAtMTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIGFjdGlvbihldmVudCkge1xuICAgIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpID09PSAnQycpIHtcbiAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICAgIHRoaXMuc3VibWl0KHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZShldmVudCkge1xuICAgIHZhciBjb2RlID0gdGhpcy5hY3R1YWxDaGFyQ29kZShldmVudCk7XG5cbiAgICBpZiAoIX5jb2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNoYXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuXG4gICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXgpICsgY2hhciArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICAgIHRoaXMuaW5kZXgrKztcbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBjb21tYW5kKCkge1xuICAgIGlmICh0aGlzLmlucHV0ICE9PSB0aGlzLl9faW5wdXRDb21tYW5kKSB7XG4gICAgICB0aGlzLl9faW5wdXRDb21tYW5kID0gdGhpcy5pbnB1dDtcbiAgICAgIHRoaXMuX19jb21tYW5kID0gdGhpcy5pbnB1dC5zcGxpdCgnICcpLnNoaWZ0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX19jb21tYW5kO1xuICB9XG5cbiAgY29tbWFuZEFyZ3NTdHJpbmcoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENBcmdzKSB7XG4gICAgICB0aGlzLl9faW5wdXRDQXJncyA9IHRoaXMuaW5wdXQ7XG4gICAgICB0aGlzLl9fY2FyZ3MgPSB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmNvbW1hbmQoKS5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9fY2FyZ3M7XG4gIH1cblxuICB3cml0ZSgpIHtcbiAgICB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdID0gdGhpcy5pbnB1dDtcbiAgICB0aGlzLmNhcmV0LmlubmVySFRNTCA9IHRoaXMuaW5wdXRbdGhpcy5pbmRleF0gfHwgJyc7XG5cbiAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB2YXIgY29tbWFuZCA9IHRoaXMuY29tbWFuZCgpO1xuICAgIHZhciBpbnB1dCA9IHRoaXMuY29tbWFuZEFyZ3NTdHJpbmcoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcHV0Q2FyZXQgPSBmdW5jdGlvbiAoc3RyLCBpbmRleCkge1xuICAgICAgc2VsZi5jYXJldC5pbm5lclRleHQgPSBzdHJbaW5kZXhdIHx8ICcgJztcbiAgICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGluZGV4KSArIHNlbGYuY2FyZXQub3V0ZXJIVE1MICsgc3RyLnN1YnN0cihpbmRleCArIDEpO1xuICAgIH07XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9IHRoaXMuenNoLkNvbW1hbmRNYW5hZ2VyLmlzVmFsaWQoY29tbWFuZCkgPyAndmFsaWQnIDogJ2ludmFsaWQnO1xuXG4gICAgaWYgKHRoaXMuaW5kZXggPCBjb21tYW5kLmxlbmd0aCkge1xuICAgICAgY29tbWFuZCA9IHB1dENhcmV0KGNvbW1hbmQsIHRoaXMuaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbnB1dCA9IHB1dENhcmV0KGlucHV0LCB0aGlzLmluZGV4IC0gY29tbWFuZC5sZW5ndGgpO1xuICAgIH1cblxuICAgIHNwYW4uaW5uZXJIVE1MID0gY29tbWFuZDtcbiAgICB0aGlzLnNwYW4uaW5uZXJIVE1MID0gc3Bhbi5vdXRlckhUTUwgKyBpbnB1dDtcbiAgfVxufVxuIiwidmFyIEFyZ3NQYXJzZXIgPSB7fTtcblxuQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MgPSBmdW5jdGlvbihyYXdTdHJpbmcpIHtcbiAgdmFyIF9hcmdzID0gW107XG4gIHZhciB3b3JkID0gJyc7XG4gIHZhciBzdHJpbmcgPSBmYWxzZTtcbiAgdmFyIGksIGw7XG5cbiAgZm9yIChpID0gMCwgbCA9IHJhd1N0cmluZy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgY2hhciA9IHJhd1N0cmluZ1tpXTtcbiAgICBpZiAoY2hhciA9PT0gJ1wiJyB8fCBjaGFyID09PSAnXFwnJykge1xuICAgICAgaWYgKHN0cmluZykge1xuICAgICAgICBpZiAoY2hhciA9PT0gc3RyaW5nKSB7XG4gICAgICAgICAgaWYgKHJhd1N0cmluZ1tpIC0gMV0gPT09ICdcXFxcJykge1xuICAgICAgICAgICAgd29yZCA9IHdvcmQuc2xpY2UoMCwgLTEpICsgY2hhcjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgICAgICAgICAgIHdvcmQgPSAnJztcbiAgICAgICAgICAgIHN0cmluZyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyaW5nID0gY2hhcjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICcgJyAmJiAhc3RyaW5nKSB7XG4gICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgd29yZCA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JkICs9IGNoYXI7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0cmluZykge1xuICAgIHRocm93IG5ldyBFcnJvcigndW50ZXJtaW5hdGVkIHN0cmluZycpO1xuICB9IGVsc2UgaWYgKHdvcmQpIHtcbiAgICBfYXJncy5wdXNoKHdvcmQpO1xuICB9XG5cbiAgcmV0dXJuIF9hcmdzO1xufTtcblxuQXJnc1BhcnNlci5wYXJzZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIGFyZ3MgPSAoW2FyZ3NdICsgJycpLnRyaW0oKTtcblxuICB2YXIgb3V0ID0ge1xuICAgIGFyZ3VtZW50czogW10sXG4gICAgb3B0aW9uczoge30sXG4gICAgcmF3OiBhcmdzXG4gIH07XG5cbiAgYXJncyA9IEFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzKGFyZ3MpO1xuXG4gIGZ1bmN0aW9uIGFkZE9wdGlvbihvcHRpb24sIHZhbHVlKSB7XG4gICAgb3V0Lm9wdGlvbnNbb3B0aW9uXSA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IHRydWU7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGFyZyA9IGFyZ3NbaV07XG5cbiAgICBpZiAoIWFyZykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdWJzdHIoMCwgMikgPT09ICctLScpIHtcbiAgICAgIHZhciBuZXh0ID0gYXJnc1tpICsgMV07XG4gICAgICBpZiAobmV4dCAmJiBuZXh0WzBdICE9PSAnLScpIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMiksIG5leHQpO1xuICAgICAgICBpKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRPcHRpb24oYXJnLnN1YnN0cigyKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmdbMF0gPT09ICctJykge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGFyZy5zdWJzdHIoMSksIGFkZE9wdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hcmd1bWVudHMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBBcmdzUGFyc2VyO1xuIiwiLyplc2xpbnQgbm8tZXZhbDogMCovXG5pbXBvcnQgQXJnc1BhcnNlciBmcm9tICcuL2FyZ3MtcGFyc2VyJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcbmltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XG5pbXBvcnQgU3RyZWFtIGZyb20gJy4vc3RyZWFtJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tbWFuZE1hbmFnZXIge1xuICBjb25zdHJ1Y3Rvcih6c2gpIHtcbiAgICB0aGlzLmNvbW1hbmRzID0ge307XG4gICAgdGhpcy5hbGlhc2VzID0ge307XG4gICAgdGhpcy56c2ggPSB6c2g7XG4gIH1cblxuICBleGlzdHMoY21kKSB7XG4gICAgdmFyIHBhdGggPSBGaWxlLm9wZW4oJy91c3IvYmluJyk7XG4gICAgcmV0dXJuIHBhdGgub3BlbihjbWQgKyAnLmpzJykuaXNGaWxlKCk7XG4gIH1cblxuICBpbXBvcnQob3JpZ2luYWxGaWxlKSB7XG4gICAgdmFyIGZpbGUgPSBvcmlnaW5hbEZpbGUudG9Mb3dlckNhc2UoKTtcbiAgICBzd2l0Y2ggKGZpbGUpIHtcbiAgICAgIGNhc2UgJy4venNoJzpcbiAgICAgICAgcmV0dXJuICdzZWxmLnpzaCc7XG4gICAgICBjYXNlICcuL3JlcGwnOlxuICAgICAgICByZXR1cm4gJ3NlbGYuenNoLnJlcGwnO1xuICAgICAgY2FzZSAnLi9jb21tYW5kLW1hbmFnZXInOlxuICAgICAgICByZXR1cm4gJ3NlbGYnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGByZXF1aXJlKCcke29yaWdpbmFsRmlsZX0nKWA7XG4gICAgfVxuICB9XG5cbiAgbG9hZChjbWQpIHtcbiAgICB2YXIgcGF0aCA9IEZpbGUub3BlbignL3Vzci9iaW4nKTtcbiAgICB2YXIgc291cmNlID0gcGF0aC5vcGVuKGNtZCArICcuanMnKTtcbiAgICB2YXIgZm47XG4gICAgaWYgKHNvdXJjZS5pc0ZpbGUoKSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc291cmNlID0gc291cmNlLnJlYWQoKTtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC9eaW1wb3J0ICsoW0EtWmEtel0rKSArZnJvbSArJyhbLi9cXC1fQS1aYS16XSspJy9nbSwgKG1hdGNoLCB2YXJpYWJsZSwgZmlsZSkgPT4ge1xuICAgICAgICByZXR1cm4gYHZhciAke3ZhcmlhYmxlfSA9ICR7dGhpcy5pbXBvcnQoZmlsZSl9YDtcbiAgICAgIH0pO1xuICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoJ2V4cG9ydCBkZWZhdWx0JywgJ3ZhciBfX2RlZmF1bHRfXyA9Jyk7XG4gICAgICBmbiA9IGV2YWwoJyhmdW5jdGlvbiAoKSB7ICcgKyBzb3VyY2UgKyAnOyByZXR1cm4gX19kZWZhdWx0X187fSknKSgpO1xuICAgIH1cbiAgICByZXR1cm4gZm47XG4gIH1cblxuICBpc1ZhbGlkKGNtZCkge1xuICAgIHJldHVybiAhISh0aGlzLmNvbW1hbmRzW2NtZF0gfHwgdGhpcy5hbGlhc2VzW2NtZF0gfHwgdGhpcy5leGlzdHMoY21kKSk7XG4gIH1cblxuICBhdXRvY29tcGxldGUoY21kKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICBjbWQgPSBjbWQudG9Mb3dlckNhc2UoKTtcblxuICAgIChPYmplY3Qua2V5cyh0aGlzLmNvbW1hbmRzKS5jb25jYXQoT2JqZWN0LmtleXModGhpcy5hbGlhc2VzKSkpLmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICAgIGlmIChjb21tYW5kLnN1YnN0cigwLCBjbWQubGVuZ3RoKS50b0xvd2VyQ2FzZSgpID09PSBjbWQpIHtcbiAgICAgICAgbWF0Y2hlcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoZXM7XG4gIH1cblxuICBwYXJzZShjbWQsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xuICAgIGlmICh+Y21kLmluZGV4T2YoJ3wnKSkge1xuICAgICAgY21kID0gY21kLnNwbGl0KCd8Jyk7XG4gICAgICBjbWQuZm9yRWFjaCh0aGlzLnBhcnNlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIGNtZCA9IGNtZC5zcGxpdCgnICcpO1xuICAgIHZhciBjb21tYW5kID0gY21kLnNoaWZ0KCk7XG4gICAgdmFyIGFyZ3MgPSBjbWQuam9pbignICcpO1xuXG4gICAgdmFyIGluZGV4O1xuXG4gICAgaWYgKH4oaW5kZXggPSBhcmdzLmluZGV4T2YoJz4nKSkpIHtcbiAgICAgIHZhciBwcmV2ID0gYXJnc1tpbmRleCAtIDFdO1xuICAgICAgdmFyIGFwcGVuZCA9IGFyZ3NbaW5kZXggKyAxXSA9PT0gJz4nO1xuICAgICAgdmFyIGluaXQgPSBpbmRleDtcblxuICAgICAgaWYgKH4oWycxJywgJzInLCAnJiddKS5pbmRleE9mKHByZXYpKSB7XG4gICAgICAgIGluaXQtLTtcbiAgICAgIH1cblxuICAgICAgdmFyIF9hcmdzID0gYXJncy5zdWJzdHIoMCwgaW5pdCk7XG4gICAgICBhcmdzID0gYXJncy5zdWJzdHIoaW5kZXggKyBhcHBlbmQgKyAxKS5zcGxpdCgnICcpLmZpbHRlcihTdHJpbmcpO1xuICAgICAgdmFyIHBhdGggPSBhcmdzLnNoaWZ0KCk7XG4gICAgICBhcmdzID0gX2FyZ3MgKyBhcmdzLmpvaW4oJyAnKTtcblxuICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBwYXJzZSBlcnJvciBuZWFyIGBcXFxcblxcJycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xuXG4gICAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogbm90IGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IGlzIGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFwcGVuZCkge1xuICAgICAgICBmaWxlLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBfc3Rkb3V0ID0gbmV3IFN0cmVhbSgpO1xuICAgICAgX3N0ZG91dC5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgZmlsZS53cml0ZShkYXRhICsgJ1xcbicsIHRydWUsIHRydWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2ICE9PSAnMicpIHtcbiAgICAgICAgc3Rkb3V0ID0gX3N0ZG91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXYgPT09ICcyJyB8fCBwcmV2ID09PSAnJicpIHtcbiAgICAgICAgc3RkZXJyID0gX3N0ZG91dDtcbiAgICAgIH1cblxuICAgICAgdmFyIF9uZXh0ID0gbmV4dDtcbiAgICAgIG5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEZTLndyaXRlRlMoKTtcbiAgICAgICAgX25leHQoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5leGVjKGNvbW1hbmQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gIH1cblxuICBleGVjKGNtZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gICAgaWYgKHRoaXMuYWxpYXNlc1tjbWRdKSB7XG4gICAgICB2YXIgbGluZSA9ICh0aGlzLmFsaWFzZXNbY21kXSArICcgJyArIGFyZ3MpLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgICAgdGhpcy5leGVjKGxpbmUuc2hpZnQoKSwgbGluZS5qb2luKCcgJyksIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGZuO1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb21tYW5kc1tjbWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmbiA9IHRoaXMuY29tbWFuZHNbY21kXTtcbiAgICB9IGVsc2UgaWYgKChmbiA9IHRoaXMubG9hZChjbWQpKSkge1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGRlcnIud3JpdGUoJ3pzaDogY29tbWFuZCBub3QgZm91bmQ6ICcgKyBjbWQpO1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhcmdzID0gQXJnc1BhcnNlci5wYXJzZShhcmdzKTtcbiAgICAgIGZuLmNhbGwodW5kZWZpbmVkLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXIoY21kLCBmbikge1xuICAgIHRoaXMuY29tbWFuZHNbY21kXSA9IGZuO1xuICB9XG5cbiAgYWxpYXMoY21kLCBvcmlnaW5hbCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbGlhc2VzO1xuICAgIH1cbiAgICB0aGlzLmFsaWFzZXNbY21kXSA9IG9yaWdpbmFsO1xuICB9XG5cbiAgdW5hbGlhcyhjbWQpIHtcbiAgICBkZWxldGUgdGhpcy5hbGlhc2VzW2NtZF07XG4gIH1cblxuICBnZXQoY21kKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHNbY21kXTtcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgenNoIGZyb20gJy4venNoJztcblxuY29uc3QgbWFwID0gQXJyYXkucHJvdG90eXBlLm1hcDtcbmNvbnN0IHN0cmluZ2lmeSA9IChhcmdzKSA9PlxuICBtYXAuY2FsbChcbiAgICBhcmdzLFxuICAgIChhKSA9PiBKU09OLnN0cmluZ2lmeShhKSB8fCBbYV0rJydcbiAgKS5qb2luKCcgJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnNvbGUge1xuICBjb25zdHJ1Y3RvcihzdGRvdXQsIHN0ZGVycikge1xuICAgIHRoaXMuc3Rkb3V0ID0gc3Rkb3V0O1xuICAgIHRoaXMuc3RkZXJyID0gc3RkZXJyO1xuICB9XG5cbiAgbG9nKCkge1xuICAgIHRoaXMuc3Rkb3V0LndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfVxuXG4gIGVycm9yKCkge1xuICAgIHRoaXMuc3RkZXJyLndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHpzaC5jbGVhcigpO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICBcImNvbnRlbnRcIjoge1xuICAgIFwiVXNlcnNcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgXCJndWVzdFwiOiB7XG4gICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICAgICAgXCIudmltcmNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiLnpzaHJjXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImFib3V0Lm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgdGFkZXV6YWdhbGxvLmNvbVxcblxcbiogQWJvdXQgbWVcXG4gIEknbSBhIEZ1bGwgU3RhY2sgRGV2ZWxvcGVyLCBKUyBQYXNzaW9uYXRlLCBSdWJ5IEZhbiwgQysrIFNvbWV0aGluZywgR2FtZSBEZXZlbG9wbWVudCBFbnRodXNpYXN0LFxcbiAgQWx3YXlzIHdpbGxpbmcgdG8gY29udHJpYnV0ZSB0byBvcGVuIHNvdXJjZSBwcm9qZWN0cyBhbmQgdHJ5aW5nIHRvIGxlYXJuIHNvbWUgbW9yZSBtYXRoLlxcblxcbiogQWJvdXQgdGhpcyB3ZWJzaXRlXFxuICBJIHdhbnRlZCBtb3JlIHRoYW4ganVzdCBzaG93IG15IHdvcmssIEkgd2FudGVkIHRvIHNob3cgbXkgd29yayBlbnZpcm9ubWVudC5cXG4gIFNpbmNlIEkgZG8gc29tZSBtb2JpbGUgZGV2ZWxvcG1lbnQgYXMgd2VsbCAgSSBhbHNvIHVzZSAoc2FkbHkpIHNvbWUgSURFcywgYnV0IGFsd2F5cyB0cnlpbmdcXG4gIHRvIGRvIGFzIG11Y2ggYXMgSSBjYW4gb24gdGhpcyB0ZXJtaW5hbCwgc28gSSBtYWRlIGEgdmVyeSBzaW1pbGFyIGNvcHkgKGF0IGxlYXN0IHZpc3VhbGx5KVxcbiAgb2YgaXQgc28gcGVvcGxlIGNvdWxkIGdldCB0byBzZWUgd2hhdCBJIGRvIGFuZCBob3cgSSAodXN1YWxseSkgZG8uXFxuXFxuKiBDb21tYW5kc1xcbiAgSWYgeW91IHdhbnQgdG8ga25vdyBtb3JlIGFib3V0IG1lLCB0aGVyZSBhcmUgYSBmZXcgY29tbWFuZHM6XFxuICAgICogYWJvdXQgIChjdXJyZW50bHkgcnVubmluZylcXG4gICAgKiBjb250YWN0IFxcbiAgICAqIHJlc3VtZVxcbiAgICAqIHByb2plY3RzXFxuXFxuICBJZiB5b3UgbmVlZCBzb21lIGhlbHAgYWJvdXQgdGhlIHRlcm1pbmFsLCBvciB3YW50IHRvIGtub3cgd2hhdCBmdW5jdGlvbmFsaXRpZXMgYXJlIGN1cnJyZW50bHkgaW1wbGVtZW50ZWQsIHR5cGUgYGhlbHBgIGFueSB0aW1lLlxcblxcbkhvcGUgeW91IGhhdmUgYXMgbXVjaCBmdW4gYXMgSSBoYWQgZG9pbmcgaXQgOilcXG5cXG5UYWRldSBaYWdhbGxvXFxuICAgICAgXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY29udGFjdC5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIEFsbCBteSBjb250YWN0cywgZmVlbCBmcmVlIHRvIHJlYWNoIG1lIGF0IGFueSBvZiB0aGVzZVxcblxcbiogPGEgaHJlZj1cXFwibWFpbHRvOnRhZGV1emFnYWxsb0BnbWFpbC5jb21cXFwiIGFsdD1cXFwiRW1haWxcXFwiPltFbWFpbF0obWFpbHRvOnRhZGV1emFnYWxsb0BnbWFpbC5jb20pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9naXRodWIuY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJHaXRIdWJcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bR2l0SHViXShodHRwczovL2dpdGh1Yi5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vdHdpdHRlci5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIlR3aXR0ZXJcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bVHdpdHRlcl0oaHR0cHM6Ly90d2l0dGVyLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9mYWNlYm9vay5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkZhY2Vib29rXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0ZhY2Vib29rXShodHRwczovL2ZhY2Vib29rLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK1RhZGV1WmFnYWxsb1xcXCIgYWx0PVxcXCJHb29nbGUgK1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltHb29nbGUgK10oaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK1RhZGV1WmFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwOi8vd3d3LmxpbmtlZGluLmNvbS9wcm9maWxlL3ZpZXc/aWQ9MTYwMTc3MTU5XFxcIiBhbHQ9XFxcIkxpbmtlZGluXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0xpbmtlZGluXShodHRwOi8vd3d3LmxpbmtlZGluLmNvbS9wcm9maWxlL3ZpZXc/aWQ9MTYwMTc3MTU5KTwvYT5cXG4qIDxhIGhyZWY9XFxcInNreXBlOi8vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkxpbmtlZGluXFxcIj5bU2t5cGVdKHNreXBlOi8vdGFkZXV6YWdhbGxvKTwvYT5cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJwcm9qZWN0cy5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJGb3Igbm93IHlvdSBjYW4gaGF2ZSBhIGxvb2sgYXQgdGhpcyBvbmUhIDopXFxuKFRoYXQncyB3aGF0IEknbSBkb2luZylcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJyZWFkbWUubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiZm9vIGJhciBiYXpcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJyZXN1bWUubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBUYWRldSBaYWdhbGxvIGRhIFNpbHZhXFxuLS0tXFxuXFxuIyMgUHJvZmlsZVxcbi0tLSBcXG4gIEkgYW0gcGFzc2lvbmF0ZSBmb3IgYWxsIGtpbmRzIG9mIGRldmVsb3BtZW50LCBsb3ZlIHRvIGxlYXJuIG5ldyBsYW5ndWFnZXMgYW5kIHBhcmFkaWdtcywgYWx3YXlzIHJlYWR5IGZvciBhIGdvb2QgY2hhbGxlbmdlLlxcbiAgSSBhbHNvIGxpa2UgTWF0aCwgR2FtZSBkZXZlbG9wbWVudCBhbmQgd2hlbiBwb3NzaWJsZSBjb250cmlidXRlIHRvIG9wZW4gc291cmNlIHByb2plY3RzLlxcblxcbiMjIEdlbmVyYWwgSW5mb3JtYXRpb25cXG4tLS1cXG4gICogRW1haWw6IHRhZGV1emFnYWxsb0BnbWFpbC5jb21cXG4gICogUGhvbmU6ICs1NSAzMiA4ODYzIDM2ODRcXG4gICogU2t5cGU6IHRhZGV1emFnYWxsb1xcbiAgKiBHaXRodWI6IGdpdGh1Yi5jb20vdGFkZXV6YWdhbGxvXFxuICAqIExvY2F0aW9uOiBKdWl6IGRlIEZvcmEvTUcsIEJyYXppbFxcblxcbiMjIEVkdWNhdGlvbmFsIEJhY2tncm91bmRcXG4tLS1cXG5cXG4gICogV2ViIERldmVsb3BtZW50IGF0IEluc3RpdHV0byBWaWFubmEgSnVuaW9yLCAyMDEwXFxuICAqIEdlbmVyYWwgRW5nbGlzaCBhdCBUaGUgQ2FybHlsZSBJbnN0aXR1dGUsIDIwMTFcXG5cXG4jIFdvcmsgRXhwZXJpZW5jZVxcbi0tLVxcblxcbiAgKiA8aT4qaU9TIERldmVsb3Blcio8L2k+IGF0IDxpPipRcmFuaW8qPC9pPiBmcm9tIDxpPipEZWNlbWJlciwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBRcmFuaW8gaXMgYSBzdGFydHVwIHRoYXQgZ3JldyBpbnNpZGUgdGhlIGNvbXBhbnkgSSB3b3JrIChlTWlvbG8uY29tKSBhbmQgSSB3YXMgaW52aXRlZCB0byBsZWFkIHRoZSBpT1MgZGV2ZWxvcG1lbnQgdGVhbVxcbiAgICAgIG9uIGEgY29tcGxldGVseSByZXdyaXRlbiB2ZXJzaW9uIG9mIHRoZSBhcHBcXG5cXG4gICogPGk+KldlYiBhbmQgTW9iaWxlIERldmVsb3Blcio8L2k+IGF0IDxpPipCb251eio8L2k+IGZyb20gPGk+KkZlYnJ1YXJ5LCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIEkgc3RhcnRlZCBkZXZlbG9waW5nIHRoZSBpT1MgYXBwIGFzIGEgZnJlZWxhbmNlciwgYWZ0ZXIgdGhlIGFwcCB3YXMgcHVibGlzaGVkIEkgd2FzIGludml0ZWQgdG8gbWFpbnRhaW4gdGhlIFJ1Ynkgb24gUmFpbHNcXG4gICAgICBhcGkgYW5kIHdvcmsgb24gdGhlIEFuZHJvaWQgdmVyc2lvbiBvZiB0aGUgYXBwXFxuXFxuICAqIDxpPipXZWIgYW5kIE1vYmlsZSBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qZU1pb2xvLmNvbSo8L2k+IGZyb20gPGk+KkFwcmlsLCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIFRoZSBjb21wYW55IGp1c3Qgd29ya2VkIHdpdGggUEhQLCBzbyBJIGpvaW5lZCB3aXRoIHRoZSBpbnRlbnRpb24gb2YgYnJpbmdpbmcgbmV3IHRlY2hub2xvZ2llcy4gV29ya2VkIHdpdGggUHl0aG9uLCBSdWJ5LCBpT1MsXFxuICAgICAgQW5kcm9pZCBhbmQgSFRNTDUgYXBwbGljYXRpb25zXFxuXFxuICAqIDxpPippT1MgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KlByb0RvY3RvciBTb2Z0d2FyZSBMdGRhLio8L2k+IGZyb20gPGk+Kkp1bHksIDIwMTIqPC9pPiB1bnRpbCA8aT4qT2N0b2JlciwgMjAxMio8L2k+XFxuICAgIC0gQnJpZWZseSB3b3JrZWQgd2l0aCB0aGUgaU9TIHRlYW0gb24gdGhlIGRldmVsb3BtZW50IG9mIHRoZWlyIGZpcnN0IG1vYmlsZSB2ZXJzaW9uIG9mIHRoZWlyIG1haW4gcHJvZHVjdCwgYSBtZWRpY2FsIHNvZnR3YXJlXFxuXFxuICAqIDxpPipXZWIgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KkF0byBJbnRlcmF0aXZvKjwvaT4gZnJvbSA8aT4qRmVicnVhcnksIDIwMTIqPC9pPiB1bnRpbCA8aT4qSnVseSwgMjAxMio8L2k+XFxuICAgIC0gTW9zdCBvZiB0aGUgd29yayB3YXMgd2l0aCBQSFAgYW5kIE15U1FMLCBhbHNvIHdvcmtpbmcgd2l0aCBKYXZhU2NyaXB0IG9uIHRoZSBjbGllbnQgc2lkZS4gV29ya2VkIHdpdGggTVNTUUxcXG4gICAgICBhbmQgT3JhY2xlIGRhdGFiYXNlcyBhcyB3ZWxsXFxuXFxuICAqIDxpPipXZWIgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+Kk1hcmlhIEZ1bWFjzKdhIENyaWFjzKdvzINlcyo8L2k+IGZyb20gPGk+Kk9jdG9iZXIsIDIwMTAqPC9pPiB1bnRpbCA8aT4qSnVuZSwgMjAxMSo8L2k+XFxuICAgIC0gSSB3b3JrZWQgbW9zdGx5IHdpdGggUEhQIGFuZCBNeVNRTCwgYWxzbyBtYWtpbmcgdGhlIGZyb250IGVuZCB3aXRoIEhUTUwgYW5kIENTUyBhbmQgbW9zdCBhbmltYXRpb25zIGluIEphdmFTY3JpcHQsXFxuICAgICAgYWx0aG91Z2ggSSBhbHNvIHdvcmtlZCB3aXRoIGEgZmV3IGluIEFTMy4gQnJpZWZseSB3b3JrZWQgd2l0aCBNb25nb0RCXFxuXFxuIyMgQWRkaXRpb25hbCBJbmZvcm1hdGlvblxcbi0tLVxcblxcbiogRXhwZXJpZW5jZSB1bmRlciBMaW51eCBhbmQgT1MgWCBlbnZpcm9ubWVudFxcbiogU3R1ZGVudCBFeGNoYW5nZTogNiBtb250aHMgb2YgcmVzaWRlbmNlIGluIElyZWxhbmRcXG5cXG4jIyBMYW5ndWFnZXNcXG4tLS1cXG5cXG4qIFBvcnR1Z3Vlc2Ug4oCTIE5hdGl2ZSBTcGVha2VyXFxuKiBFbmdsaXNoIOKAkyBGbHVlbnQgTGV2ZWxcXG4qIFNwYW5pc2gg4oCTIEludGVybWVkaWF0ZSBMZXZlbFxcblxcbiMjIFByb2dyYW1taW5nIGxhbmd1YWdlcyAob3JkZXJlZCBieSBrbm93bGVkZ2UpXFxuLS0tXFxuXFxuKiBKYXZhU2NyaXB0XFxuKiBPYmplY3RpdmXCrUNcXG4qIEMvQysrXFxuKiBSdWJ5IG9uIFJhaWxzXFxuKiBOb2RlSlNcXG4qIFBIUFxcbiogSmF2YVxcbiogUHl0aG9uXFxuXFxuIyMgQWRkaXRpb25hbCBza2lsbHNcXG4tLS1cXG5cXG4qIEhUTUw1L0NTUzNcXG4qIE1WQ1xcbiogRGVzaWduIFBhdHRlcm5zXFxuKiBUREQvQkREXFxuKiBHaXRcXG4qIEFuYWx5c2lzIGFuZCBEZXNpZ24gb2YgQWxnb3JpdGhtc1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfSxcbiAgICBcInVzclwiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTguMDAwWlwiLFxuICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjU4LjAwMFpcIixcbiAgICAgICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICAgICAgXCJhbGlhcy5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI0OjQzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjQ6NDMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnenNoLmpzL2NvbW1hbmQtbWFuYWdlcic7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIGJ1ZmZlciA9ICcnO1xcbiAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICB2YXIga2V5ID0gYXJncy5hcmd1bWVudHMuc2hpZnQoKTtcXG4gICAgdmFyIGluZGV4O1xcbiAgICBpZiAofihpbmRleCA9IGtleS5pbmRleE9mKCc9JykpKSB7XFxuICAgICAgdmFyIGNvbW1hbmQ7XFxuXFxuICAgICAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCAmJiBpbmRleCA9PT0ga2V5Lmxlbmd0aCAtIDEpIHtcXG4gICAgICAgIGNvbW1hbmQgPSBhcmdzLmFyZ3VtZW50cy5qb2luKCcgJyk7XFxuICAgICAgfSBlbHNlIHtcXG4gICAgICAgIGNvbW1hbmQgPSBrZXkuc3Vic3RyKGluZGV4ICsgMSk7XFxuICAgICAgfVxcblxcbiAgICAgIGtleSA9IGtleS5zdWJzdHIoMCwgaW5kZXgpO1xcblxcbiAgICAgIGlmIChjb21tYW5kKSB7XFxuICAgICAgICBDb21tYW5kTWFuYWdlci5hbGlhcyhrZXksIGNvbW1hbmQpO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgdmFyIGFsaWFzZXMgPSBDb21tYW5kTWFuYWdlci5hbGlhcygpO1xcblxcbiAgICBmb3IgKHZhciBpIGluIGFsaWFzZXMpIHtcXG4gICAgICBidWZmZXIgKz0gaSArICc9XFxcXCcnICsgYWxpYXNlc1tpXSArICdcXFxcJ1xcXFxuJztcXG4gICAgfVxcbiAgfVxcblxcbiAgc3Rkb3V0LndyaXRlKGJ1ZmZlcik7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNhdC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjMyLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6MzIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdjYXQnLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdjYXQnLCBwYXRoLCAnSXMgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgc3Rkb3V0LndyaXRlKGZpbGUucmVhZCgpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo0NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcGF0aCA9IGFyZ3MuYXJndW1lbnRzWzBdIHx8ICd+JztcXG4gIHZhciBkaXIgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2NkJywgcGF0aCkpO1xcbiAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdjZCcsIHBhdGgsICdJcyBhIGZpbGUnKSk7XFxuICB9IGVsc2Uge1xcbiAgICBGUy5jdXJyZW50UGF0aCA9IGRpci5wYXRoO1xcbiAgICBGUy5jdXJyZW50RGlyID0gZGlyLnNlbGYoKTtcXG4gIH1cXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZWNoby5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjU3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6NTcuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQXJnc1BhcnNlciBmcm9tICd6c2guanMvYXJncy1wYXJzZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHRyeSB7XFxuICAgIHN0ZG91dC53cml0ZShBcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyhhcmdzLnJhdykuam9pbignICcpKTtcXG4gIH0gY2F0Y2ggKGVycikge1xcbiAgICBzdGRlcnIud3JpdGUoJ3pzaDogJyArIGVyci5tZXNzYWdlKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiaGVscC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjEwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnenNoLmpzL2NvbW1hbmQtbWFuYWdlcic7XFxuaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHN0ZG91dC53cml0ZSgncmVnaXN0ZXJlZCBjb21tYW5kczonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5jb21tYW5kcykuam9pbignICcpKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG4gIHN0ZG91dC53cml0ZSgnZXhlY3V0YWJsZXMgKG9uIC91c3IvYmluKScpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKEZpbGUub3BlbignL3Vzci9iaW4nKS5yZWFkKCkpLm1hcChmdW5jdGlvbihmaWxlKSB7XFxuICAgIHJldHVybiBmaWxlLnJlcGxhY2UoL1xcXFwuanMkLywgJycpO1xcbiAgfSkuam9pbignICcpKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnYWxpYXNlczonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5hbGlhc2VzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xcbiAgICByZXR1cm4ga2V5ICsgJz1cXFwiJyArIENvbW1hbmRNYW5hZ2VyLmFsaWFzZXNba2V5XSArICdcXFwiJztcXG4gIH0pLmpvaW4oJyAnKSk7XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MTYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoxNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBpZiAoIWFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICBhcmdzLmFyZ3VtZW50cy5wdXNoKCcuJyk7XFxuICB9XFxuXFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGRpciA9IEZpbGUub3BlbihhcmcpO1xcblxcbiAgICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbHMnLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2xzJywgYXJnLCAnSXMgYSBmaWxlJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHZhciBmaWxlcyA9IE9iamVjdC5rZXlzKGRpci5yZWFkKCkpO1xcblxcbiAgICAgIGlmICghYXJncy5vcHRpb25zLmEpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMuZmlsdGVyKGZ1bmN0aW9uIChmaWxlKSB7XFxuICAgICAgICAgIHJldHVybiBmaWxlWzBdICE9PSAnLic7XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcXG4gICAgICAgIHN0ZG91dC53cml0ZShhcmcgKyAnOicpO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAoYXJncy5vcHRpb25zLmwpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMubWFwKGZ1bmN0aW9uIChuYW1lKSB7XFxuICAgICAgICAgIHZhciBmaWxlID0gZGlyLm9wZW4obmFtZSk7XFxuICAgICAgICAgIHZhciB0eXBlID0gZmlsZS5pc0RpcigpID8gJ2QnIDogJy0nO1xcbiAgICAgICAgICB2YXIgcGVybXMgPSB0eXBlICsgJ3J3LXItLXItLSc7XFxuXFxuICAgICAgICAgIHJldHVybiBwZXJtcyArICcgZ3Vlc3QgZ3Vlc3QgJyArIGZpbGUubGVuZ3RoKCkgKyAnICcgKyBmaWxlLm10aW1lKCkgKyAnICcgKyBuYW1lO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIHN0ZG91dC53cml0ZShmaWxlcy5qb2luKGFyZ3Mub3B0aW9ucy5sID8gJ1xcXFxuJyA6ICcgJykpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm1rZGlyLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ21rZGlyJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbWtkaXInLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ0ZpbGUgZXhpc3RzJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuY3JlYXRlRm9sZGVyKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtdi5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjI1LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjUuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHRhcmdldFBhdGggPSBhcmdzLmFyZ3VtZW50cy5wb3AoKTtcXG4gIHZhciBzb3VyY2VQYXRocyA9IGFyZ3MuYXJndW1lbnRzO1xcbiAgdmFyIHRhcmdldCA9IEZpbGUub3Blbih0YXJnZXRQYXRoKTtcXG5cXG4gIGlmICghdGFyZ2V0UGF0aCB8fFxcbiAgICAgICFzb3VyY2VQYXRocy5sZW5ndGggfHxcXG4gICAgICAgIChzb3VyY2VQYXRocy5sZW5ndGggPiAxICYmXFxuICAgICAgICAgKCF0YXJnZXQuZXhpc3RzKCkgfHwgdGFyZ2V0LmlzRmlsZSgpKVxcbiAgICAgICAgKVxcbiAgICAgKSB7XFxuICAgIHN0ZGVyci53cml0ZSgndXNhZ2U6IG12IHNvdXJjZSB0YXJnZXRcXFxcbiBcXFxcdCBtdiBzb3VyY2UgLi4uIGRpcmVjdG9yeScpO1xcbiAgfSBlbHNlIGlmICghdGFyZ2V0LnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdtdicsIHRhcmdldC5kaXJuYW1lKSk7XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYmFja3VwID0gdGFyZ2V0LnNlbGYoKTtcXG4gICAgdmFyIG9rID0gc291cmNlUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChzdWNjZXNzLCBzb3VyY2VQYXRoKSB7XFxuICAgICAgaWYgKHN1Y2Nlc3MpIHtcXG4gICAgICAgIHZhciBzb3VyY2UgPSBGaWxlLm9wZW4oc291cmNlUGF0aCk7XFxuXFxuICAgICAgICBpZiAoIXNvdXJjZS5leGlzdHMoKSkge1xcbiAgICAgICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212Jywgc291cmNlUGF0aHNbMF0pKTtcXG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLmlzRGlyKCkgJiYgdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbXYnLCAncmVuYW1lICcgKyBzb3VyY2VQYXRoc1swXSArICcgdG8gJyArIHRhcmdldFBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICBpZiAoIXRhcmdldC5pc0ZpbGUoKSkge1xcbiAgICAgICAgICAgIHRhcmdldC5yZWFkKClbc291cmNlLmZpbGVuYW1lXSA9IHNvdXJjZS5zZWxmKCk7XFxuICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgdGFyZ2V0LndyaXRlKHNvdXJjZS5yZWFkKCksIGZhbHNlLCB0cnVlKTtcXG4gICAgICAgICAgfVxcblxcbiAgICAgICAgICBzb3VyY2UuZGVsZXRlKCk7XFxuICAgICAgICAgIHJldHVybiB0cnVlO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG5cXG4gICAgICByZXR1cm4gZmFsc2U7XFxuICAgIH0sIHRydWUpO1xcblxcbiAgICBpZiAob2spIHtcXG4gICAgICBGUy53cml0ZUZTKCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdGFyZ2V0LmRpclt0YXJnZXQuZmlsZW5hbWVdID0gYmFja3VwO1xcbiAgICB9XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInB3ZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjI5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcHdkID0gRlMuY3VycmVudFBhdGg7XFxuXFxuICBpZiAoc3Rkb3V0KSB7XFxuICAgIHN0ZG91dC53cml0ZShwd2QpO1xcbiAgICBuZXh0KCk7XFxuICB9IGVsc2Uge1xcbiAgICByZXR1cm4gcHdkO1xcbiAgfVxcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjMzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm0nLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3JtJywgYXJnLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdpcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm1kaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjozOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjM4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGFyZykge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihhcmcpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkgfHwgIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ3JtZGlyJywgYXJnKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm1kaXInLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS5kZWxldGUoKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInNvdXJjZS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjQ0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIvKmVzbGludCBuby1ldmFsOiAwKi9cXG5pbXBvcnQgQ29uc29sZSBmcm9tICd6c2guanMvY29uc29sZSc7XFxuaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJncy5hcmd1bWVudHNbMF0pO1xcbiAgICBpZiAoIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdHJ5IHtcXG4gICAgICAgIHZhciBjb25zb2xlID0gbmV3IENvbnNvbGUoc3Rkb3V0LCBzdGRlcnIpOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXFxuICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoZXZhbChmaWxlLnJlYWQoKSkpO1xcbiAgICAgICAgc3Rkb3V0LndyaXRlKCc8LSAnICsgcmVzdWx0KTtcXG4gICAgICB9IGNhdGNoIChlcnIpIHtcXG4gICAgICAgIHN0ZGVyci53cml0ZShlcnIuc3RhY2spO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgc3RkZXJyLndyaXRlKCdzb3VyY2U6IG5vdCBlbm91Z2ggYXJndW1lbnRzJyk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRvdWNoLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ3RvdWNoJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSl7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCd0b3VjaCcsIHBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS53cml0ZSgnJywgdHJ1ZSwgdHJ1ZSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ1bmFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgY21kID0gYXJncy5hcmd1bWVudHNbMF07XFxuXFxuICBpZiAoY21kKSB7XFxuICAgIENvbW1hbmRNYW5hZ2VyLnVuYWxpYXMoY21kKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9XG4gIH0sXG4gIFwidHlwZVwiOiBcImRcIlxufSIsImltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuY29uc3QgTU9OVEhTID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlIHtcbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHRoaXMucGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gICAgcGF0aCA9IHRoaXMucGF0aC5zcGxpdCgnLycpO1xuICAgIHRoaXMuZmlsZW5hbWUgPSBwYXRoLnBvcCgpO1xuICAgIHRoaXMuZGlybmFtZSA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICB0aGlzLmRpciA9IEZTLm9wZW4odGhpcy5kaXJuYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyBvcGVuKHBhdGgpIHtcbiAgICByZXR1cm4gbmV3IEZpbGUocGF0aCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0VGltZXN0YW1wICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB9XG5cbiAgcGFyZW50RXhpc3RzKCkge1xuICAgIHJldHVybiB0aGlzLmRpciAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRoaXMuZGlyID09PSAnb2JqZWN0JyAmJiB0aGlzLmRpci50eXBlID09PSAnZCc7XG4gIH1cblxuICBleGlzdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmICghdGhpcy5maWxlbmFtZSB8fCB0eXBlb2YgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXSAhPT0gJ3VuZGVmaW5lZCcpO1xuICB9XG5cbiAgaXNGaWxlKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmIHRoaXMuZmlsZW5hbWUgJiZcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2YnO1xuICB9XG5cbiAgaXNEaXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiZcbiAgICAgICghdGhpcy5maWxlbmFtZSB8fCB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLnR5cGUgPT09ICdkJyk7XG4gIH1cblxuICBkZWxldGUoKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMud3JpdGUoJycsIGZhbHNlLCB0cnVlKTtcbiAgfVxuXG4gIHdyaXRlKGNvbnRlbnQsIGFwcGVuZCwgZm9yY2UpIHtcbiAgICB2YXIgdGltZSA9IEZpbGUuZ2V0VGltZXN0YW1wKCk7XG5cbiAgICBpZiAoIXRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGlmIChmb3JjZSAmJiB0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICB0aGlzLmNyZWF0ZUZpbGUodGltZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZmlsZTogJyArIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5pc0ZpbGUoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgd3JpdGUgdG8gZGlyZWN0b3J5OiAlcycsIHRoaXMucGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBfY29udGVudCA9ICcnO1xuICAgICAgaWYgKGFwcGVuZCkge1xuICAgICAgICBfY29udGVudCArPSB0aGlzLnJlYWQoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kaXIubXRpbWUgPSB0aW1lO1xuICAgICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5tdGltZSA9IHRpbWU7XG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLmNvbnRlbnQgPSBfY29udGVudCArIGNvbnRlbnQ7XG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfVxuICB9XG5cbiAgcmVhZCgpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA6IHRoaXMuZGlyLmNvbnRlbnQ7XG4gIH1cblxuICBfY3JlYXRlKHR5cGUsIGNvbnRlbnQsIHRpbWVzdGFtcCkge1xuICAgIGlmICh0aGlzLmV4aXN0cygpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgJXMgYWxyZWFkeSBleGlzdHMnLCB0aGlzLnBhdGgpO1xuICAgIH1cblxuICAgIGlmICghdGltZXN0YW1wKSB7XG4gICAgICB0aW1lc3RhbXAgPSBGaWxlLmdldFRpbWVzdGFtcCgpO1xuICAgIH1cblxuICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0gPSB7XG4gICAgICBjdGltZTogdGltZXN0YW1wLFxuICAgICAgbXRpbWU6IHRpbWVzdGFtcCxcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICB0eXBlOiB0eXBlXG4gICAgfTtcblxuICAgIEZTLndyaXRlRlMoKTtcbiAgfVxuXG4gIGNyZWF0ZUZvbGRlcih0aW1lc3RhbXApIHtcbiAgICB0aGlzLl9jcmVhdGUoJ2QnLCB7fSwgdGltZXN0YW1wKTtcbiAgfVxuXG4gIGNyZWF0ZUZpbGUodGltZXN0YW1wKSB7XG4gICAgdGhpcy5fY3JlYXRlKCdmJywgJycsIHRpbWVzdGFtcCk7XG4gIH1cblxuICBzZWxmKCkge1xuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIgOiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICB9XG5cbiAgb3BlbihmaWxlKSB7XG4gICAgcmV0dXJuIEZpbGUub3Blbih0aGlzLnBhdGggKyAnLycgKyBmaWxlKTtcbiAgfVxuXG4gIGxlbmd0aCgpIHtcbiAgICB2YXIgY29udGVudCA9IHRoaXMucmVhZCgpO1xuXG4gICAgaWYgKHRoaXMuaXNGaWxlKCkpIHtcbiAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNEaXIoKSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbnRlbnQpLmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9XG5cbiAgbXRpbWUoKSB7XG4gICAgdmFyIHQgPSBuZXcgRGF0ZSh0aGlzLnNlbGYoKS5tdGltZSk7XG5cbiAgICB2YXIgZGF5QW5kTW9udGggPSBNT05USFNbdC5nZXRNb250aCgpXSArICcgJyArIHQuZ2V0RGF5KCk7XG4gICAgaWYgKERhdGUubm93KCkgLSB0LmdldFRpbWUoKSA+IDYgKiAzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDApIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0RnVsbFllYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRIb3VycygpICsgJzonICsgdC5nZXRNaW51dGVzKCk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IExvY2FsU3RvcmFnZSBmcm9tICcuL2xvY2FsLXN0b3JhZ2UnO1xuXG52YXIgRlMgPSB7fTtcbnZhciBGSUxFX1NZU1RFTV9LRVkgPSAnZmlsZV9zeXN0ZW0nO1xuXG5GUy53cml0ZUZTID0gZnVuY3Rpb24gKCkge1xuICBMb2NhbFN0b3JhZ2Uuc2V0SXRlbShGSUxFX1NZU1RFTV9LRVksIEpTT04uc3RyaW5naWZ5KEZTLnJvb3QpKTtcbn07XG5cblxuRlMucm9vdCA9IEpTT04ucGFyc2UoTG9jYWxTdG9yYWdlLmdldEl0ZW0oRklMRV9TWVNURU1fS0VZKSk7XG52YXIgZmlsZVN5c3RlbSA9IHJlcXVpcmUoJy4vZmlsZS1zeXN0ZW0uanNvbicpO1xudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KG9sZCwgbm5ldykge1xuICBmb3IgKHZhciBrZXkgaW4gbm5ldykge1xuICAgIG9sZFtrZXldID0gbm5ld1trZXldO1xuICB9XG59O1xuXG5pZiAoIUZTLnJvb3QgfHwgIUZTLnJvb3QuY29udGVudCkge1xuICBGUy5yb290ID0gZmlsZVN5c3RlbTtcbn0gZWxzZSB7XG4gIHZhciB0aW1lID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gIChmdW5jdGlvbiByZWFkZGlyKG9sZCwgbm5ldykge1xuICAgIGlmICh0eXBlb2Ygb2xkLmNvbnRlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gbm5ldy5jb250ZW50KSB7XG4gICAgICAgIHZhciBuID0gbm5ldy5jb250ZW50W2tleV07XG4gICAgICAgIHZhciBvID0gb2xkLmNvbnRlbnRba2V5XTtcblxuICAgICAgICBpZiAoIW8uY29udGVudCkge1xuICAgICAgICAgIG8gPSB7XG4gICAgICAgICAgICBjdGltZTogdGltZSxcbiAgICAgICAgICAgIG10aW1lOiB0aW1lLFxuICAgICAgICAgICAgY29udGVudDogby5jb250ZW50LFxuICAgICAgICAgICAgdHlwZTogdHlwZW9mIG8gPT09ICdzdHJpbmcnID8gJ2YnIDogJ2QnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvLnR5cGUgPT09ICdmJyAmJiBvLm10aW1lID09PSBvLmN0aW1lKSB7XG4gICAgICAgICAgY29weShvLCBuKTtcbiAgICAgICAgfSBlbHNlIGlmIChvLnR5cGUgPT09ICdkJykge1xuICAgICAgICAgIHJlYWRkaXIobywgbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pKEZTLnJvb3QsIGZpbGVTeXN0ZW0pO1xuXG4gIEZTLndyaXRlRlMoKTtcbn1cblxuRlMuY3VycmVudFBhdGggPSBGUy5ob21lID0gJy9Vc2Vycy9ndWVzdCc7XG5GUy5jdXJyZW50RGlyID0gRlMucm9vdC5jb250ZW50LlVzZXJzLmNvbnRlbnQuZ3Vlc3Q7XG5cbkZTLmRpcm5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKS5qb2luKCcvJyk7XG59O1xuXG5GUy5iYXNlbmFtZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcvJykucG9wKCk7XG59O1xuXG5GUy50cmFuc2xhdGVQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGluZGV4O1xuXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoJ34nLCBGUy5ob21lKTtcblxuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IChGUy5jdXJyZW50UGF0aCAhPT0gJy8nID8gRlMuY3VycmVudFBhdGggKyAnLycgOiAnLycpICsgcGF0aDtcbiAgfVxuXG4gIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG5cbiAgd2hpbGUofihpbmRleCA9IHBhdGguaW5kZXhPZignLi4nKSkpIHtcbiAgICBwYXRoLnNwbGljZShpbmRleCAtIDEsIDIpO1xuICB9XG5cbiAgd2hpbGUofihpbmRleCA9IHBhdGguaW5kZXhPZignLicpKSkge1xuICAgIHBhdGguc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGlmIChwYXRoWzBdID09PSAnLicpIHtcbiAgICBwYXRoLnNoaWZ0KCk7XG4gIH1cblxuICBpZiAocGF0aC5sZW5ndGggPCAyKSB7XG4gICAgcGF0aCA9IFssICwgXTtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4oJy8nKS5yZXBsYWNlKC8oW14vXSspXFwvKyQvLCAnJDEnKTtcbn07XG5cbkZTLnJlYWxwYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcblxuICByZXR1cm4gRlMuZXhpc3RzKHBhdGgpID8gcGF0aCA6IG51bGw7XG59O1xuXG5cbkZTLm9wZW4gPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zdWJzdHIoMSkuc3BsaXQoJy8nKS5maWx0ZXIoU3RyaW5nKTtcblxuICB2YXIgY3dkID0gRlMucm9vdDtcbiAgd2hpbGUocGF0aC5sZW5ndGggJiYgY3dkLmNvbnRlbnQpIHtcbiAgICBjd2QgPSBjd2QuY29udGVudFtwYXRoLnNoaWZ0KCldO1xuICB9XG5cbiAgcmV0dXJuIGN3ZDtcbn07XG5cbkZTLmV4aXN0cyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAhIUZTLm9wZW4ocGF0aCk7XG59O1xuXG5GUy5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFtdLmpvaW4uY2FsbChhcmd1bWVudHMsICc6ICcpO1xufTtcblxuRlMubm90Rm91bmQgPSBmdW5jdGlvbiAoY21kLCBhcmcpIHtcbiAgcmV0dXJuIEZTLmVycm9yKGNtZCwgYXJnLCAnTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeScpO1xufTtcblxuRlMuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKF9wYXRoKSB7XG4gIHZhciBwYXRoID0gdGhpcy50cmFuc2xhdGVQYXRoKF9wYXRoKTtcbiAgdmFyIG9wdGlvbnMgPSBbXTtcblxuICBpZiAoX3BhdGguc2xpY2UoLTEpID09PSAnLycpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIGlmIChwYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZmlsZW5hbWUgPSBfcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIHZhciBvcGVuUGF0aCA9IGZpbGVuYW1lLmxlbmd0aCA+IDEgPyBwYXRoLnNsaWNlKDAsIC0xKSA6IHBhdGg7XG4gICAgdmFyIGRpciA9IEZTLm9wZW4ob3BlblBhdGgpO1xuICAgIHZhciBmaWxlTmFtZSA9ICcnO1xuICAgIHZhciBwYXJlbnRQYXRoID0gcGF0aDtcblxuICAgIGlmICghZGlyKSB7XG4gICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgZmlsZU5hbWUgPSBwYXRoLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBwYXJlbnRQYXRoID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgICAgZGlyID0gRlMub3BlbihwYXJlbnRQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoZGlyICYmIHR5cGVvZiBkaXIuY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBkaXIuY29udGVudCkge1xuICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCBmaWxlTmFtZS5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGZpbGVOYW1lKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkaXIuY29udGVudFtrZXldLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBrZXkgKz0gJy8nO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9wdGlvbnMucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBGUztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250YWluZXIsIHNjcm9sbCkge1xuICB3aW5kb3cub25yZXNpemUgPSBzY3JvbGw7XG5cbiAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5mdWxsLXNjcmVlbicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICAgIWRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCApIHtcbiAgICAgIGlmIChjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICBjb250YWluZXIubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHR5cGVvZiBsb2NhbFN0b3JhZ2UgPT09ICd1bmRlZmluZWQnID9cbiAge1xuICAgIHNldEl0ZW06IGZ1bmN0aW9uKCkge30sXG4gICAgZ2V0SXRlbTogZnVuY3Rpb24oKSB7IHJldHVybiBudWxsOyB9XG4gIH1cbjpcbiAgbG9jYWxTdG9yYWdlO1xuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RyZWFtIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gIH1cblxuICBvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuX2NhbGxiYWNrc1tldmVudF0pIHtcbiAgICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSBbXTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYWxsYmFja3NbZXZlbnRdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgd3JpdGUoZGF0YSkge1xuICAgIHRoaXMuZW1taXQoJ2RhdGEnLCBkYXRhKTtcbiAgfVxuXG4gIGVtbWl0KGV2ZW50LCBkYXRhKSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgY2FsbGJhY2tzICYmIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCBiaW5kRnVsbFNjcmVlbiBmcm9tICcuL2Z1bGwtc2NyZWVuJztcbmltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICcuL2NvbW1hbmQtbWFuYWdlcic7XG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5pbXBvcnQgUkVQTCBmcm9tICcuL1JFUEwnO1xuaW1wb3J0IFN0cmVhbSBmcm9tICcuL3N0cmVhbSc7XG5cbi8qKlxuICogT25seSB1c2VkIGJ5IHNvdXJjZS5qcyAtIHVudXNlZCBpbXBvcnQgc28gaXQgZ2V0cyBpbnRvIHRoZSBidW5kbGVcbiAqL1xuaW1wb3J0IENvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcblxuY2xhc3MgWlNIIHtcbiAgY29uc3RydWN0b3IoY29udGFpbmVyLCBzdGF0dXNiYXIsIGNyZWF0ZUhUTUwpIHtcbiAgICBpZiAoY3JlYXRlSFRNTCkge1xuICAgICAgdGhpcy5jcmVhdGUoY29udGFpbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgICB0aGlzLnN0YXR1c2JhciA9IHN0YXR1c2JhcjtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWF0ZVN0cmVhbXMoKTtcblxuICAgIHRoaXMucm9vdENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyO1xuICAgIHRoaXMuQ29tbWFuZE1hbmFnZXIgPSBuZXcgQ29tbWFuZE1hbmFnZXIoKTtcbiAgICB0aGlzLlJFUEwgPSBuZXcgUkVQTCh0aGlzKTtcbiAgICB0aGlzLkZTID0gRlM7XG4gICAgdGhpcy5pbml0aWFsaXplSW5wdXQoKTtcbiAgICB0aGlzLnByb21wdCgpO1xuXG4gICAgYmluZEZ1bGxTY3JlZW4odGhpcy5jb250YWluZXIucGFyZW50RWxlbWVudCwgdGhpcy5zY3JvbGwuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLkNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyKCdjbGVhcicsIHRoaXMuY2xlYXIuYmluZCh0aGlzKSk7XG4gIH1cblxuICBjcmVhdGVTdHJlYW1zKCkge1xuICAgIHRoaXMuc3RkaW4gPSBuZXcgU3RyZWFtKCk7XG4gICAgdGhpcy5zdGRlcnIgPSBuZXcgU3RyZWFtKCk7XG4gICAgdGhpcy5zdGRvdXQgPSBuZXcgU3RyZWFtKCk7XG5cbiAgICB0aGlzLnN0ZGVyci5vbignZGF0YScsIChkKSA9PiB0aGlzLm91dHB1dChkLCAnc3RkZXJyJykpO1xuICAgIHRoaXMuc3Rkb3V0Lm9uKCdkYXRhJywgKGQpID0+IHRoaXMub3V0cHV0KGQsICdzdGRvdXQnKSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgdGhpcy5zdGRpbi53cml0ZShldmVudCk7XG4gICAgfSk7XG4gIH1cblxuICBwd2QoKSB7XG4gICAgcmV0dXJuIEZTLmN1cnJlbnRQYXRoLnJlcGxhY2UoRlMuaG9tZSwgJ34nKTtcbiAgfVxuXG4gICRQUzEoKSB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxzcGFuIGNsYXNzPVwid2hvXCI+Z3Vlc3Q8L3NwYW4+XG4gICAgICBvblxuICAgICAgPHNwYW4gY2xhc3M9XCJ3aGVyZVwiPiAke3RoaXMucHdkKCl9IDwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwiYnJhbmNoXCI+wrFtYXN0ZXI8L3NwYW4+Jmd0O1xuICAgIGA7XG4gIH1cblxuICBwcm9tcHQoKSB7XG4gICAgdmFyIHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHZhciBjb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXG4gICAgc3Bhbi5jbGFzc05hbWUgPSAncHMxJztcbiAgICBjb2RlLmNsYXNzTmFtZSA9ICdjb2RlJztcblxuICAgIHNwYW4uaW5uZXJIVE1MID0gdGhpcy4kUFMxKCk7XG5cbiAgICByb3cuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgcm93LmFwcGVuZENoaWxkKGNvZGUpO1xuXG4gICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQocm93KTtcbiAgICB0aGlzLlJFUEwudXNlKGNvZGUpO1xuICAgIHRoaXMuc3RhdHVzKHRoaXMucHdkKCkpO1xuICAgIHRoaXMuc2Nyb2xsKCk7XG4gICAgcm93LmFwcGVuZENoaWxkKHRoaXMuaW5wdXQpO1xuICAgIHRoaXMuaW5wdXQuZm9jdXMoKTtcbiAgfVxuXG4gIHN0YXR1cyh0ZXh0KSB7XG4gICAgaWYgKHRoaXMuc3RhdHVzYmFyKSB7XG4gICAgICB0aGlzLnN0YXR1c2Jhci5pbm5lckhUTUwgPSB0ZXh0O1xuICAgIH1cbiAgfVxuXG4gIGluaXRpYWxpemVJbnB1dCgpIHtcbiAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGlucHV0LmNsYXNzTmFtZSA9ICdmYWtlLWlucHV0JztcbiAgICB0aGlzLnJvb3RDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGlucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB7XG4gICAgICAgIGlucHV0LmJsdXIoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmlucHV0ID0gaW5wdXQ7XG4gIH1cblxuICBjcmVhdGUoY29udGFpbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb250YWluZXIpO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwidGVybWluYWxcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJidXR0b25zXCI+XG4gICAgICAgICAgICA8YSBjbGFzcz1cImNsb3NlXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgICAgICA8YSBjbGFzcz1cIm1pbmltaXplXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgICAgICA8YSBjbGFzcz1cIm1heGltaXplXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInRpdGxlXCI+PC9kaXY+XG4gICAgICAgICAgPGEgY2xhc3M9XCJmdWxsLXNjcmVlblwiIGhyZWY9XCIjXCI+PC9hPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInN0YXR1cy1iYXJcIj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuICAgIHRoaXMuc3RhdHVzYmFyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5zdGF0dXMtYmFyJyk7XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgdmFyIGNvZGVzID0gdGhpcy5jb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY29kZScpO1xuICAgIGlmICghY29kZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnByb21wdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLlJFUEwudXNlKGNvZGVzW2NvZGVzLmxlbmd0aCAtIDFdLCBaU0gpO1xuICAgIH1cbiAgfVxuXG4gIG91dHB1dCh0ZXh0LCBjbGFzc05hbWUpIHtcbiAgICB2YXIgb3V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3V0LmNsYXNzTmFtZSA9ICdjb2RlICcgKyBbY2xhc3NOYW1lXTtcbiAgICBvdXQuaW5uZXJIVE1MID0gdGV4dDtcblxuICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG91dCk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgfVxuXG4gIHNjcm9sbCgpIHtcbiAgICB2YXIgYyA9IHRoaXMucm9vdENvbnRhaW5lcjtcbiAgICBzZXRUaW1lb3V0KCgpID0+IGMuc2Nyb2xsVG9wID0gYy5zY3JvbGxIZWlnaHQsIDApO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgdGhpcy5wcm9tcHQoKTtcbiAgfVxuXG59XG5cbndpbmRvdy5aU0ggPSBaU0g7XG5leHBvcnQgZGVmYXVsdCBaU0g7XG4iXX0=
