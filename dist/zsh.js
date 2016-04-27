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
},{}],"CjB+4o":[function(require,module,exports){
'use strict';

var zsh = require('./zsh');

var Console = (function () {
  function Console(stdout, stderr) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.external = typeof console === 'undefined' ? {} : window.console;
  }

  function stringify(args) {
    return [].map.call(args, function (a) {
      return JSON.stringify(a) || [a] + '';
    }).join(' ');
  }

  Console.prototype.log = function () {
    this.stdout.write(stringify(arguments));
  };

  Console.prototype.error = function () {
    this.stderr.write(stringify(arguments));
  };

  Console.prototype.clear = function () {
    zsh.clear();
  };

  return Console;
})();

module.exports = Console;

},{"./zsh":"F2/ljt"}],"zsh.js/console":[function(require,module,exports){
module.exports=require('CjB+4o');
},{}],8:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVB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QztHQUN6QyxDQUFDOztBQUVGLFNBQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVk7QUFDcEMsT0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQ2IsQ0FBQzs7QUFFRixTQUFPLE9BQU8sQ0FBQztDQUNoQixDQUFBLEVBQUcsQ0FBQzs7QUFHTCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7Ozs7QUNqQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUFTLENBQUMsQ0FBQztBQUN0QyxTQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzs7QUFFckIsVUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ2Y7OztXQUVLLGtCQUFHO0FBQ1AsVUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUMzQixnQkFBVSxDQUFDO2VBQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWTtPQUFBLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDbkQ7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQzlCLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNmOzs7U0E5SUcsR0FBRzs7O0FBa0pULE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO3FCQUNGLEdBQUciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcbmltcG9ydCBMb2NhbFN0b3JhZ2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuLy8gVE9ETzogSW1wbGVtZW50IFZJIGJpbmRpbmdzXG5cbmNvbnN0IExFRlQgPSAzNztcbmNvbnN0IFVQID0gMzg7XG5jb25zdCBSSUdIVCA9IDM5O1xuY29uc3QgRE9XTiA9IDQwO1xuXG5jb25zdCBUQUIgPSA5O1xuY29uc3QgRU5URVIgPSAxMztcbmNvbnN0IEJBQ0tTUEFDRSA9IDg7XG5jb25zdCBTUEFDRSA9IDMyO1xuXG5jb25zdCBISVNUT1JZX1NUT1JBR0VfS0VZID0gJ1RFUk1JTkFMX0hJU1RPUlknO1xuY29uc3QgSElTVE9SWV9TSVpFID0gMTAwO1xuY29uc3QgSElTVE9SWV9TRVBBUkFUT1IgPSAnJSVISVNUT1JZX1NFUEFSQVRPUiUlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkVQTCB7XG4gIGNvbnN0cnVjdG9yKHpzaCkge1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMubGFzdEtleSA9IG51bGw7XG4gICAgdGhpcy56c2ggPSB6c2g7XG5cbiAgICB0aGlzLmZ1bGxIaXN0b3J5ID0gKFtMb2NhbFN0b3JhZ2UuZ2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZKV0gKyAnJykuc3BsaXQoSElTVE9SWV9TRVBBUkFUT1IpLmZpbHRlcihTdHJpbmcpO1xuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoMCkgfHwgW107XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXG4gICAgdGhpcy5jcmVhdGVDYXJldCgpO1xuICAgIHpzaC5zdGRpbi5vbignZGF0YScsIChldmVudCkgPT4gdGhpcy5wYXJzZShldmVudCkpO1xuICB9XG5cbiAgY3JlYXRlQ2FyZXQoKSB7XG4gICAgdGhpcy5jYXJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB0aGlzLmNhcmV0LmNsYXNzTmFtZSA9ICdjYXJldCc7XG4gIH1cblxuICBvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAoKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkpLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgdXNlKHNwYW4pIHtcbiAgICB0aGlzLnNwYW4gJiYgdGhpcy5yZW1vdmVDYXJldCgpO1xuICAgIHRoaXMuc3BhbiA9IHNwYW47XG4gICAgdGhpcy53cml0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcGFyc2UoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQubWV0YUtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICBjYXNlIExFRlQ6XG4gICAgICBjYXNlIFJJR0hUOlxuICAgICAgICB0aGlzLm1vdmVDYXJldChldmVudC5rZXlDb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFVQOlxuICAgICAgY2FzZSBET1dOOlxuICAgICAgICB0aGlzLm5hdmlnYXRlSGlzdG9yeShldmVudC5rZXlDb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRBQjpcbiAgICAgICAgdGhpcy5hdXRvY29tcGxldGUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEVOVEVSOlxuICAgICAgICB0aGlzLnN1Ym1pdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQkFDS1NQQUNFOlxuICAgICAgICB0aGlzLmJhY2tzcGFjZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChldmVudC5jdHJsS2V5KSB7XG4gICAgICAgICAgdGhpcy5hY3Rpb24oZXZlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1vdmVDYXJldChkaXJlY3Rpb24pIHtcbiAgICBpZiAoZGlyZWN0aW9uID09PSBMRUZUKSB7XG4gICAgICB0aGlzLmluZGV4ID0gTWF0aC5tYXgodGhpcy5pbmRleCAtIDEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluZGV4ID0gTWF0aC5taW4odGhpcy5pbmRleCArIDEsIHRoaXMuaW5wdXQubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIGF1dG9jb21wbGV0ZSgpIHtcbiAgICB2YXIgb3B0aW9ucztcbiAgICB2YXIgcGF0aCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuY29tbWFuZCgpID09PSB0aGlzLmlucHV0KSB7XG4gICAgICBvcHRpb25zID0gdGhpcy56c2guQ29tbWFuZE1hbmFnZXIuYXV0b2NvbXBsZXRlKHRoaXMuY29tbWFuZCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5wb3AoKTtcbiAgICAgIG9wdGlvbnMgPSBGUy5hdXRvY29tcGxldGUocGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAocGF0aCAhPT0gZmFsc2UpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgcGF0aC5wb3AoKTtcbiAgICAgICAgcGF0aC5wdXNoKCcnKTtcblxuICAgICAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5yZXBsYWNlKC8gW14gXSokLywgJyAnICsgcGF0aC5qb2luKCcvJykgKyBvcHRpb25zLnNoaWZ0KCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnB1dCA9IG9wdGlvbnMuc2hpZnQoKSArICcgJztcbiAgICAgIH1cblxuICAgICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5sZW5ndGgpe1xuICAgICAgdGhpcy56c2guc3Rkb3V0LndyaXRlKG9wdGlvbnMuam9pbignICcpKTtcbiAgICAgIHRoaXMuenNoLnByb21wdCgpO1xuICAgIH1cbiAgfVxuXG4gIG5hdmlnYXRlSGlzdG9yeShkaXJlY3Rpb24pIHtcbiAgICBpZiAoZGlyZWN0aW9uID09PSBVUCkge1xuICAgICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1heCh0aGlzLmhpc3RvcnlJbmRleCAtIDEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhpc3RvcnlJbmRleCA9IE1hdGgubWluKHRoaXMuaGlzdG9yeUluZGV4ICsgMSwgdGhpcy5oaXN0b3J5Lmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIHRoaXMuaW5wdXQgPSB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdIHx8ICcnO1xuICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBzdWJtaXQocHJldmVudFdyaXRlKSB7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuXG4gICAgaWYgKCFwcmV2ZW50V3JpdGUpIHtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLmlucHV0LnRyaW0oKTtcblxuICAgIGlmIChpbnB1dCAmJiBpbnB1dCAhPT0gdGhpcy5mdWxsSGlzdG9yeVt0aGlzLmZ1bGxIaXN0b3J5Lmxlbmd0aCAtIDFdKSB7XG4gICAgICB0aGlzLmZ1bGxIaXN0b3J5W3RoaXMuZnVsbEhpc3RvcnkubGVuZ3RoXSA9IGlucHV0O1xuICAgICAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oSElTVE9SWV9TVE9SQUdFX0tFWSwgdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgtSElTVE9SWV9TSVpFKS5qb2luKEhJU1RPUllfU0VQQVJBVE9SKSk7XG4gICAgfVxuXG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgwKTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICBpZiAoaW5wdXQpIHtcbiAgICAgIHRoaXMuenNoLkNvbW1hbmRNYW5hZ2VyLnBhcnNlKFxuICAgICAgICBpbnB1dCxcbiAgICAgICAgdGhpcy56c2guc3RkaW4sXG4gICAgICAgIHRoaXMuenNoLnN0ZG91dCxcbiAgICAgICAgdGhpcy56c2guc3RkZXJyLFxuICAgICAgICB0aGlzLnpzaC5wcm9tcHQuYmluZCh0aGlzLnpzaClcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuenNoLnByb21wdCgpO1xuICAgIH1cbiAgfVxuXG4gIHRyaWdnZXIoZXZ0LCBtc2cpIHtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5saXN0ZW5lcnNbZXZ0XSB8fCBbXTtcblxuICAgIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sobXNnKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlbW92ZUNhcmV0KCkge1xuICAgIHZhciBjYXJldCA9IHRoaXMuc3Bhbi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYXJldCcpO1xuXG4gICAgaWYgKGNhcmV0ICYmIGNhcmV0WzBdKSB7XG4gICAgICBjYXJldFswXS5yZW1vdmUoKTtcbiAgICB9XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLmlucHV0ID0gJyc7XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gIH1cblxuICBiYWNrc3BhY2UoKSB7XG4gICAgaWYgKHRoaXMuaW5kZXggPiAwKSB7XG4gICAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCAtIDEpICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgICB0aGlzLmluZGV4LS07XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfVxuICB9XG5cbiAgYWN0dWFsQ2hhckNvZGUoZXZlbnQpIHtcbiAgICB2YXIgb3B0aW9ucztcbiAgICB2YXIgY29kZSA9IGV2ZW50LmtleUNvZGU7XG5cbiAgICBjb2RlID0ge1xuICAgICAgMTczOiAxODlcbiAgICB9W2NvZGVdIHx8IGNvZGU7XG5cbiAgICBpZiAoY29kZSA+PSA2NSAmJiBjb2RlIDw9IDkwKSB7XG4gICAgICBpZiAoIWV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gMzI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHtcbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlID0gJykhQCMkJV4mKignLmNoYXJDb2RlQXQoY29kZSAtIDQ4KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gMTg2ICYmIGNvZGUgPD0gMTkyKXtcbiAgICAgIG9wdGlvbnMgPSAnOz0sLS4vYDorPF8+P34nO1xuXG4gICAgICBjb2RlIC09IDE4NjtcblxuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gb3B0aW9ucy5sZW5ndGggLyAyO1xuICAgICAgfVxuXG4gICAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICAgIH0gZWxzZSBpZiAoY29kZSA+PSAyMTkgJiYgY29kZSA8PSAyMjIpIHtcbiAgICAgIG9wdGlvbnMgPSAnW1xcXFxdXFwne3x9XCInO1xuICAgICAgY29kZSAtPSAyMTk7XG5cbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICAgIH1cblxuICAgICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgICB9IGVsc2UgaWYgKGNvZGUgIT09IFNQQUNFKSB7XG4gICAgICBjb2RlID0gLTE7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBhY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC5rZXlDb2RlKSA9PT0gJ0MnKSB7XG4gICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgICB0aGlzLmlucHV0ID0gJyc7XG4gICAgICB0aGlzLnN1Ym1pdCh0cnVlKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoZXZlbnQpIHtcbiAgICB2YXIgY29kZSA9IHRoaXMuYWN0dWFsQ2hhckNvZGUoZXZlbnQpO1xuXG4gICAgaWYgKCF+Y29kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjaGFyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcblxuICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnN1YnN0cigwLCB0aGlzLmluZGV4KSArIGNoYXIgKyB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmluZGV4KTtcbiAgICB0aGlzLmluZGV4Kys7XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgY29tbWFuZCgpIHtcbiAgICBpZiAodGhpcy5pbnB1dCAhPT0gdGhpcy5fX2lucHV0Q29tbWFuZCkge1xuICAgICAgdGhpcy5fX2lucHV0Q29tbWFuZCA9IHRoaXMuaW5wdXQ7XG4gICAgICB0aGlzLl9fY29tbWFuZCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5zaGlmdCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9fY29tbWFuZDtcbiAgfVxuXG4gIGNvbW1hbmRBcmdzU3RyaW5nKCkge1xuICAgIGlmICh0aGlzLmlucHV0ICE9PSB0aGlzLl9faW5wdXRDQXJncykge1xuICAgICAgdGhpcy5fX2lucHV0Q0FyZ3MgPSB0aGlzLmlucHV0O1xuICAgICAgdGhpcy5fX2NhcmdzID0gdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5jb21tYW5kKCkubGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fX2NhcmdzO1xuICB9XG5cbiAgd3JpdGUoKSB7XG4gICAgdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSA9IHRoaXMuaW5wdXQ7XG4gICAgdGhpcy5jYXJldC5pbm5lckhUTUwgPSB0aGlzLmlucHV0W3RoaXMuaW5kZXhdIHx8ICcnO1xuXG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvbW1hbmQgPSB0aGlzLmNvbW1hbmQoKTtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLmNvbW1hbmRBcmdzU3RyaW5nKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHB1dENhcmV0ID0gZnVuY3Rpb24gKHN0ciwgaW5kZXgpIHtcbiAgICAgIHNlbGYuY2FyZXQuaW5uZXJUZXh0ID0gc3RyW2luZGV4XSB8fCAnICc7XG4gICAgICByZXR1cm4gc3RyLnN1YnN0cigwLCBpbmRleCkgKyBzZWxmLmNhcmV0Lm91dGVySFRNTCArIHN0ci5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICB9O1xuXG4gICAgc3Bhbi5jbGFzc05hbWUgPSB0aGlzLnpzaC5Db21tYW5kTWFuYWdlci5pc1ZhbGlkKGNvbW1hbmQpID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJztcblxuICAgIGlmICh0aGlzLmluZGV4IDwgY29tbWFuZC5sZW5ndGgpIHtcbiAgICAgIGNvbW1hbmQgPSBwdXRDYXJldChjb21tYW5kLCB0aGlzLmluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5wdXQgPSBwdXRDYXJldChpbnB1dCwgdGhpcy5pbmRleCAtIGNvbW1hbmQubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBzcGFuLmlubmVySFRNTCA9IGNvbW1hbmQ7XG4gICAgdGhpcy5zcGFuLmlubmVySFRNTCA9IHNwYW4ub3V0ZXJIVE1MICsgaW5wdXQ7XG4gIH1cbn1cbiIsInZhciBBcmdzUGFyc2VyID0ge307XG5cbkFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzID0gZnVuY3Rpb24ocmF3U3RyaW5nKSB7XG4gIHZhciBfYXJncyA9IFtdO1xuICB2YXIgd29yZCA9ICcnO1xuICB2YXIgc3RyaW5nID0gZmFsc2U7XG4gIHZhciBpLCBsO1xuXG4gIGZvciAoaSA9IDAsIGwgPSByYXdTdHJpbmcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNoYXIgPSByYXdTdHJpbmdbaV07XG4gICAgaWYgKGNoYXIgPT09ICdcIicgfHwgY2hhciA9PT0gJ1xcJycpIHtcbiAgICAgIGlmIChzdHJpbmcpIHtcbiAgICAgICAgaWYgKGNoYXIgPT09IHN0cmluZykge1xuICAgICAgICAgIGlmIChyYXdTdHJpbmdbaSAtIDFdID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgIHdvcmQgPSB3b3JkLnNsaWNlKDAsIC0xKSArIGNoYXI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9hcmdzLnB1c2god29yZCk7XG4gICAgICAgICAgICB3b3JkID0gJyc7XG4gICAgICAgICAgICBzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3b3JkICs9IGNoYXI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0cmluZyA9IGNoYXI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjaGFyID09PSAnICcgJiYgIXN0cmluZykge1xuICAgICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgICAgIHdvcmQgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgd29yZCArPSBjaGFyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdHJpbmcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VudGVybWluYXRlZCBzdHJpbmcnKTtcbiAgfSBlbHNlIGlmICh3b3JkKSB7XG4gICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgfVxuXG4gIHJldHVybiBfYXJncztcbn07XG5cbkFyZ3NQYXJzZXIucGFyc2UgPSBmdW5jdGlvbiAoYXJncykge1xuICBhcmdzID0gKFthcmdzXSArICcnKS50cmltKCk7XG5cbiAgdmFyIG91dCA9IHtcbiAgICBhcmd1bWVudHM6IFtdLFxuICAgIG9wdGlvbnM6IHt9LFxuICAgIHJhdzogYXJnc1xuICB9O1xuXG4gIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyhhcmdzKTtcblxuICBmdW5jdGlvbiBhZGRPcHRpb24ob3B0aW9uLCB2YWx1ZSkge1xuICAgIG91dC5vcHRpb25zW29wdGlvbl0gPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiB0cnVlO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKCFhcmcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3Vic3RyKDAsIDIpID09PSAnLS0nKSB7XG4gICAgICB2YXIgbmV4dCA9IGFyZ3NbaSArIDFdO1xuICAgICAgaWYgKG5leHQgJiYgbmV4dFswXSAhPT0gJy0nKSB7XG4gICAgICAgIGFkZE9wdGlvbihhcmcuc3Vic3RyKDIpLCBuZXh0KTtcbiAgICAgICAgaSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnWzBdID09PSAnLScpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChhcmcuc3Vic3RyKDEpLCBhZGRPcHRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYXJndW1lbnRzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQXJnc1BhcnNlcjtcbiIsIi8qZXNsaW50IG5vLWV2YWw6IDAqL1xuaW1wb3J0IEFyZ3NQYXJzZXIgZnJvbSAnLi9hcmdzLXBhcnNlcic7XG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5pbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xuaW1wb3J0IFN0cmVhbSBmcm9tICcuL3N0cmVhbSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbW1hbmRNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IoenNoKSB7XG4gICAgdGhpcy5jb21tYW5kcyA9IHt9O1xuICAgIHRoaXMuYWxpYXNlcyA9IHt9O1xuICAgIHRoaXMuenNoID0genNoO1xuICB9XG5cbiAgZXhpc3RzKGNtZCkge1xuICAgIHZhciBwYXRoID0gRmlsZS5vcGVuKCcvdXNyL2JpbicpO1xuICAgIHJldHVybiBwYXRoLm9wZW4oY21kICsgJy5qcycpLmlzRmlsZSgpO1xuICB9XG5cbiAgaW1wb3J0KG9yaWdpbmFsRmlsZSkge1xuICAgIHZhciBmaWxlID0gb3JpZ2luYWxGaWxlLnRvTG93ZXJDYXNlKCk7XG4gICAgc3dpdGNoIChmaWxlKSB7XG4gICAgICBjYXNlICcuL3pzaCc6XG4gICAgICAgIHJldHVybiAnc2VsZi56c2gnO1xuICAgICAgY2FzZSAnLi9yZXBsJzpcbiAgICAgICAgcmV0dXJuICdzZWxmLnpzaC5yZXBsJztcbiAgICAgIGNhc2UgJy4vY29tbWFuZC1tYW5hZ2VyJzpcbiAgICAgICAgcmV0dXJuICdzZWxmJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBgcmVxdWlyZSgnJHtvcmlnaW5hbEZpbGV9JylgO1xuICAgIH1cbiAgfVxuXG4gIGxvYWQoY21kKSB7XG4gICAgdmFyIHBhdGggPSBGaWxlLm9wZW4oJy91c3IvYmluJyk7XG4gICAgdmFyIHNvdXJjZSA9IHBhdGgub3BlbihjbWQgKyAnLmpzJyk7XG4gICAgdmFyIGZuO1xuICAgIGlmIChzb3VyY2UuaXNGaWxlKCkpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZWFkKCk7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvXmltcG9ydCArKFtBLVphLXpdKykgK2Zyb20gKycoWy4vXFwtX0EtWmEtel0rKScvZ20sIChtYXRjaCwgdmFyaWFibGUsIGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIGB2YXIgJHt2YXJpYWJsZX0gPSAke3RoaXMuaW1wb3J0KGZpbGUpfWA7XG4gICAgICB9KTtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKCdleHBvcnQgZGVmYXVsdCcsICd2YXIgX19kZWZhdWx0X18gPScpO1xuICAgICAgZm4gPSBldmFsKCcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlICsgJzsgcmV0dXJuIF9fZGVmYXVsdF9fO30pJykoKTtcbiAgICB9XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgaXNWYWxpZChjbWQpIHtcbiAgICByZXR1cm4gISEodGhpcy5jb21tYW5kc1tjbWRdIHx8IHRoaXMuYWxpYXNlc1tjbWRdIHx8IHRoaXMuZXhpc3RzKGNtZCkpO1xuICB9XG5cbiAgYXV0b2NvbXBsZXRlKGNtZCkge1xuICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgY21kID0gY21kLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAoT2JqZWN0LmtleXModGhpcy5jb21tYW5kcykuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuYWxpYXNlcykpKS5mb3JFYWNoKGZ1bmN0aW9uIChjb21tYW5kKSB7XG4gICAgICBpZiAoY29tbWFuZC5zdWJzdHIoMCwgY21kLmxlbmd0aCkudG9Mb3dlckNhc2UoKSA9PT0gY21kKSB7XG4gICAgICAgIG1hdGNoZXMucHVzaChjb21tYW5kKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtYXRjaGVzO1xuICB9XG5cbiAgcGFyc2UoY21kLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgICBpZiAofmNtZC5pbmRleE9mKCd8JykpIHtcbiAgICAgIGNtZCA9IGNtZC5zcGxpdCgnfCcpO1xuICAgICAgY21kLmZvckVhY2godGhpcy5wYXJzZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBjbWQgPSBjbWQuc3BsaXQoJyAnKTtcbiAgICB2YXIgY29tbWFuZCA9IGNtZC5zaGlmdCgpO1xuICAgIHZhciBhcmdzID0gY21kLmpvaW4oJyAnKTtcblxuICAgIHZhciBpbmRleDtcblxuICAgIGlmICh+KGluZGV4ID0gYXJncy5pbmRleE9mKCc+JykpKSB7XG4gICAgICB2YXIgcHJldiA9IGFyZ3NbaW5kZXggLSAxXTtcbiAgICAgIHZhciBhcHBlbmQgPSBhcmdzW2luZGV4ICsgMV0gPT09ICc+JztcbiAgICAgIHZhciBpbml0ID0gaW5kZXg7XG5cbiAgICAgIGlmICh+KFsnMScsICcyJywgJyYnXSkuaW5kZXhPZihwcmV2KSkge1xuICAgICAgICBpbml0LS07XG4gICAgICB9XG5cbiAgICAgIHZhciBfYXJncyA9IGFyZ3Muc3Vic3RyKDAsIGluaXQpO1xuICAgICAgYXJncyA9IGFyZ3Muc3Vic3RyKGluZGV4ICsgYXBwZW5kICsgMSkuc3BsaXQoJyAnKS5maWx0ZXIoU3RyaW5nKTtcbiAgICAgIHZhciBwYXRoID0gYXJncy5zaGlmdCgpO1xuICAgICAgYXJncyA9IF9hcmdzICsgYXJncy5qb2luKCcgJyk7XG5cbiAgICAgIGlmICghcGF0aCkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogcGFyc2UgZXJyb3IgbmVhciBgXFxcXG5cXCcnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcblxuICAgICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vdCBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBpcyBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhcHBlbmQpIHtcbiAgICAgICAgZmlsZS5jbGVhcigpO1xuICAgICAgfVxuXG4gICAgICB2YXIgX3N0ZG91dCA9IG5ldyBTdHJlYW0oKTtcbiAgICAgIF9zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIGZpbGUud3JpdGUoZGF0YSArICdcXG4nLCB0cnVlLCB0cnVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocHJldiAhPT0gJzInKSB7XG4gICAgICAgIHN0ZG91dCA9IF9zdGRvdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcmV2ID09PSAnMicgfHwgcHJldiA9PT0gJyYnKSB7XG4gICAgICAgIHN0ZGVyciA9IF9zdGRvdXQ7XG4gICAgICB9XG5cbiAgICAgIHZhciBfbmV4dCA9IG5leHQ7XG4gICAgICBuZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBGUy53cml0ZUZTKCk7XG4gICAgICAgIF9uZXh0KCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuZXhlYyhjb21tYW5kLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICB9XG5cbiAgZXhlYyhjbWQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xuICAgIGlmICh0aGlzLmFsaWFzZXNbY21kXSkge1xuICAgICAgdmFyIGxpbmUgPSAodGhpcy5hbGlhc2VzW2NtZF0gKyAnICcgKyBhcmdzKS50cmltKCkuc3BsaXQoJyAnKTtcbiAgICAgIHRoaXMuZXhlYyhsaW5lLnNoaWZ0KCksIGxpbmUuam9pbignICcpLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmbjtcbiAgICBpZiAodHlwZW9mIHRoaXMuY29tbWFuZHNbY21kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZm4gPSB0aGlzLmNvbW1hbmRzW2NtZF07XG4gICAgfSBlbHNlIGlmICgoZm4gPSB0aGlzLmxvYWQoY21kKSkpIHtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RkZXJyLndyaXRlKCd6c2g6IGNvbW1hbmQgbm90IGZvdW5kOiAnICsgY21kKTtcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXJncyA9IEFyZ3NQYXJzZXIucGFyc2UoYXJncyk7XG4gICAgICBmbi5jYWxsKHVuZGVmaW5lZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHN0ZGVyci53cml0ZShlcnIuc3RhY2spO1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyKGNtZCwgZm4pIHtcbiAgICB0aGlzLmNvbW1hbmRzW2NtZF0gPSBmbjtcbiAgfVxuXG4gIGFsaWFzKGNtZCwgb3JpZ2luYWwpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuYWxpYXNlcztcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VzW2NtZF0gPSBvcmlnaW5hbDtcbiAgfVxuXG4gIHVuYWxpYXMoY21kKSB7XG4gICAgZGVsZXRlIHRoaXMuYWxpYXNlc1tjbWRdO1xuICB9XG5cbiAgZ2V0KGNtZCkge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmRzW2NtZF07XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHpzaCA9IHJlcXVpcmUoJy4venNoJyk7XG5cbnZhciBDb25zb2xlID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gQ29uc29sZShzdGRvdXQsIHN0ZGVycikge1xuICAgIHRoaXMuc3Rkb3V0ID0gc3Rkb3V0O1xuICAgIHRoaXMuc3RkZXJyID0gc3RkZXJyO1xuICAgIHRoaXMuZXh0ZXJuYWwgPSB0eXBlb2YgY29uc29sZSA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvdy5jb25zb2xlO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RyaW5naWZ5KGFyZ3MpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoYXJncywgZnVuY3Rpb24gKGEpIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhKSB8fCBbYV0rJyc7XG4gICAgfSkuam9pbignICcpO1xuICB9XG5cbiAgQ29uc29sZS5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3Rkb3V0LndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfTtcblxuICBDb25zb2xlLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnN0ZGVyci53cml0ZShzdHJpbmdpZnkoYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgQ29uc29sZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgenNoLmNsZWFyKCk7XG4gIH07XG5cbiAgcmV0dXJuIENvbnNvbGU7XG59KSgpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gIFwiY29udGVudFwiOiB7XG4gICAgXCJVc2Vyc1wiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImd1ZXN0XCI6IHtcbiAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgICAgICBcIi52aW1yY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIuenNocmNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiYWJvdXQubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyB0YWRldXphZ2FsbG8uY29tXFxuXFxuKiBBYm91dCBtZVxcbiAgSSdtIGEgRnVsbCBTdGFjayBEZXZlbG9wZXIsIEpTIFBhc3Npb25hdGUsIFJ1YnkgRmFuLCBDKysgU29tZXRoaW5nLCBHYW1lIERldmVsb3BtZW50IEVudGh1c2lhc3QsXFxuICBBbHdheXMgd2lsbGluZyB0byBjb250cmlidXRlIHRvIG9wZW4gc291cmNlIHByb2plY3RzIGFuZCB0cnlpbmcgdG8gbGVhcm4gc29tZSBtb3JlIG1hdGguXFxuXFxuKiBBYm91dCB0aGlzIHdlYnNpdGVcXG4gIEkgd2FudGVkIG1vcmUgdGhhbiBqdXN0IHNob3cgbXkgd29yaywgSSB3YW50ZWQgdG8gc2hvdyBteSB3b3JrIGVudmlyb25tZW50LlxcbiAgU2luY2UgSSBkbyBzb21lIG1vYmlsZSBkZXZlbG9wbWVudCBhcyB3ZWxsICBJIGFsc28gdXNlIChzYWRseSkgc29tZSBJREVzLCBidXQgYWx3YXlzIHRyeWluZ1xcbiAgdG8gZG8gYXMgbXVjaCBhcyBJIGNhbiBvbiB0aGlzIHRlcm1pbmFsLCBzbyBJIG1hZGUgYSB2ZXJ5IHNpbWlsYXIgY29weSAoYXQgbGVhc3QgdmlzdWFsbHkpXFxuICBvZiBpdCBzbyBwZW9wbGUgY291bGQgZ2V0IHRvIHNlZSB3aGF0IEkgZG8gYW5kIGhvdyBJICh1c3VhbGx5KSBkby5cXG5cXG4qIENvbW1hbmRzXFxuICBJZiB5b3Ugd2FudCB0byBrbm93IG1vcmUgYWJvdXQgbWUsIHRoZXJlIGFyZSBhIGZldyBjb21tYW5kczpcXG4gICAgKiBhYm91dCAgKGN1cnJlbnRseSBydW5uaW5nKVxcbiAgICAqIGNvbnRhY3QgXFxuICAgICogcmVzdW1lXFxuICAgICogcHJvamVjdHNcXG5cXG4gIElmIHlvdSBuZWVkIHNvbWUgaGVscCBhYm91dCB0aGUgdGVybWluYWwsIG9yIHdhbnQgdG8ga25vdyB3aGF0IGZ1bmN0aW9uYWxpdGllcyBhcmUgY3VycnJlbnRseSBpbXBsZW1lbnRlZCwgdHlwZSBgaGVscGAgYW55IHRpbWUuXFxuXFxuSG9wZSB5b3UgaGF2ZSBhcyBtdWNoIGZ1biBhcyBJIGhhZCBkb2luZyBpdCA6KVxcblxcblRhZGV1IFphZ2FsbG9cXG4gICAgICBcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjb250YWN0Lm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgQWxsIG15IGNvbnRhY3RzLCBmZWVsIGZyZWUgdG8gcmVhY2ggbWUgYXQgYW55IG9mIHRoZXNlXFxuXFxuKiA8YSBocmVmPVxcXCJtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcXCIgYWx0PVxcXCJFbWFpbFxcXCI+W0VtYWlsXShtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbSk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2dpdGh1Yi5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkdpdEh1YlxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltHaXRIdWJdKGh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly90d2l0dGVyLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiVHdpdHRlclxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltUd2l0dGVyXShodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2ZhY2Vib29rLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiRmFjZWJvb2tcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bRmFjZWJvb2tdKGh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvXFxcIiBhbHQ9XFxcIkdvb2dsZSArXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dvb2dsZSArXShodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTlcXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bTGlua2VkaW5dKGh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTkpPC9hPlxcbiogPGEgaHJlZj1cXFwic2t5cGU6Ly90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiPltTa3lwZV0oc2t5cGU6Ly90YWRldXphZ2FsbG8pPC9hPlxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInByb2plY3RzLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIkZvciBub3cgeW91IGNhbiBoYXZlIGEgbG9vayBhdCB0aGlzIG9uZSEgOilcXG4oVGhhdCdzIHdoYXQgSSdtIGRvaW5nKVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlYWRtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJmb28gYmFyIGJhelxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlc3VtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIFRhZGV1IFphZ2FsbG8gZGEgU2lsdmFcXG4tLS1cXG5cXG4jIyBQcm9maWxlXFxuLS0tIFxcbiAgSSBhbSBwYXNzaW9uYXRlIGZvciBhbGwga2luZHMgb2YgZGV2ZWxvcG1lbnQsIGxvdmUgdG8gbGVhcm4gbmV3IGxhbmd1YWdlcyBhbmQgcGFyYWRpZ21zLCBhbHdheXMgcmVhZHkgZm9yIGEgZ29vZCBjaGFsbGVuZ2UuXFxuICBJIGFsc28gbGlrZSBNYXRoLCBHYW1lIGRldmVsb3BtZW50IGFuZCB3aGVuIHBvc3NpYmxlIGNvbnRyaWJ1dGUgdG8gb3BlbiBzb3VyY2UgcHJvamVjdHMuXFxuXFxuIyMgR2VuZXJhbCBJbmZvcm1hdGlvblxcbi0tLVxcbiAgKiBFbWFpbDogdGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcbiAgKiBQaG9uZTogKzU1IDMyIDg4NjMgMzY4NFxcbiAgKiBTa3lwZTogdGFkZXV6YWdhbGxvXFxuICAqIEdpdGh1YjogZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXG4gICogTG9jYXRpb246IEp1aXogZGUgRm9yYS9NRywgQnJhemlsXFxuXFxuIyMgRWR1Y2F0aW9uYWwgQmFja2dyb3VuZFxcbi0tLVxcblxcbiAgKiBXZWIgRGV2ZWxvcG1lbnQgYXQgSW5zdGl0dXRvIFZpYW5uYSBKdW5pb3IsIDIwMTBcXG4gICogR2VuZXJhbCBFbmdsaXNoIGF0IFRoZSBDYXJseWxlIEluc3RpdHV0ZSwgMjAxMVxcblxcbiMgV29yayBFeHBlcmllbmNlXFxuLS0tXFxuXFxuICAqIDxpPippT1MgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KlFyYW5pbyo8L2k+IGZyb20gPGk+KkRlY2VtYmVyLCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIFFyYW5pbyBpcyBhIHN0YXJ0dXAgdGhhdCBncmV3IGluc2lkZSB0aGUgY29tcGFueSBJIHdvcmsgKGVNaW9sby5jb20pIGFuZCBJIHdhcyBpbnZpdGVkIHRvIGxlYWQgdGhlIGlPUyBkZXZlbG9wbWVudCB0ZWFtXFxuICAgICAgb24gYSBjb21wbGV0ZWx5IHJld3JpdGVuIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KkJvbnV6KjwvaT4gZnJvbSA8aT4qRmVicnVhcnksIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gSSBzdGFydGVkIGRldmVsb3BpbmcgdGhlIGlPUyBhcHAgYXMgYSBmcmVlbGFuY2VyLCBhZnRlciB0aGUgYXBwIHdhcyBwdWJsaXNoZWQgSSB3YXMgaW52aXRlZCB0byBtYWludGFpbiB0aGUgUnVieSBvbiBSYWlsc1xcbiAgICAgIGFwaSBhbmQgd29yayBvbiB0aGUgQW5kcm9pZCB2ZXJzaW9uIG9mIHRoZSBhcHBcXG5cXG4gICogPGk+KldlYiBhbmQgTW9iaWxlIERldmVsb3Blcio8L2k+IGF0IDxpPiplTWlvbG8uY29tKjwvaT4gZnJvbSA8aT4qQXByaWwsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gVGhlIGNvbXBhbnkganVzdCB3b3JrZWQgd2l0aCBQSFAsIHNvIEkgam9pbmVkIHdpdGggdGhlIGludGVudGlvbiBvZiBicmluZ2luZyBuZXcgdGVjaG5vbG9naWVzLiBXb3JrZWQgd2l0aCBQeXRob24sIFJ1YnksIGlPUyxcXG4gICAgICBBbmRyb2lkIGFuZCBIVE1MNSBhcHBsaWNhdGlvbnNcXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUHJvRG9jdG9yIFNvZnR3YXJlIEx0ZGEuKjwvaT4gZnJvbSA8aT4qSnVseSwgMjAxMio8L2k+IHVudGlsIDxpPipPY3RvYmVyLCAyMDEyKjwvaT5cXG4gICAgLSBCcmllZmx5IHdvcmtlZCB3aXRoIHRoZSBpT1MgdGVhbSBvbiB0aGUgZGV2ZWxvcG1lbnQgb2YgdGhlaXIgZmlyc3QgbW9iaWxlIHZlcnNpb24gb2YgdGhlaXIgbWFpbiBwcm9kdWN0LCBhIG1lZGljYWwgc29mdHdhcmVcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQXRvIEludGVyYXRpdm8qPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMio8L2k+IHVudGlsIDxpPipKdWx5LCAyMDEyKjwvaT5cXG4gICAgLSBNb3N0IG9mIHRoZSB3b3JrIHdhcyB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gd29ya2luZyB3aXRoIEphdmFTY3JpcHQgb24gdGhlIGNsaWVudCBzaWRlLiBXb3JrZWQgd2l0aCBNU1NRTFxcbiAgICAgIGFuZCBPcmFjbGUgZGF0YWJhc2VzIGFzIHdlbGxcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qTWFyaWEgRnVtYWPMp2EgQ3JpYWPMp2/Mg2VzKjwvaT4gZnJvbSA8aT4qT2N0b2JlciwgMjAxMCo8L2k+IHVudGlsIDxpPipKdW5lLCAyMDExKjwvaT5cXG4gICAgLSBJIHdvcmtlZCBtb3N0bHkgd2l0aCBQSFAgYW5kIE15U1FMLCBhbHNvIG1ha2luZyB0aGUgZnJvbnQgZW5kIHdpdGggSFRNTCBhbmQgQ1NTIGFuZCBtb3N0IGFuaW1hdGlvbnMgaW4gSmF2YVNjcmlwdCxcXG4gICAgICBhbHRob3VnaCBJIGFsc28gd29ya2VkIHdpdGggYSBmZXcgaW4gQVMzLiBCcmllZmx5IHdvcmtlZCB3aXRoIE1vbmdvREJcXG5cXG4jIyBBZGRpdGlvbmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuXFxuKiBFeHBlcmllbmNlIHVuZGVyIExpbnV4IGFuZCBPUyBYIGVudmlyb25tZW50XFxuKiBTdHVkZW50IEV4Y2hhbmdlOiA2IG1vbnRocyBvZiByZXNpZGVuY2UgaW4gSXJlbGFuZFxcblxcbiMjIExhbmd1YWdlc1xcbi0tLVxcblxcbiogUG9ydHVndWVzZSDigJMgTmF0aXZlIFNwZWFrZXJcXG4qIEVuZ2xpc2gg4oCTIEZsdWVudCBMZXZlbFxcbiogU3BhbmlzaCDigJMgSW50ZXJtZWRpYXRlIExldmVsXFxuXFxuIyMgUHJvZ3JhbW1pbmcgbGFuZ3VhZ2VzIChvcmRlcmVkIGJ5IGtub3dsZWRnZSlcXG4tLS1cXG5cXG4qIEphdmFTY3JpcHRcXG4qIE9iamVjdGl2ZcKtQ1xcbiogQy9DKytcXG4qIFJ1Ynkgb24gUmFpbHNcXG4qIE5vZGVKU1xcbiogUEhQXFxuKiBKYXZhXFxuKiBQeXRob25cXG5cXG4jIyBBZGRpdGlvbmFsIHNraWxsc1xcbi0tLVxcblxcbiogSFRNTDUvQ1NTM1xcbiogTVZDXFxuKiBEZXNpZ24gUGF0dGVybnNcXG4qIFRERC9CRERcXG4qIEdpdFxcbiogQW5hbHlzaXMgYW5kIERlc2lnbiBvZiBBbGdvcml0aG1zXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9LFxuICAgIFwidXNyXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1OC4wMDBaXCIsXG4gICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTguMDAwWlwiLFxuICAgICAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgICAgICBcImFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjQ6NDMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNDo0My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgYnVmZmVyID0gJyc7XFxuICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIHZhciBrZXkgPSBhcmdzLmFyZ3VtZW50cy5zaGlmdCgpO1xcbiAgICB2YXIgaW5kZXg7XFxuICAgIGlmICh+KGluZGV4ID0ga2V5LmluZGV4T2YoJz0nKSkpIHtcXG4gICAgICB2YXIgY29tbWFuZDtcXG5cXG4gICAgICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoICYmIGluZGV4ID09PSBrZXkubGVuZ3RoIC0gMSkge1xcbiAgICAgICAgY29tbWFuZCA9IGFyZ3MuYXJndW1lbnRzLmpvaW4oJyAnKTtcXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgY29tbWFuZCA9IGtleS5zdWJzdHIoaW5kZXggKyAxKTtcXG4gICAgICB9XFxuXFxuICAgICAga2V5ID0ga2V5LnN1YnN0cigwLCBpbmRleCk7XFxuXFxuICAgICAgaWYgKGNvbW1hbmQpIHtcXG4gICAgICAgIENvbW1hbmRNYW5hZ2VyLmFsaWFzKGtleSwgY29tbWFuZCk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYWxpYXNlcyA9IENvbW1hbmRNYW5hZ2VyLmFsaWFzKCk7XFxuXFxuICAgIGZvciAodmFyIGkgaW4gYWxpYXNlcykge1xcbiAgICAgIGJ1ZmZlciArPSBpICsgJz1cXFxcJycgKyBhbGlhc2VzW2ldICsgJ1xcXFwnXFxcXG4nO1xcbiAgICB9XFxuICB9XFxuXFxuICBzdGRvdXQud3JpdGUoYnVmZmVyKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2F0LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6MzIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTozMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2NhdCcsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2NhdCcsIHBhdGgsICdJcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZS5yZWFkKCkpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2QuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo0NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjQ0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwYXRoID0gYXJncy5hcmd1bWVudHNbMF0gfHwgJ34nO1xcbiAgdmFyIGRpciA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnY2QnLCBwYXRoKSk7XFxuICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2NkJywgcGF0aCwgJ0lzIGEgZmlsZScpKTtcXG4gIH0gZWxzZSB7XFxuICAgIEZTLmN1cnJlbnRQYXRoID0gZGlyLnBhdGg7XFxuICAgIEZTLmN1cnJlbnREaXIgPSBkaXIuc2VsZigpO1xcbiAgfVxcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJlY2hvLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6NTcuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo1Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBBcmdzUGFyc2VyIGZyb20gJ3pzaC5qcy9hcmdzLXBhcnNlcic7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdHJ5IHtcXG4gICAgc3Rkb3V0LndyaXRlKEFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzKGFyZ3MucmF3KS5qb2luKCcgJykpO1xcbiAgfSBjYXRjaCAoZXJyKSB7XFxuICAgIHN0ZGVyci53cml0ZSgnenNoOiAnICsgZXJyLm1lc3NhZ2UpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJoZWxwLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoxMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5pbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgc3Rkb3V0LndyaXRlKCdyZWdpc3RlcmVkIGNvbW1hbmRzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKENvbW1hbmRNYW5hZ2VyLmNvbW1hbmRzKS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcbiAgc3Rkb3V0LndyaXRlKCdleGVjdXRhYmxlcyAob24gL3Vzci9iaW4pJyk7XFxuICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoRmlsZS5vcGVuKCcvdXNyL2JpbicpLnJlYWQoKSkubWFwKGZ1bmN0aW9uKGZpbGUpIHtcXG4gICAgcmV0dXJuIGZpbGUucmVwbGFjZSgvXFxcXC5qcyQvLCAnJyk7XFxuICB9KS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdhbGlhc2VzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKENvbW1hbmRNYW5hZ2VyLmFsaWFzZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XFxuICAgIHJldHVybiBrZXkgKyAnPVxcXCInICsgQ29tbWFuZE1hbmFnZXIuYWxpYXNlc1trZXldICsgJ1xcXCInO1xcbiAgfSkuam9pbignICcpKTtcXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibHMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoxNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjE2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmICghYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIGFyZ3MuYXJndW1lbnRzLnB1c2goJy4nKTtcXG4gIH1cXG5cXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGFyZykge1xcbiAgICB2YXIgZGlyID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdscycsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbHMnLCBhcmcsICdJcyBhIGZpbGUnKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdmFyIGZpbGVzID0gT2JqZWN0LmtleXMoZGlyLnJlYWQoKSk7XFxuXFxuICAgICAgaWYgKCFhcmdzLm9wdGlvbnMuYSkge1xcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5maWx0ZXIoZnVuY3Rpb24gKGZpbGUpIHtcXG4gICAgICAgICAgcmV0dXJuIGZpbGVbMF0gIT09ICcuJztcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoID4gMSkge1xcbiAgICAgICAgc3Rkb3V0LndyaXRlKGFyZyArICc6Jyk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChhcmdzLm9wdGlvbnMubCkge1xcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcXG4gICAgICAgICAgdmFyIGZpbGUgPSBkaXIub3BlbihuYW1lKTtcXG4gICAgICAgICAgdmFyIHR5cGUgPSBmaWxlLmlzRGlyKCkgPyAnZCcgOiAnLSc7XFxuICAgICAgICAgIHZhciBwZXJtcyA9IHR5cGUgKyAncnctci0tci0tJztcXG5cXG4gICAgICAgICAgcmV0dXJuIHBlcm1zICsgJyBndWVzdCBndWVzdCAnICsgZmlsZS5sZW5ndGgoKSArICcgJyArIGZpbGUubXRpbWUoKSArICcgJyArIG5hbWU7XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgc3Rkb3V0LndyaXRlKGZpbGVzLmpvaW4oYXJncy5vcHRpb25zLmwgPyAnXFxcXG4nIDogJyAnKSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibWtkaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjIwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbWtkaXInLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdta2RpcicsIHBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbWtkaXInLCBwYXRoLCAnRmlsZSBleGlzdHMnKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS5jcmVhdGVGb2xkZXIoKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm12LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjUuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyNS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgdGFyZ2V0UGF0aCA9IGFyZ3MuYXJndW1lbnRzLnBvcCgpO1xcbiAgdmFyIHNvdXJjZVBhdGhzID0gYXJncy5hcmd1bWVudHM7XFxuICB2YXIgdGFyZ2V0ID0gRmlsZS5vcGVuKHRhcmdldFBhdGgpO1xcblxcbiAgaWYgKCF0YXJnZXRQYXRoIHx8XFxuICAgICAgIXNvdXJjZVBhdGhzLmxlbmd0aCB8fFxcbiAgICAgICAgKHNvdXJjZVBhdGhzLmxlbmd0aCA+IDEgJiZcXG4gICAgICAgICAoIXRhcmdldC5leGlzdHMoKSB8fCB0YXJnZXQuaXNGaWxlKCkpXFxuICAgICAgICApXFxuICAgICApIHtcXG4gICAgc3RkZXJyLndyaXRlKCd1c2FnZTogbXYgc291cmNlIHRhcmdldFxcXFxuIFxcXFx0IG12IHNvdXJjZSAuLi4gZGlyZWN0b3J5Jyk7XFxuICB9IGVsc2UgaWYgKCF0YXJnZXQucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212JywgdGFyZ2V0LmRpcm5hbWUpKTtcXG4gIH0gZWxzZSB7XFxuICAgIHZhciBiYWNrdXAgPSB0YXJnZXQuc2VsZigpO1xcbiAgICB2YXIgb2sgPSBzb3VyY2VQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKHN1Y2Nlc3MsIHNvdXJjZVBhdGgpIHtcXG4gICAgICBpZiAoc3VjY2Vzcykge1xcbiAgICAgICAgdmFyIHNvdXJjZSA9IEZpbGUub3Blbihzb3VyY2VQYXRoKTtcXG5cXG4gICAgICAgIGlmICghc291cmNlLmV4aXN0cygpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbXYnLCBzb3VyY2VQYXRoc1swXSkpO1xcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UuaXNEaXIoKSAmJiB0YXJnZXQuaXNGaWxlKCkpIHtcXG4gICAgICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdtdicsICdyZW5hbWUgJyArIHNvdXJjZVBhdGhzWzBdICsgJyB0byAnICsgdGFyZ2V0UGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgIGlmICghdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgICAgdGFyZ2V0LnJlYWQoKVtzb3VyY2UuZmlsZW5hbWVdID0gc291cmNlLnNlbGYoKTtcXG4gICAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgICB0YXJnZXQud3JpdGUoc291cmNlLnJlYWQoKSwgZmFsc2UsIHRydWUpO1xcbiAgICAgICAgICB9XFxuXFxuICAgICAgICAgIHNvdXJjZS5kZWxldGUoKTtcXG4gICAgICAgICAgcmV0dXJuIHRydWU7XFxuICAgICAgICB9XFxuICAgICAgfVxcblxcbiAgICAgIHJldHVybiBmYWxzZTtcXG4gICAgfSwgdHJ1ZSk7XFxuXFxuICAgIGlmIChvaykge1xcbiAgICAgIEZTLndyaXRlRlMoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0YXJnZXQuZGlyW3RhcmdldC5maWxlbmFtZV0gPSBiYWNrdXA7XFxuICAgIH1cXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHdkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwd2QgPSBGUy5jdXJyZW50UGF0aDtcXG5cXG4gIGlmIChzdGRvdXQpIHtcXG4gICAgc3Rkb3V0LndyaXRlKHB3ZCk7XFxuICAgIG5leHQoKTtcXG4gIH0gZWxzZSB7XFxuICAgIHJldHVybiBwd2Q7XFxuICB9XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJtLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjozMy4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybScsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybScsIGFyZywgJ2lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybWRpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjM4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSB8fCAhZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm1kaXInLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybWRpcicsIGFyZywgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic291cmNlLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo0NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIi8qZXNsaW50IG5vLWV2YWw6IDAqL1xcbmltcG9ydCBDb25zb2xlIGZyb20gJ3pzaC5qcy9jb25zb2xlJztcXG5pbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihhcmdzLmFyZ3VtZW50c1swXSk7XFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZSgnc291cmNlOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0cnkge1xcbiAgICAgICAgdmFyIGNvbnNvbGUgPSBuZXcgQ29uc29sZShzdGRvdXQsIHN0ZGVycik7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcXG4gICAgICAgIHZhciByZXN1bHQgPSBKU09OLnN0cmluZ2lmeShldmFsKGZpbGUucmVhZCgpKSk7XFxuICAgICAgICBzdGRvdXQud3JpdGUoJzwtICcgKyByZXN1bHQpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm90IGVub3VnaCBhcmd1bWVudHMnKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwidG91Y2guanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjUzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgndG91Y2gnLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKXtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3RvdWNoJywgcGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLndyaXRlKCcnLCB0cnVlLCB0cnVlKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInVuYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjU4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJ3pzaC5qcy9jb21tYW5kLW1hbmFnZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBjbWQgPSBhcmdzLmFyZ3VtZW50c1swXTtcXG5cXG4gIGlmIChjbWQpIHtcXG4gICAgQ29tbWFuZE1hbmFnZXIudW5hbGlhcyhjbWQpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInR5cGVcIjogXCJkXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH1cbiAgfSxcbiAgXCJ0eXBlXCI6IFwiZFwiXG59IiwiaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuXG5jb25zdCBNT05USFMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbGUge1xuICBjb25zdHJ1Y3RvcihwYXRoKSB7XG4gICAgdGhpcy5wYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgICBwYXRoID0gdGhpcy5wYXRoLnNwbGl0KCcvJyk7XG4gICAgdGhpcy5maWxlbmFtZSA9IHBhdGgucG9wKCk7XG4gICAgdGhpcy5kaXJuYW1lID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgIHRoaXMuZGlyID0gRlMub3Blbih0aGlzLmRpcm5hbWUpO1xuICB9XG5cbiAgc3RhdGljIG9wZW4ocGF0aCkge1xuICAgIHJldHVybiBuZXcgRmlsZShwYXRoKTtcbiAgfVxuXG4gIHN0YXRpYyBnZXRUaW1lc3RhbXAgKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIH1cblxuICBwYXJlbnRFeGlzdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlyICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1ZhbGlkKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5kaXIgPT09ICdvYmplY3QnICYmIHRoaXMuZGlyLnR5cGUgPT09ICdkJztcbiAgfVxuXG4gIGV4aXN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHR5cGVvZiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdICE9PSAndW5kZWZpbmVkJyk7XG4gIH1cblxuICBpc0ZpbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiYgdGhpcy5maWxlbmFtZSAmJlxuICAgICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS50eXBlID09PSAnZic7XG4gIH1cblxuICBpc0RpcigpIHtcbiAgICByZXR1cm4gdGhpcy5leGlzdHMoKSAmJlxuICAgICAgKCF0aGlzLmZpbGVuYW1lIHx8IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2QnKTtcbiAgfVxuXG4gIGRlbGV0ZSgpIHtcbiAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV07XG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfVxuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy53cml0ZSgnJywgZmFsc2UsIHRydWUpO1xuICB9XG5cbiAgd3JpdGUoY29udGVudCwgYXBwZW5kLCBmb3JjZSkge1xuICAgIHZhciB0aW1lID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcblxuICAgIGlmICghdGhpcy5leGlzdHMoKSkge1xuICAgICAgaWYgKGZvcmNlICYmIHRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlRmlsZSh0aW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmaWxlOiAnICsgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLmlzRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB3cml0ZSB0byBkaXJlY3Rvcnk6ICVzJywgdGhpcy5wYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIF9jb250ZW50ID0gJyc7XG4gICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgIF9jb250ZW50ICs9IHRoaXMucmVhZCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRpci5tdGltZSA9IHRpbWU7XG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLm10aW1lID0gdGltZTtcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA9IF9jb250ZW50ICsgY29udGVudDtcbiAgICAgIEZTLndyaXRlRlMoKTtcbiAgICB9XG4gIH1cblxuICByZWFkKCkge1xuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5jb250ZW50IDogdGhpcy5kaXIuY29udGVudDtcbiAgfVxuXG4gIF9jcmVhdGUodHlwZSwgY29udGVudCwgdGltZXN0YW1wKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSAlcyBhbHJlYWR5IGV4aXN0cycsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aW1lc3RhbXApIHtcbiAgICAgIHRpbWVzdGFtcCA9IEZpbGUuZ2V0VGltZXN0YW1wKCk7XG4gICAgfVxuXG4gICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXSA9IHtcbiAgICAgIGN0aW1lOiB0aW1lc3RhbXAsXG4gICAgICBtdGltZTogdGltZXN0YW1wLFxuICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgIHR5cGU6IHR5cGVcbiAgICB9O1xuXG4gICAgRlMud3JpdGVGUygpO1xuICB9XG5cbiAgY3JlYXRlRm9sZGVyKHRpbWVzdGFtcCkge1xuICAgIHRoaXMuX2NyZWF0ZSgnZCcsIHt9LCB0aW1lc3RhbXApO1xuICB9XG5cbiAgY3JlYXRlRmlsZSh0aW1lc3RhbXApIHtcbiAgICB0aGlzLl9jcmVhdGUoJ2YnLCAnJywgdGltZXN0YW1wKTtcbiAgfVxuXG4gIHNlbGYoKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsZW5hbWUgPyB0aGlzLmRpciA6IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV07XG4gIH1cblxuICBvcGVuKGZpbGUpIHtcbiAgICByZXR1cm4gRmlsZS5vcGVuKHRoaXMucGF0aCArICcvJyArIGZpbGUpO1xuICB9XG5cbiAgbGVuZ3RoKCkge1xuICAgIHZhciBjb250ZW50ID0gdGhpcy5yZWFkKCk7XG5cbiAgICBpZiAodGhpcy5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0RpcigpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29udGVudCkubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH1cblxuICBtdGltZSgpIHtcbiAgICB2YXIgdCA9IG5ldyBEYXRlKHRoaXMuc2VsZigpLm10aW1lKTtcblxuICAgIHZhciBkYXlBbmRNb250aCA9IE1PTlRIU1t0LmdldE1vbnRoKCldICsgJyAnICsgdC5nZXREYXkoKTtcbiAgICBpZiAoRGF0ZS5ub3coKSAtIHQuZ2V0VGltZSgpID4gNiAqIDMwICogMjQgKiA2MCAqIDYwICogMTAwMCkge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRGdWxsWWVhcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZGF5QW5kTW9udGggKyAnICcgKyB0LmdldEhvdXJzKCkgKyAnOicgKyB0LmdldE1pbnV0ZXMoKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgTG9jYWxTdG9yYWdlIGZyb20gJy4vbG9jYWwtc3RvcmFnZSc7XG5cbnZhciBGUyA9IHt9O1xudmFyIEZJTEVfU1lTVEVNX0tFWSA9ICdmaWxlX3N5c3RlbSc7XG5cbkZTLndyaXRlRlMgPSBmdW5jdGlvbiAoKSB7XG4gIExvY2FsU3RvcmFnZS5zZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSwgSlNPTi5zdHJpbmdpZnkoRlMucm9vdCkpO1xufTtcblxuXG5GUy5yb290ID0gSlNPTi5wYXJzZShMb2NhbFN0b3JhZ2UuZ2V0SXRlbShGSUxFX1NZU1RFTV9LRVkpKTtcbnZhciBmaWxlU3lzdGVtID0gcmVxdWlyZSgnLi9maWxlLXN5c3RlbS5qc29uJyk7XG52YXIgY29weSA9IGZ1bmN0aW9uIGNvcHkob2xkLCBubmV3KSB7XG4gIGZvciAodmFyIGtleSBpbiBubmV3KSB7XG4gICAgb2xkW2tleV0gPSBubmV3W2tleV07XG4gIH1cbn07XG5cbmlmICghRlMucm9vdCB8fCAhRlMucm9vdC5jb250ZW50KSB7XG4gIEZTLnJvb3QgPSBmaWxlU3lzdGVtO1xufSBlbHNlIHtcbiAgdmFyIHRpbWUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgKGZ1bmN0aW9uIHJlYWRkaXIob2xkLCBubmV3KSB7XG4gICAgaWYgKHR5cGVvZiBvbGQuY29udGVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBubmV3LmNvbnRlbnQpIHtcbiAgICAgICAgdmFyIG4gPSBubmV3LmNvbnRlbnRba2V5XTtcbiAgICAgICAgdmFyIG8gPSBvbGQuY29udGVudFtrZXldO1xuXG4gICAgICAgIGlmICghby5jb250ZW50KSB7XG4gICAgICAgICAgbyA9IHtcbiAgICAgICAgICAgIGN0aW1lOiB0aW1lLFxuICAgICAgICAgICAgbXRpbWU6IHRpbWUsXG4gICAgICAgICAgICBjb250ZW50OiBvLmNvbnRlbnQsXG4gICAgICAgICAgICB0eXBlOiB0eXBlb2YgbyA9PT0gJ3N0cmluZycgPyAnZicgOiAnZCdcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG8udHlwZSA9PT0gJ2YnICYmIG8ubXRpbWUgPT09IG8uY3RpbWUpIHtcbiAgICAgICAgICBjb3B5KG8sIG4pO1xuICAgICAgICB9IGVsc2UgaWYgKG8udHlwZSA9PT0gJ2QnKSB7XG4gICAgICAgICAgcmVhZGRpcihvLCBuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSkoRlMucm9vdCwgZmlsZVN5c3RlbSk7XG5cbiAgRlMud3JpdGVGUygpO1xufVxuXG5GUy5jdXJyZW50UGF0aCA9IEZTLmhvbWUgPSAnL1VzZXJzL2d1ZXN0JztcbkZTLmN1cnJlbnREaXIgPSBGUy5yb290LmNvbnRlbnQuVXNlcnMuY29udGVudC5ndWVzdDtcblxuRlMuZGlybmFtZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcvJykuc2xpY2UoMCwgLTEpLmpvaW4oJy8nKTtcbn07XG5cbkZTLmJhc2VuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5wb3AoKTtcbn07XG5cbkZTLnRyYW5zbGF0ZVBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgaW5kZXg7XG5cbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgnficsIEZTLmhvbWUpO1xuXG4gIGlmIChwYXRoWzBdICE9PSAnLycpIHtcbiAgICBwYXRoID0gKEZTLmN1cnJlbnRQYXRoICE9PSAnLycgPyBGUy5jdXJyZW50UGF0aCArICcvJyA6ICcvJykgKyBwYXRoO1xuICB9XG5cbiAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuLicpKSkge1xuICAgIHBhdGguc3BsaWNlKGluZGV4IC0gMSwgMik7XG4gIH1cblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgaWYgKHBhdGhbMF0gPT09ICcuJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIGlmIChwYXRoLmxlbmd0aCA8IDIpIHtcbiAgICBwYXRoID0gWywgLCBdO1xuICB9XG5cbiAgcmV0dXJuIHBhdGguam9pbignLycpLnJlcGxhY2UoLyhbXi9dKylcXC8rJC8sICckMScpO1xufTtcblxuRlMucmVhbHBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHBhdGggPSBGUy50cmFuc2xhdGVQYXRoKHBhdGgpO1xuXG4gIHJldHVybiBGUy5leGlzdHMocGF0aCkgPyBwYXRoIDogbnVsbDtcbn07XG5cblxuRlMub3BlbiA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmIChwYXRoWzBdICE9PSAnLycpIHtcbiAgICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgfVxuXG4gIHBhdGggPSBwYXRoLnN1YnN0cigxKS5zcGxpdCgnLycpLmZpbHRlcihTdHJpbmcpO1xuXG4gIHZhciBjd2QgPSBGUy5yb290O1xuICB3aGlsZShwYXRoLmxlbmd0aCAmJiBjd2QuY29udGVudCkge1xuICAgIGN3ZCA9IGN3ZC5jb250ZW50W3BhdGguc2hpZnQoKV07XG4gIH1cblxuICByZXR1cm4gY3dkO1xufTtcblxuRlMuZXhpc3RzID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuICEhRlMub3BlbihwYXRoKTtcbn07XG5cbkZTLmVycm9yID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gW10uam9pbi5jYWxsKGFyZ3VtZW50cywgJzogJyk7XG59O1xuXG5GUy5ub3RGb3VuZCA9IGZ1bmN0aW9uIChjbWQsIGFyZykge1xuICByZXR1cm4gRlMuZXJyb3IoY21kLCBhcmcsICdObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5Jyk7XG59O1xuXG5GUy5hdXRvY29tcGxldGUgPSBmdW5jdGlvbiAoX3BhdGgpIHtcbiAgdmFyIHBhdGggPSB0aGlzLnRyYW5zbGF0ZVBhdGgoX3BhdGgpO1xuICB2YXIgb3B0aW9ucyA9IFtdO1xuXG4gIGlmIChfcGF0aC5zbGljZSgtMSkgPT09ICcvJykge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgaWYgKHBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmaWxlbmFtZSA9IF9wYXRoLnNwbGl0KCcvJykucG9wKCk7XG4gICAgdmFyIG9wZW5QYXRoID0gZmlsZW5hbWUubGVuZ3RoID4gMSA/IHBhdGguc2xpY2UoMCwgLTEpIDogcGF0aDtcbiAgICB2YXIgZGlyID0gRlMub3BlbihvcGVuUGF0aCk7XG4gICAgdmFyIGZpbGVOYW1lID0gJyc7XG4gICAgdmFyIHBhcmVudFBhdGggPSBwYXRoO1xuXG4gICAgaWYgKCFkaXIpIHtcbiAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICBmaWxlTmFtZSA9IHBhdGgucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgIHBhcmVudFBhdGggPSBwYXRoLmpvaW4oJy8nKSB8fCAnLyc7XG4gICAgICBkaXIgPSBGUy5vcGVuKHBhcmVudFBhdGgpO1xuICAgIH1cblxuICAgIGlmIChkaXIgJiYgdHlwZW9mIGRpci5jb250ZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIGRpci5jb250ZW50KSB7XG4gICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIGZpbGVOYW1lLmxlbmd0aCkudG9Mb3dlckNhc2UoKSA9PT0gZmlsZU5hbWUpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRpci5jb250ZW50W2tleV0uY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGtleSArPSAnLyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgb3B0aW9ucy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEZTO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgc2Nyb2xsKSB7XG4gIHdpbmRvdy5vbnJlc2l6ZSA9IHNjcm9sbDtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmZ1bGwtc2NyZWVuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50ICkge1xuICAgICAgaWYgKGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcgP1xuICB7XG4gICAgc2V0SXRlbTogZnVuY3Rpb24oKSB7fSxcbiAgICBnZXRJdGVtOiBmdW5jdGlvbigpIHsgcmV0dXJuIG51bGw7IH1cbiAgfVxuOlxuICBsb2NhbFN0b3JhZ2U7XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIG9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSkge1xuICAgICAgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSA9IFtdO1xuICAgIH1cblxuICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0ucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICB3cml0ZShkYXRhKSB7XG4gICAgdGhpcy5lbW1pdCgnZGF0YScsIGRhdGEpO1xuICB9XG5cbiAgZW1taXQoZXZlbnQsIGRhdGEpIHtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICBjYWxsYmFja3MgJiYgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IGJpbmRGdWxsU2NyZWVuIGZyb20gJy4vZnVsbC1zY3JlZW4nO1xuaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcbmltcG9ydCBSRVBMIGZyb20gJy4vUkVQTCc7XG5pbXBvcnQgU3RyZWFtIGZyb20gJy4vc3RyZWFtJztcblxuLyoqXG4gKiBPbmx5IHVzZWQgYnkgc291cmNlLmpzIC0gdW51c2VkIGltcG9ydCBzbyBpdCBnZXRzIGludG8gdGhlIGJ1bmRsZVxuICovXG5pbXBvcnQgQ29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG5jbGFzcyBaU0gge1xuICBjb25zdHJ1Y3Rvcihjb250YWluZXIsIHN0YXR1c2JhciwgY3JlYXRlSFRNTCkge1xuICAgIGlmIChjcmVhdGVIVE1MKSB7XG4gICAgICB0aGlzLmNyZWF0ZShjb250YWluZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgICAgIHRoaXMuc3RhdHVzYmFyID0gc3RhdHVzYmFyO1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlU3RyZWFtcygpO1xuXG4gICAgdGhpcy5yb290Q29udGFpbmVyID0gdGhpcy5jb250YWluZXI7XG4gICAgdGhpcy5Db21tYW5kTWFuYWdlciA9IG5ldyBDb21tYW5kTWFuYWdlcigpO1xuICAgIHRoaXMuUkVQTCA9IG5ldyBSRVBMKHRoaXMpO1xuICAgIHRoaXMuRlMgPSBGUztcbiAgICB0aGlzLmluaXRpYWxpemVJbnB1dCgpO1xuICAgIHRoaXMucHJvbXB0KCk7XG5cbiAgICBiaW5kRnVsbFNjcmVlbih0aGlzLmNvbnRhaW5lci5wYXJlbnRFbGVtZW50LCB0aGlzLnNjcm9sbC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuQ29tbWFuZE1hbmFnZXIucmVnaXN0ZXIoJ2NsZWFyJywgdGhpcy5jbGVhci5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIGNyZWF0ZVN0cmVhbXMoKSB7XG4gICAgdGhpcy5zdGRpbiA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZGVyciA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZG91dCA9IG5ldyBTdHJlYW0oKTtcblxuICAgIHRoaXMuc3RkZXJyLm9uKCdkYXRhJywgKGQpID0+IHRoaXMub3V0cHV0KGQsICdzdGRlcnInKSk7XG4gICAgdGhpcy5zdGRvdXQub24oJ2RhdGEnLCAoZCkgPT4gdGhpcy5vdXRwdXQoZCwgJ3N0ZG91dCcpKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICB0aGlzLnN0ZGluLndyaXRlKGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIHB3ZCgpIHtcbiAgICByZXR1cm4gRlMuY3VycmVudFBhdGgucmVwbGFjZShGUy5ob21lLCAnficpO1xuICB9XG5cbiAgJFBTMSgpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPHNwYW4gY2xhc3M9XCJ3aG9cIj5ndWVzdDwvc3Bhbj5cbiAgICAgIG9uXG4gICAgICA8c3BhbiBjbGFzcz1cIndoZXJlXCI+ICR7dGhpcy5wd2QoKX0gPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJicmFuY2hcIj7CsW1hc3Rlcjwvc3Bhbj4mZ3Q7XG4gICAgYDtcbiAgfVxuXG4gIHByb21wdCgpIHtcbiAgICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9ICdwczEnO1xuICAgIGNvZGUuY2xhc3NOYW1lID0gJ2NvZGUnO1xuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSB0aGlzLiRQUzEoKTtcblxuICAgIHJvdy5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQoY29kZSk7XG5cbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuICAgIHRoaXMuUkVQTC51c2UoY29kZSk7XG4gICAgdGhpcy5zdGF0dXModGhpcy5wd2QoKSk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGhpcy5pbnB1dCk7XG4gICAgdGhpcy5pbnB1dC5mb2N1cygpO1xuICB9XG5cbiAgc3RhdHVzKHRleHQpIHtcbiAgICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzYmFyLmlubmVySFRNTCA9IHRleHQ7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZUlucHV0KCkge1xuICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQuY2xhc3NOYW1lID0gJ2Zha2UtaW5wdXQnO1xuICAgIHRoaXMucm9vdENvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoaW5wdXQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgaW5wdXQuYmx1cigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIGNyZWF0ZShjb250YWluZXIpIHtcbiAgICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWluaW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWF4aW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGl0bGVcIj48L2Rpdj5cbiAgICAgICAgICA8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG4gICAgdGhpcy5zdGF0dXNiYXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnN0YXR1cy1iYXInKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICB2YXIgY29kZXMgPSB0aGlzLmNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjb2RlJyk7XG4gICAgaWYgKCFjb2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuUkVQTC51c2UoY29kZXNbY29kZXMubGVuZ3RoIC0gMV0sIFpTSCk7XG4gICAgfVxuICB9XG5cbiAgb3V0cHV0KHRleHQsIGNsYXNzTmFtZSkge1xuICAgIHZhciBvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdXQuY2xhc3NOYW1lID0gJ2NvZGUgJyArIFtjbGFzc05hbWVdO1xuICAgIG91dC5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQob3V0KTtcbiAgICB0aGlzLnNjcm9sbCgpO1xuICB9XG5cbiAgc2Nyb2xsKCkge1xuICAgIHZhciBjID0gdGhpcy5yb290Q29udGFpbmVyO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gYy5zY3JvbGxUb3AgPSBjLnNjcm9sbEhlaWdodCwgMCk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICB0aGlzLnByb21wdCgpO1xuICB9XG5cbn1cblxud2luZG93LlpTSCA9IFpTSDtcbmV4cG9ydCBkZWZhdWx0IFpTSDtcbiJdfQ==
