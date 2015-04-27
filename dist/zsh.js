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
      window.onkeydown = this.parse.bind(this);
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

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/lib/args-parser":[function(require,module,exports){
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

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":15}],"zsh.js/lib/command-manager":[function(require,module,exports){
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

},{"./zsh":"F2/ljt"}],"zsh.js/lib/console":[function(require,module,exports){
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
          "mtime": "2015-04-27T01:15:07.000Z",
          "ctime": "2015-04-27T01:15:07.000Z",
          "content": {
            "alias.js": {
              "mtime": "2015-04-27T00:51:12.000Z",
              "ctime": "2015-04-27T00:51:12.000Z",
              "content": "import CommandManager from './command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index + 1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        CommandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = CommandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n}\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2015-04-27T00:54:26.000Z",
              "ctime": "2015-04-27T00:54:26.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n}\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2015-04-27T00:55:48.000Z",
              "ctime": "2015-04-27T00:55:48.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = File.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(FS.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(FS.error('cd', path, 'Is a file'));\n  } else {\n    FS.currentPath = dir.path;\n    FS.currentDir = dir.self();\n  }\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2015-04-27T00:57:10.000Z",
              "ctime": "2015-04-27T00:57:10.000Z",
              "content": "import ArgsParser from './args-parser';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2015-04-27T01:14:39.000Z",
              "ctime": "2015-04-27T01:14:39.000Z",
              "content": "import CommandManager from './command-manager';\nimport File from './file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  stdout.write('registered commands:');\n  stdout.write(Object.keys(CommandManager.commands).join(' '));\n\n  stdout.write('\\n');\n  stdout.write('executables (on /usr/bin)');\n  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {\n    return file.replace(/\\.js$/, '');\n  }).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n  stdout.write(Object.keys(CommandManager.aliases).map(function (key) {\n    return key + '=\"' + CommandManager.aliases[key] + '\"';\n  }).join(' '));\n\n  next();\n}\n",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2015-04-27T00:45:57.000Z",
              "ctime": "2015-04-27T00:45:57.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = File.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(FS.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(FS.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2015-04-27T00:59:11.000Z",
              "ctime": "2015-04-27T00:59:11.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(FS.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2015-04-27T01:00:36.000Z",
              "ctime": "2015-04-27T01:00:36.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var ok = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (!target.isFile()) {\n            target.read()[source.filename] = source.self();\n          } else {\n            target.write(source.read(), false, true);\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (ok) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2015-04-27T01:01:10.000Z",
              "ctime": "2015-04-27T01:01:10.000Z",
              "content": "import FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var pwd = FS.currentPath;\n\n  if (stdout) {\n    stdout.write(pwd);\n    next();\n  } else {\n    return pwd;\n  }\n}\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2015-04-27T01:02:08.000Z",
              "ctime": "2015-04-27T01:02:08.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2015-04-27T01:02:47.000Z",
              "ctime": "2015-04-27T01:02:47.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(FS.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(FS.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2015-04-27T01:04:01.000Z",
              "ctime": "2015-04-27T01:04:01.000Z",
              "content": "/*eslint no-eval: 0*/\nimport Console from './console';\nimport File from './file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = File.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2015-04-27T01:07:26.000Z",
              "ctime": "2015-04-27T01:07:26.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(FS.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2015-04-27T01:07:49.000Z",
              "ctime": "2015-04-27T01:07:49.000Z",
              "content": "import CommandManager from './command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    CommandManager.unalias(cmd);\n  }\n\n  next();\n}\n",
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
},{}],"zsh.js/lib/file":[function(require,module,exports){
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

},{"./fs":"dDj8kd"}],"dDj8kd":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

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

},{"./file-system.json":8,"./local-storage":14}],"zsh.js/lib/fs":[function(require,module,exports){
module.exports=require('dDj8kd');
},{}],13:[function(require,module,exports){
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

},{}],"zsh.js":[function(require,module,exports){
module.exports=require('F2/ljt');
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

    this.rootContainer = this.container;
    this.CommandManager = new _CommandManager2['default']();
    this.REPL = new _REPL2['default'](this);
    this.createStreams();
    this.initializeInput();
    this.prompt();

    _bindFullScreen2['default'](this.container.parentElement, this.scroll.bind(this));

    this.CommandManager.register('clear', this.clear.bind(this));
  }

  _createClass(ZSH, [{
    key: 'createStreams',
    value: function createStreams() {
      var _this = this;

      this.stderr = new _Stream2['default']();
      this.stdout = new _Stream2['default']();

      this.stderr.on('data', function (d) {
        return _this.output(d, 'stderr');
      });
      this.stdout.on('data', function (d) {
        return _this.output(d, 'stdout');
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
        this.statusbar.innerText = text;
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
        _REPL2['default'].use(codes[codes.length - 1], ZSH);
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

},{"./REPL":1,"./command-manager":"8EyLTk","./console":"CjB+4o","./fs":"dDj8kd","./full-screen":13,"./stream":15}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVB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LENBQUMsS0FBSyxHQUFHLFlBQVk7QUFDcEMsT0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQ2IsQ0FBQzs7QUFFRixTQUFPLE9BQU8sQ0FBQztDQUNoQixDQUFBLEVBQUcsQ0FBQzs7QUFHTCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7Ozs7QUNqQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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akIsWUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO09BQ2YsTUFBTTtBQUNMLDBCQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztPQUN4QztLQUNGOzs7V0FFSyxnQkFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO0FBQ3RCLFVBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEMsU0FBRyxDQUFDLFNBQVMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0QyxTQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzs7QUFFckIsVUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ2Y7OztXQUVLLGtCQUFHO0FBQ1AsVUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUMzQixnQkFBVSxDQUFDO2VBQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWTtPQUFBLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDbkQ7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQzlCLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNmOzs7U0F2SUcsR0FBRzs7O0FBMklULE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO3FCQUNGLEdBQUciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcbmltcG9ydCBMb2NhbFN0b3JhZ2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuLy8gVE9ETzogSW1wbGVtZW50IFZJIGJpbmRpbmdzXG5cbmNvbnN0IExFRlQgPSAzNztcbmNvbnN0IFVQID0gMzg7XG5jb25zdCBSSUdIVCA9IDM5O1xuY29uc3QgRE9XTiA9IDQwO1xuXG5jb25zdCBUQUIgPSA5O1xuY29uc3QgRU5URVIgPSAxMztcbmNvbnN0IEJBQ0tTUEFDRSA9IDg7XG5jb25zdCBTUEFDRSA9IDMyO1xuXG5jb25zdCBISVNUT1JZX1NUT1JBR0VfS0VZID0gJ1RFUk1JTkFMX0hJU1RPUlknO1xuY29uc3QgSElTVE9SWV9TSVpFID0gMTAwO1xuY29uc3QgSElTVE9SWV9TRVBBUkFUT1IgPSAnJSVISVNUT1JZX1NFUEFSQVRPUiUlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkVQTCB7XG4gIGNvbnN0cnVjdG9yKHpzaCkge1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMubGFzdEtleSA9IG51bGw7XG4gICAgdGhpcy56c2ggPSB6c2g7XG5cbiAgICB0aGlzLmZ1bGxIaXN0b3J5ID0gKFtMb2NhbFN0b3JhZ2UuZ2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZKV0gKyAnJykuc3BsaXQoSElTVE9SWV9TRVBBUkFUT1IpLmZpbHRlcihTdHJpbmcpO1xuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoMCkgfHwgW107XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXG4gICAgdGhpcy5jcmVhdGVDYXJldCgpO1xuICB9XG5cbiAgY3JlYXRlQ2FyZXQoKSB7XG4gICAgdGhpcy5jYXJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB0aGlzLmNhcmV0LmNsYXNzTmFtZSA9ICdjYXJldCc7XG4gIH1cblxuICBvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAoKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkpLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgdXNlKHNwYW4pIHtcbiAgICB0aGlzLnNwYW4gJiYgdGhpcy5yZW1vdmVDYXJldCgpO1xuICAgIHRoaXMuc3BhbiA9IHNwYW47XG4gICAgd2luZG93Lm9ua2V5ZG93biA9IHRoaXMucGFyc2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLndyaXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwYXJzZShldmVudCkge1xuICAgIGlmIChldmVudC5tZXRhS2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICAgIGNhc2UgTEVGVDpcbiAgICAgIGNhc2UgUklHSFQ6XG4gICAgICAgIHRoaXMubW92ZUNhcmV0KGV2ZW50LmtleUNvZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVVA6XG4gICAgICBjYXNlIERPV046XG4gICAgICAgIHRoaXMubmF2aWdhdGVIaXN0b3J5KGV2ZW50LmtleUNvZGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVEFCOlxuICAgICAgICB0aGlzLmF1dG9jb21wbGV0ZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRU5URVI6XG4gICAgICAgIHRoaXMuc3VibWl0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCQUNLU1BBQ0U6XG4gICAgICAgIHRoaXMuYmFja3NwYWNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgICB0aGlzLmFjdGlvbihldmVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy51cGRhdGUoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfVxuICB9XG5cbiAgbW92ZUNhcmV0KGRpcmVjdGlvbikge1xuICAgIGlmIChkaXJlY3Rpb24gPT09IExFRlQpIHtcbiAgICAgIHRoaXMuaW5kZXggPSBNYXRoLm1heCh0aGlzLmluZGV4IC0gMSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5kZXggPSBNYXRoLm1pbih0aGlzLmluZGV4ICsgMSwgdGhpcy5pbnB1dC5sZW5ndGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgYXV0b2NvbXBsZXRlKCkge1xuICAgIHZhciBvcHRpb25zO1xuICAgIHZhciBwYXRoID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5jb21tYW5kKCkgPT09IHRoaXMuaW5wdXQpIHtcbiAgICAgIG9wdGlvbnMgPSB0aGlzLnpzaC5Db21tYW5kTWFuYWdlci5hdXRvY29tcGxldGUodGhpcy5jb21tYW5kKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoID0gdGhpcy5pbnB1dC5zcGxpdCgnICcpLnBvcCgpO1xuICAgICAgb3B0aW9ucyA9IEZTLmF1dG9jb21wbGV0ZShwYXRoKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChwYXRoICE9PSBmYWxzZSkge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgICBwYXRoLnB1c2goJycpO1xuXG4gICAgICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnJlcGxhY2UoLyBbXiBdKiQvLCAnICcgKyBwYXRoLmpvaW4oJy8nKSArIG9wdGlvbnMuc2hpZnQoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlucHV0ID0gb3B0aW9ucy5zaGlmdCgpICsgJyAnO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmxlbmd0aCl7XG4gICAgICB0aGlzLnpzaC5zdGRvdXQud3JpdGUob3B0aW9ucy5qb2luKCcgJykpO1xuICAgICAgdGhpcy56c2gucHJvbXB0KCk7XG4gICAgfVxuICB9XG5cbiAgbmF2aWdhdGVIaXN0b3J5KGRpcmVjdGlvbikge1xuICAgIGlmIChkaXJlY3Rpb24gPT09IFVQKSB7XG4gICAgICB0aGlzLmhpc3RvcnlJbmRleCA9IE1hdGgubWF4KHRoaXMuaGlzdG9yeUluZGV4IC0gMSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gTWF0aC5taW4odGhpcy5oaXN0b3J5SW5kZXggKyAxLCB0aGlzLmhpc3RvcnkubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dCA9IHRoaXMuaGlzdG9yeVt0aGlzLmhpc3RvcnlJbmRleF0gfHwgJyc7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIHN1Ym1pdChwcmV2ZW50V3JpdGUpIHtcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG5cbiAgICBpZiAoIXByZXZlbnRXcml0ZSkge1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH1cblxuICAgIHZhciBpbnB1dCA9IHRoaXMuaW5wdXQudHJpbSgpO1xuXG4gICAgaWYgKGlucHV0ICYmIGlucHV0ICE9PSB0aGlzLmZ1bGxIaXN0b3J5W3RoaXMuZnVsbEhpc3RvcnkubGVuZ3RoIC0gMV0pIHtcbiAgICAgIHRoaXMuZnVsbEhpc3RvcnlbdGhpcy5mdWxsSGlzdG9yeS5sZW5ndGhdID0gaW5wdXQ7XG4gICAgICBMb2NhbFN0b3JhZ2Uuc2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZLCB0aGlzLmZ1bGxIaXN0b3J5LnNsaWNlKC1ISVNUT1JZX1NJWkUpLmpvaW4oSElTVE9SWV9TRVBBUkFUT1IpKTtcbiAgICB9XG5cbiAgICB0aGlzLmhpc3RvcnkgPSB0aGlzLmZ1bGxIaXN0b3J5LnNsaWNlKDApO1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gdGhpcy5oaXN0b3J5Lmxlbmd0aDtcblxuICAgIHRoaXMuY2xlYXIoKTtcblxuICAgIGlmIChpbnB1dCkge1xuICAgICAgdGhpcy56c2guQ29tbWFuZE1hbmFnZXIucGFyc2UoXG4gICAgICAgIGlucHV0LFxuICAgICAgICB0aGlzLnpzaC5zdGRpbixcbiAgICAgICAgdGhpcy56c2guc3Rkb3V0LFxuICAgICAgICB0aGlzLnpzaC5zdGRlcnIsXG4gICAgICAgIHRoaXMuenNoLnByb21wdC5iaW5kKHRoaXMuenNoKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy56c2gucHJvbXB0KCk7XG4gICAgfVxuICB9XG5cbiAgdHJpZ2dlcihldnQsIG1zZykge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmxpc3RlbmVyc1tldnRdIHx8IFtdO1xuXG4gICAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhtc2cpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVtb3ZlQ2FyZXQoKSB7XG4gICAgdmFyIGNhcmV0ID0gdGhpcy5zcGFuLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhcmV0Jyk7XG5cbiAgICBpZiAoY2FyZXQgJiYgY2FyZXRbMF0pIHtcbiAgICAgIGNhcmV0WzBdLnJlbW92ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgfVxuXG4gIGJhY2tzcGFjZSgpIHtcbiAgICBpZiAodGhpcy5pbmRleCA+IDApIHtcbiAgICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnN1YnN0cigwLCB0aGlzLmluZGV4IC0gMSkgKyB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmluZGV4KTtcbiAgICAgIHRoaXMuaW5kZXgtLTtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9XG4gIH1cblxuICBhY3R1YWxDaGFyQ29kZShldmVudCkge1xuICAgIHZhciBvcHRpb25zO1xuICAgIHZhciBjb2RlID0gZXZlbnQua2V5Q29kZTtcblxuICAgIGNvZGUgPSB7XG4gICAgICAxNzM6IDE4OVxuICAgIH1bY29kZV0gfHwgY29kZTtcblxuICAgIGlmIChjb2RlID49IDY1ICYmIGNvZGUgPD0gOTApIHtcbiAgICAgIGlmICghZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSAzMjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gNDggJiYgY29kZSA8PSA1Nykge1xuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgPSAnKSFAIyQlXiYqKCcuY2hhckNvZGVBdChjb2RlIC0gNDgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29kZSA+PSAxODYgJiYgY29kZSA8PSAxOTIpe1xuICAgICAgb3B0aW9ucyA9ICc7PSwtLi9gOis8Xz4/fic7XG5cbiAgICAgIGNvZGUgLT0gMTg2O1xuXG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgICB9XG5cbiAgICAgIGNvZGUgPSBvcHRpb25zLmNoYXJDb2RlQXQoY29kZSk7XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDIxOSAmJiBjb2RlIDw9IDIyMikge1xuICAgICAgb3B0aW9ucyA9ICdbXFxcXF1cXCd7fH1cIic7XG4gICAgICBjb2RlIC09IDIxOTtcblxuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gb3B0aW9ucy5sZW5ndGggLyAyO1xuICAgICAgfVxuXG4gICAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICAgIH0gZWxzZSBpZiAoY29kZSAhPT0gU1BBQ0UpIHtcbiAgICAgIGNvZGUgPSAtMTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIGFjdGlvbihldmVudCkge1xuICAgIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpID09PSAnQycpIHtcbiAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICAgIHRoaXMuc3VibWl0KHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZShldmVudCkge1xuICAgIHZhciBjb2RlID0gdGhpcy5hY3R1YWxDaGFyQ29kZShldmVudCk7XG5cbiAgICBpZiAoIX5jb2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNoYXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuXG4gICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXgpICsgY2hhciArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICAgIHRoaXMuaW5kZXgrKztcbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBjb21tYW5kKCkge1xuICAgIGlmICh0aGlzLmlucHV0ICE9PSB0aGlzLl9faW5wdXRDb21tYW5kKSB7XG4gICAgICB0aGlzLl9faW5wdXRDb21tYW5kID0gdGhpcy5pbnB1dDtcbiAgICAgIHRoaXMuX19jb21tYW5kID0gdGhpcy5pbnB1dC5zcGxpdCgnICcpLnNoaWZ0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX19jb21tYW5kO1xuICB9XG5cbiAgY29tbWFuZEFyZ3NTdHJpbmcoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENBcmdzKSB7XG4gICAgICB0aGlzLl9faW5wdXRDQXJncyA9IHRoaXMuaW5wdXQ7XG4gICAgICB0aGlzLl9fY2FyZ3MgPSB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmNvbW1hbmQoKS5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9fY2FyZ3M7XG4gIH1cblxuICB3cml0ZSgpIHtcbiAgICB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdID0gdGhpcy5pbnB1dDtcbiAgICB0aGlzLmNhcmV0LmlubmVySFRNTCA9IHRoaXMuaW5wdXRbdGhpcy5pbmRleF0gfHwgJyc7XG5cbiAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB2YXIgY29tbWFuZCA9IHRoaXMuY29tbWFuZCgpO1xuICAgIHZhciBpbnB1dCA9IHRoaXMuY29tbWFuZEFyZ3NTdHJpbmcoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcHV0Q2FyZXQgPSBmdW5jdGlvbiAoc3RyLCBpbmRleCkge1xuICAgICAgc2VsZi5jYXJldC5pbm5lclRleHQgPSBzdHJbaW5kZXhdIHx8ICcgJztcbiAgICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGluZGV4KSArIHNlbGYuY2FyZXQub3V0ZXJIVE1MICsgc3RyLnN1YnN0cihpbmRleCArIDEpO1xuICAgIH07XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9IHRoaXMuenNoLkNvbW1hbmRNYW5hZ2VyLmlzVmFsaWQoY29tbWFuZCkgPyAndmFsaWQnIDogJ2ludmFsaWQnO1xuXG4gICAgaWYgKHRoaXMuaW5kZXggPCBjb21tYW5kLmxlbmd0aCkge1xuICAgICAgY29tbWFuZCA9IHB1dENhcmV0KGNvbW1hbmQsIHRoaXMuaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbnB1dCA9IHB1dENhcmV0KGlucHV0LCB0aGlzLmluZGV4IC0gY29tbWFuZC5sZW5ndGgpO1xuICAgIH1cblxuICAgIHNwYW4uaW5uZXJIVE1MID0gY29tbWFuZDtcbiAgICB0aGlzLnNwYW4uaW5uZXJIVE1MID0gc3Bhbi5vdXRlckhUTUwgKyBpbnB1dDtcbiAgfVxufVxuIiwidmFyIEFyZ3NQYXJzZXIgPSB7fTtcblxuQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MgPSBmdW5jdGlvbihyYXdTdHJpbmcpIHtcbiAgdmFyIF9hcmdzID0gW107XG4gIHZhciB3b3JkID0gJyc7XG4gIHZhciBzdHJpbmcgPSBmYWxzZTtcbiAgdmFyIGksIGw7XG5cbiAgZm9yIChpID0gMCwgbCA9IHJhd1N0cmluZy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgY2hhciA9IHJhd1N0cmluZ1tpXTtcbiAgICBpZiAoY2hhciA9PT0gJ1wiJyB8fCBjaGFyID09PSAnXFwnJykge1xuICAgICAgaWYgKHN0cmluZykge1xuICAgICAgICBpZiAoY2hhciA9PT0gc3RyaW5nKSB7XG4gICAgICAgICAgaWYgKHJhd1N0cmluZ1tpIC0gMV0gPT09ICdcXFxcJykge1xuICAgICAgICAgICAgd29yZCA9IHdvcmQuc2xpY2UoMCwgLTEpICsgY2hhcjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgICAgICAgICAgIHdvcmQgPSAnJztcbiAgICAgICAgICAgIHN0cmluZyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyaW5nID0gY2hhcjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICcgJyAmJiAhc3RyaW5nKSB7XG4gICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgd29yZCA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JkICs9IGNoYXI7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0cmluZykge1xuICAgIHRocm93IG5ldyBFcnJvcigndW50ZXJtaW5hdGVkIHN0cmluZycpO1xuICB9IGVsc2UgaWYgKHdvcmQpIHtcbiAgICBfYXJncy5wdXNoKHdvcmQpO1xuICB9XG5cbiAgcmV0dXJuIF9hcmdzO1xufTtcblxuQXJnc1BhcnNlci5wYXJzZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIGFyZ3MgPSAoW2FyZ3NdICsgJycpLnRyaW0oKTtcblxuICB2YXIgb3V0ID0ge1xuICAgIGFyZ3VtZW50czogW10sXG4gICAgb3B0aW9uczoge30sXG4gICAgcmF3OiBhcmdzXG4gIH07XG5cbiAgYXJncyA9IEFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzKGFyZ3MpO1xuXG4gIGZ1bmN0aW9uIGFkZE9wdGlvbihvcHRpb24sIHZhbHVlKSB7XG4gICAgb3V0Lm9wdGlvbnNbb3B0aW9uXSA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IHRydWU7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGFyZyA9IGFyZ3NbaV07XG5cbiAgICBpZiAoIWFyZykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdWJzdHIoMCwgMikgPT09ICctLScpIHtcbiAgICAgIHZhciBuZXh0ID0gYXJnc1tpICsgMV07XG4gICAgICBpZiAobmV4dCAmJiBuZXh0WzBdICE9PSAnLScpIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMiksIG5leHQpO1xuICAgICAgICBpKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRPcHRpb24oYXJnLnN1YnN0cigyKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmdbMF0gPT09ICctJykge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGFyZy5zdWJzdHIoMSksIGFkZE9wdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hcmd1bWVudHMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBBcmdzUGFyc2VyO1xuIiwiLyplc2xpbnQgbm8tZXZhbDogMCovXG5pbXBvcnQgQXJnc1BhcnNlciBmcm9tICcuL2FyZ3MtcGFyc2VyJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcbmltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XG5pbXBvcnQgU3RyZWFtIGZyb20gJy4vc3RyZWFtJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tbWFuZE1hbmFnZXIge1xuICBjb25zdHJ1Y3Rvcih6c2gpIHtcbiAgICB0aGlzLmNvbW1hbmRzID0ge307XG4gICAgdGhpcy5hbGlhc2VzID0ge307XG4gICAgdGhpcy56c2ggPSB6c2g7XG4gIH1cblxuICBleGlzdHMoY21kKSB7XG4gICAgdmFyIHBhdGggPSBGaWxlLm9wZW4oJy91c3IvYmluJyk7XG4gICAgcmV0dXJuIHBhdGgub3BlbihjbWQgKyAnLmpzJykuaXNGaWxlKCk7XG4gIH1cblxuICBpbXBvcnQob3JpZ2luYWxGaWxlKSB7XG4gICAgdmFyIGZpbGUgPSBvcmlnaW5hbEZpbGUudG9Mb3dlckNhc2UoKTtcbiAgICBzd2l0Y2ggKGZpbGUpIHtcbiAgICAgIGNhc2UgJy4venNoJzpcbiAgICAgICAgcmV0dXJuICdzZWxmLnpzaCc7XG4gICAgICBjYXNlICcuL3JlcGwnOlxuICAgICAgICByZXR1cm4gJ3NlbGYuenNoLnJlcGwnO1xuICAgICAgY2FzZSAnLi9jb21tYW5kLW1hbmFnZXInOlxuICAgICAgICByZXR1cm4gJ3NlbGYnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGByZXF1aXJlKCcke29yaWdpbmFsRmlsZX0nKWA7XG4gICAgfVxuICB9XG5cbiAgbG9hZChjbWQpIHtcbiAgICB2YXIgcGF0aCA9IEZpbGUub3BlbignL3Vzci9iaW4nKTtcbiAgICB2YXIgc291cmNlID0gcGF0aC5vcGVuKGNtZCArICcuanMnKTtcbiAgICB2YXIgZm47XG4gICAgaWYgKHNvdXJjZS5pc0ZpbGUoKSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc291cmNlID0gc291cmNlLnJlYWQoKTtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC9eaW1wb3J0ICsoW0EtWmEtel0rKSArZnJvbSArJyhbLi9cXC1fQS1aYS16XSspJy9nbSwgKG1hdGNoLCB2YXJpYWJsZSwgZmlsZSkgPT4ge1xuICAgICAgICByZXR1cm4gYHZhciAke3ZhcmlhYmxlfSA9ICR7dGhpcy5pbXBvcnQoZmlsZSl9YDtcbiAgICAgIH0pO1xuICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoJ2V4cG9ydCBkZWZhdWx0JywgJ3ZhciBfX2RlZmF1bHRfXyA9Jyk7XG4gICAgICBmbiA9IGV2YWwoJyhmdW5jdGlvbiAoKSB7ICcgKyBzb3VyY2UgKyAnOyByZXR1cm4gX19kZWZhdWx0X187fSknKSgpO1xuICAgIH1cbiAgICByZXR1cm4gZm47XG4gIH1cblxuICBpc1ZhbGlkKGNtZCkge1xuICAgIHJldHVybiAhISh0aGlzLmNvbW1hbmRzW2NtZF0gfHwgdGhpcy5hbGlhc2VzW2NtZF0gfHwgdGhpcy5leGlzdHMoY21kKSk7XG4gIH1cblxuICBhdXRvY29tcGxldGUoY21kKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICBjbWQgPSBjbWQudG9Mb3dlckNhc2UoKTtcblxuICAgIChPYmplY3Qua2V5cyh0aGlzLmNvbW1hbmRzKS5jb25jYXQoT2JqZWN0LmtleXModGhpcy5hbGlhc2VzKSkpLmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICAgIGlmIChjb21tYW5kLnN1YnN0cigwLCBjbWQubGVuZ3RoKS50b0xvd2VyQ2FzZSgpID09PSBjbWQpIHtcbiAgICAgICAgbWF0Y2hlcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoZXM7XG4gIH1cblxuICBwYXJzZShjbWQsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xuICAgIGlmICh+Y21kLmluZGV4T2YoJ3wnKSkge1xuICAgICAgY21kID0gY21kLnNwbGl0KCd8Jyk7XG4gICAgICBjbWQuZm9yRWFjaCh0aGlzLnBhcnNlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIGNtZCA9IGNtZC5zcGxpdCgnICcpO1xuICAgIHZhciBjb21tYW5kID0gY21kLnNoaWZ0KCk7XG4gICAgdmFyIGFyZ3MgPSBjbWQuam9pbignICcpO1xuXG4gICAgdmFyIGluZGV4O1xuXG4gICAgaWYgKH4oaW5kZXggPSBhcmdzLmluZGV4T2YoJz4nKSkpIHtcbiAgICAgIHZhciBwcmV2ID0gYXJnc1tpbmRleCAtIDFdO1xuICAgICAgdmFyIGFwcGVuZCA9IGFyZ3NbaW5kZXggKyAxXSA9PT0gJz4nO1xuICAgICAgdmFyIGluaXQgPSBpbmRleDtcblxuICAgICAgaWYgKH4oWycxJywgJzInLCAnJiddKS5pbmRleE9mKHByZXYpKSB7XG4gICAgICAgIGluaXQtLTtcbiAgICAgIH1cblxuICAgICAgdmFyIF9hcmdzID0gYXJncy5zdWJzdHIoMCwgaW5pdCk7XG4gICAgICBhcmdzID0gYXJncy5zdWJzdHIoaW5kZXggKyBhcHBlbmQgKyAxKS5zcGxpdCgnICcpLmZpbHRlcihTdHJpbmcpO1xuICAgICAgdmFyIHBhdGggPSBhcmdzLnNoaWZ0KCk7XG4gICAgICBhcmdzID0gX2FyZ3MgKyBhcmdzLmpvaW4oJyAnKTtcblxuICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBwYXJzZSBlcnJvciBuZWFyIGBcXFxcblxcJycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xuXG4gICAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogbm90IGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IGlzIGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFwcGVuZCkge1xuICAgICAgICBmaWxlLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBfc3Rkb3V0ID0gbmV3IFN0cmVhbSgpO1xuICAgICAgX3N0ZG91dC5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgZmlsZS53cml0ZShkYXRhICsgJ1xcbicsIHRydWUsIHRydWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2ICE9PSAnMicpIHtcbiAgICAgICAgc3Rkb3V0ID0gX3N0ZG91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXYgPT09ICcyJyB8fCBwcmV2ID09PSAnJicpIHtcbiAgICAgICAgc3RkZXJyID0gX3N0ZG91dDtcbiAgICAgIH1cblxuICAgICAgdmFyIF9uZXh0ID0gbmV4dDtcbiAgICAgIG5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEZTLndyaXRlRlMoKTtcbiAgICAgICAgX25leHQoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5leGVjKGNvbW1hbmQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gIH1cblxuICBleGVjKGNtZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gICAgaWYgKHRoaXMuYWxpYXNlc1tjbWRdKSB7XG4gICAgICB2YXIgbGluZSA9ICh0aGlzLmFsaWFzZXNbY21kXSArICcgJyArIGFyZ3MpLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgICAgdGhpcy5leGVjKGxpbmUuc2hpZnQoKSwgbGluZS5qb2luKCcgJyksIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGZuO1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb21tYW5kc1tjbWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmbiA9IHRoaXMuY29tbWFuZHNbY21kXTtcbiAgICB9IGVsc2UgaWYgKChmbiA9IHRoaXMubG9hZChjbWQpKSkge1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGRlcnIud3JpdGUoJ3pzaDogY29tbWFuZCBub3QgZm91bmQ6ICcgKyBjbWQpO1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhcmdzID0gQXJnc1BhcnNlci5wYXJzZShhcmdzKTtcbiAgICAgIGZuLmNhbGwodW5kZWZpbmVkLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXIoY21kLCBmbikge1xuICAgIHRoaXMuY29tbWFuZHNbY21kXSA9IGZuO1xuICB9XG5cbiAgYWxpYXMoY21kLCBvcmlnaW5hbCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbGlhc2VzO1xuICAgIH1cbiAgICB0aGlzLmFsaWFzZXNbY21kXSA9IG9yaWdpbmFsO1xuICB9XG5cbiAgdW5hbGlhcyhjbWQpIHtcbiAgICBkZWxldGUgdGhpcy5hbGlhc2VzW2NtZF07XG4gIH1cblxuICBnZXQoY21kKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHNbY21kXTtcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgenNoID0gcmVxdWlyZSgnLi96c2gnKTtcblxudmFyIENvbnNvbGUgPSAoZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBDb25zb2xlKHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgdGhpcy5zdGRvdXQgPSBzdGRvdXQ7XG4gICAgdGhpcy5zdGRlcnIgPSBzdGRlcnI7XG4gICAgdGhpcy5leHRlcm5hbCA9IHR5cGVvZiBjb25zb2xlID09PSAndW5kZWZpbmVkJyA/IHt9IDogd2luZG93LmNvbnNvbGU7XG4gIH1cblxuICBmdW5jdGlvbiBzdHJpbmdpZnkoYXJncykge1xuICAgIHJldHVybiBbXS5tYXAuY2FsbChhcmdzLCBmdW5jdGlvbiAoYSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGEpIHx8IFthXSsnJztcbiAgICB9KS5qb2luKCcgJyk7XG4gIH1cblxuICBDb25zb2xlLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGRvdXQud3JpdGUoc3RyaW5naWZ5KGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIENvbnNvbGUucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3RkZXJyLndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfTtcblxuICBDb25zb2xlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB6c2guY2xlYXIoKTtcbiAgfTtcblxuICByZXR1cm4gQ29uc29sZTtcbn0pKCk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDb25zb2xlO1xuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgXCJjb250ZW50XCI6IHtcbiAgICBcIlVzZXJzXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgIFwiZ3Vlc3RcIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiLnZpbXJjXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi56c2hyY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhYm91dC5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIHRhZGV1emFnYWxsby5jb21cXG5cXG4qIEFib3V0IG1lXFxuICBJJ20gYSBGdWxsIFN0YWNrIERldmVsb3BlciwgSlMgUGFzc2lvbmF0ZSwgUnVieSBGYW4sIEMrKyBTb21ldGhpbmcsIEdhbWUgRGV2ZWxvcG1lbnQgRW50aHVzaWFzdCxcXG4gIEFsd2F5cyB3aWxsaW5nIHRvIGNvbnRyaWJ1dGUgdG8gb3BlbiBzb3VyY2UgcHJvamVjdHMgYW5kIHRyeWluZyB0byBsZWFybiBzb21lIG1vcmUgbWF0aC5cXG5cXG4qIEFib3V0IHRoaXMgd2Vic2l0ZVxcbiAgSSB3YW50ZWQgbW9yZSB0aGFuIGp1c3Qgc2hvdyBteSB3b3JrLCBJIHdhbnRlZCB0byBzaG93IG15IHdvcmsgZW52aXJvbm1lbnQuXFxuICBTaW5jZSBJIGRvIHNvbWUgbW9iaWxlIGRldmVsb3BtZW50IGFzIHdlbGwgIEkgYWxzbyB1c2UgKHNhZGx5KSBzb21lIElERXMsIGJ1dCBhbHdheXMgdHJ5aW5nXFxuICB0byBkbyBhcyBtdWNoIGFzIEkgY2FuIG9uIHRoaXMgdGVybWluYWwsIHNvIEkgbWFkZSBhIHZlcnkgc2ltaWxhciBjb3B5IChhdCBsZWFzdCB2aXN1YWxseSlcXG4gIG9mIGl0IHNvIHBlb3BsZSBjb3VsZCBnZXQgdG8gc2VlIHdoYXQgSSBkbyBhbmQgaG93IEkgKHVzdWFsbHkpIGRvLlxcblxcbiogQ29tbWFuZHNcXG4gIElmIHlvdSB3YW50IHRvIGtub3cgbW9yZSBhYm91dCBtZSwgdGhlcmUgYXJlIGEgZmV3IGNvbW1hbmRzOlxcbiAgICAqIGFib3V0ICAoY3VycmVudGx5IHJ1bm5pbmcpXFxuICAgICogY29udGFjdCBcXG4gICAgKiByZXN1bWVcXG4gICAgKiBwcm9qZWN0c1xcblxcbiAgSWYgeW91IG5lZWQgc29tZSBoZWxwIGFib3V0IHRoZSB0ZXJtaW5hbCwgb3Igd2FudCB0byBrbm93IHdoYXQgZnVuY3Rpb25hbGl0aWVzIGFyZSBjdXJycmVudGx5IGltcGxlbWVudGVkLCB0eXBlIGBoZWxwYCBhbnkgdGltZS5cXG5cXG5Ib3BlIHlvdSBoYXZlIGFzIG11Y2ggZnVuIGFzIEkgaGFkIGRvaW5nIGl0IDopXFxuXFxuVGFkZXUgWmFnYWxsb1xcbiAgICAgIFxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNvbnRhY3QubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBBbGwgbXkgY29udGFjdHMsIGZlZWwgZnJlZSB0byByZWFjaCBtZSBhdCBhbnkgb2YgdGhlc2VcXG5cXG4qIDxhIGhyZWY9XFxcIm1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tXFxcIiBhbHQ9XFxcIkVtYWlsXFxcIj5bRW1haWxdKG1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiR2l0SHViXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dpdEh1Yl0oaHR0cHM6Ly9naXRodWIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJUd2l0dGVyXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W1R3aXR0ZXJdKGh0dHBzOi8vdHdpdHRlci5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJGYWNlYm9va1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltGYWNlYm9va10oaHR0cHM6Ly9mYWNlYm9vay5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG9cXFwiIGFsdD1cXFwiR29vZ2xlICtcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bR29vZ2xlICtdKGh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OVxcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltMaW5rZWRpbl0oaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OSk8L2E+XFxuKiA8YSBocmVmPVxcXCJza3lwZTovL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCI+W1NreXBlXShza3lwZTovL3RhZGV1emFnYWxsbyk8L2E+XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHJvamVjdHMubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiRm9yIG5vdyB5b3UgY2FuIGhhdmUgYSBsb29rIGF0IHRoaXMgb25lISA6KVxcbihUaGF0J3Mgd2hhdCBJJ20gZG9pbmcpXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVhZG1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImZvbyBiYXIgYmF6XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVzdW1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgVGFkZXUgWmFnYWxsbyBkYSBTaWx2YVxcbi0tLVxcblxcbiMjIFByb2ZpbGVcXG4tLS0gXFxuICBJIGFtIHBhc3Npb25hdGUgZm9yIGFsbCBraW5kcyBvZiBkZXZlbG9wbWVudCwgbG92ZSB0byBsZWFybiBuZXcgbGFuZ3VhZ2VzIGFuZCBwYXJhZGlnbXMsIGFsd2F5cyByZWFkeSBmb3IgYSBnb29kIGNoYWxsZW5nZS5cXG4gIEkgYWxzbyBsaWtlIE1hdGgsIEdhbWUgZGV2ZWxvcG1lbnQgYW5kIHdoZW4gcG9zc2libGUgY29udHJpYnV0ZSB0byBvcGVuIHNvdXJjZSBwcm9qZWN0cy5cXG5cXG4jIyBHZW5lcmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuICAqIEVtYWlsOiB0YWRldXphZ2FsbG9AZ21haWwuY29tXFxuICAqIFBob25lOiArNTUgMzIgODg2MyAzNjg0XFxuICAqIFNreXBlOiB0YWRldXphZ2FsbG9cXG4gICogR2l0aHViOiBnaXRodWIuY29tL3RhZGV1emFnYWxsb1xcbiAgKiBMb2NhdGlvbjogSnVpeiBkZSBGb3JhL01HLCBCcmF6aWxcXG5cXG4jIyBFZHVjYXRpb25hbCBCYWNrZ3JvdW5kXFxuLS0tXFxuXFxuICAqIFdlYiBEZXZlbG9wbWVudCBhdCBJbnN0aXR1dG8gVmlhbm5hIEp1bmlvciwgMjAxMFxcbiAgKiBHZW5lcmFsIEVuZ2xpc2ggYXQgVGhlIENhcmx5bGUgSW5zdGl0dXRlLCAyMDExXFxuXFxuIyBXb3JrIEV4cGVyaWVuY2VcXG4tLS1cXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUXJhbmlvKjwvaT4gZnJvbSA8aT4qRGVjZW1iZXIsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gUXJhbmlvIGlzIGEgc3RhcnR1cCB0aGF0IGdyZXcgaW5zaWRlIHRoZSBjb21wYW55IEkgd29yayAoZU1pb2xvLmNvbSkgYW5kIEkgd2FzIGludml0ZWQgdG8gbGVhZCB0aGUgaU9TIGRldmVsb3BtZW50IHRlYW1cXG4gICAgICBvbiBhIGNvbXBsZXRlbHkgcmV3cml0ZW4gdmVyc2lvbiBvZiB0aGUgYXBwXFxuXFxuICAqIDxpPipXZWIgYW5kIE1vYmlsZSBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQm9udXoqPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBJIHN0YXJ0ZWQgZGV2ZWxvcGluZyB0aGUgaU9TIGFwcCBhcyBhIGZyZWVsYW5jZXIsIGFmdGVyIHRoZSBhcHAgd2FzIHB1Ymxpc2hlZCBJIHdhcyBpbnZpdGVkIHRvIG1haW50YWluIHRoZSBSdWJ5IG9uIFJhaWxzXFxuICAgICAgYXBpIGFuZCB3b3JrIG9uIHRoZSBBbmRyb2lkIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KmVNaW9sby5jb20qPC9pPiBmcm9tIDxpPipBcHJpbCwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBUaGUgY29tcGFueSBqdXN0IHdvcmtlZCB3aXRoIFBIUCwgc28gSSBqb2luZWQgd2l0aCB0aGUgaW50ZW50aW9uIG9mIGJyaW5naW5nIG5ldyB0ZWNobm9sb2dpZXMuIFdvcmtlZCB3aXRoIFB5dGhvbiwgUnVieSwgaU9TLFxcbiAgICAgIEFuZHJvaWQgYW5kIEhUTUw1IGFwcGxpY2F0aW9uc1xcblxcbiAgKiA8aT4qaU9TIERldmVsb3Blcio8L2k+IGF0IDxpPipQcm9Eb2N0b3IgU29mdHdhcmUgTHRkYS4qPC9pPiBmcm9tIDxpPipKdWx5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kk9jdG9iZXIsIDIwMTIqPC9pPlxcbiAgICAtIEJyaWVmbHkgd29ya2VkIHdpdGggdGhlIGlPUyB0ZWFtIG9uIHRoZSBkZXZlbG9wbWVudCBvZiB0aGVpciBmaXJzdCBtb2JpbGUgdmVyc2lvbiBvZiB0aGVpciBtYWluIHByb2R1Y3QsIGEgbWVkaWNhbCBzb2Z0d2FyZVxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipBdG8gSW50ZXJhdGl2byo8L2k+IGZyb20gPGk+KkZlYnJ1YXJ5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kkp1bHksIDIwMTIqPC9pPlxcbiAgICAtIE1vc3Qgb2YgdGhlIHdvcmsgd2FzIHdpdGggUEhQIGFuZCBNeVNRTCwgYWxzbyB3b3JraW5nIHdpdGggSmF2YVNjcmlwdCBvbiB0aGUgY2xpZW50IHNpZGUuIFdvcmtlZCB3aXRoIE1TU1FMXFxuICAgICAgYW5kIE9yYWNsZSBkYXRhYmFzZXMgYXMgd2VsbFxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipNYXJpYSBGdW1hY8ynYSBDcmlhY8ynb8yDZXMqPC9pPiBmcm9tIDxpPipPY3RvYmVyLCAyMDEwKjwvaT4gdW50aWwgPGk+Kkp1bmUsIDIwMTEqPC9pPlxcbiAgICAtIEkgd29ya2VkIG1vc3RseSB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gbWFraW5nIHRoZSBmcm9udCBlbmQgd2l0aCBIVE1MIGFuZCBDU1MgYW5kIG1vc3QgYW5pbWF0aW9ucyBpbiBKYXZhU2NyaXB0LFxcbiAgICAgIGFsdGhvdWdoIEkgYWxzbyB3b3JrZWQgd2l0aCBhIGZldyBpbiBBUzMuIEJyaWVmbHkgd29ya2VkIHdpdGggTW9uZ29EQlxcblxcbiMjIEFkZGl0aW9uYWwgSW5mb3JtYXRpb25cXG4tLS1cXG5cXG4qIEV4cGVyaWVuY2UgdW5kZXIgTGludXggYW5kIE9TIFggZW52aXJvbm1lbnRcXG4qIFN0dWRlbnQgRXhjaGFuZ2U6IDYgbW9udGhzIG9mIHJlc2lkZW5jZSBpbiBJcmVsYW5kXFxuXFxuIyMgTGFuZ3VhZ2VzXFxuLS0tXFxuXFxuKiBQb3J0dWd1ZXNlIOKAkyBOYXRpdmUgU3BlYWtlclxcbiogRW5nbGlzaCDigJMgRmx1ZW50IExldmVsXFxuKiBTcGFuaXNoIOKAkyBJbnRlcm1lZGlhdGUgTGV2ZWxcXG5cXG4jIyBQcm9ncmFtbWluZyBsYW5ndWFnZXMgKG9yZGVyZWQgYnkga25vd2xlZGdlKVxcbi0tLVxcblxcbiogSmF2YVNjcmlwdFxcbiogT2JqZWN0aXZlwq1DXFxuKiBDL0MrK1xcbiogUnVieSBvbiBSYWlsc1xcbiogTm9kZUpTXFxuKiBQSFBcXG4qIEphdmFcXG4qIFB5dGhvblxcblxcbiMjIEFkZGl0aW9uYWwgc2tpbGxzXFxuLS0tXFxuXFxuKiBIVE1MNS9DU1MzXFxuKiBNVkNcXG4qIERlc2lnbiBQYXR0ZXJuc1xcbiogVEREL0JERFxcbiogR2l0XFxuKiBBbmFseXNpcyBhbmQgRGVzaWduIG9mIEFsZ29yaXRobXNcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInR5cGVcIjogXCJkXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH0sXG4gICAgXCJ1c3JcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjE1OjA3LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMToxNTowNy4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1MToxMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjUxOjEyLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgYnVmZmVyID0gJyc7XFxuICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIHZhciBrZXkgPSBhcmdzLmFyZ3VtZW50cy5zaGlmdCgpO1xcbiAgICB2YXIgaW5kZXg7XFxuICAgIGlmICh+KGluZGV4ID0ga2V5LmluZGV4T2YoJz0nKSkpIHtcXG4gICAgICB2YXIgY29tbWFuZDtcXG5cXG4gICAgICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoICYmIGluZGV4ID09PSBrZXkubGVuZ3RoIC0gMSkge1xcbiAgICAgICAgY29tbWFuZCA9IGFyZ3MuYXJndW1lbnRzLmpvaW4oJyAnKTtcXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgY29tbWFuZCA9IGtleS5zdWJzdHIoaW5kZXggKyAxKTtcXG4gICAgICB9XFxuXFxuICAgICAga2V5ID0ga2V5LnN1YnN0cigwLCBpbmRleCk7XFxuXFxuICAgICAgaWYgKGNvbW1hbmQpIHtcXG4gICAgICAgIENvbW1hbmRNYW5hZ2VyLmFsaWFzKGtleSwgY29tbWFuZCk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYWxpYXNlcyA9IENvbW1hbmRNYW5hZ2VyLmFsaWFzKCk7XFxuXFxuICAgIGZvciAodmFyIGkgaW4gYWxpYXNlcykge1xcbiAgICAgIGJ1ZmZlciArPSBpICsgJz1cXFxcJycgKyBhbGlhc2VzW2ldICsgJ1xcXFwnXFxcXG4nO1xcbiAgICB9XFxuICB9XFxuXFxuICBzdGRvdXQud3JpdGUoYnVmZmVyKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2F0LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTQ6MjYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1NDoyNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnY2F0JywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignY2F0JywgcGF0aCwgJ0lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHN0ZG91dC53cml0ZShmaWxlLnJlYWQoKSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjU1OjQ4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTU6NDguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcGF0aCA9IGFyZ3MuYXJndW1lbnRzWzBdIHx8ICd+JztcXG4gIHZhciBkaXIgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2NkJywgcGF0aCkpO1xcbiAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdjZCcsIHBhdGgsICdJcyBhIGZpbGUnKSk7XFxuICB9IGVsc2Uge1xcbiAgICBGUy5jdXJyZW50UGF0aCA9IGRpci5wYXRoO1xcbiAgICBGUy5jdXJyZW50RGlyID0gZGlyLnNlbGYoKTtcXG4gIH1cXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZWNoby5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjU3OjEwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTc6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQXJnc1BhcnNlciBmcm9tICcuL2FyZ3MtcGFyc2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB0cnkge1xcbiAgICBzdGRvdXQud3JpdGUoQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncy5yYXcpLmpvaW4oJyAnKSk7XFxuICB9IGNhdGNoIChlcnIpIHtcXG4gICAgc3RkZXJyLndyaXRlKCd6c2g6ICcgKyBlcnIubWVzc2FnZSk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImhlbHAuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMToxNDozOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjE0OjM5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcXG5pbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHN0ZG91dC53cml0ZSgncmVnaXN0ZXJlZCBjb21tYW5kczonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5jb21tYW5kcykuam9pbignICcpKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG4gIHN0ZG91dC53cml0ZSgnZXhlY3V0YWJsZXMgKG9uIC91c3IvYmluKScpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKEZpbGUub3BlbignL3Vzci9iaW4nKS5yZWFkKCkpLm1hcChmdW5jdGlvbihmaWxlKSB7XFxuICAgIHJldHVybiBmaWxlLnJlcGxhY2UoL1xcXFwuanMkLywgJycpO1xcbiAgfSkuam9pbignICcpKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnYWxpYXNlczonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5hbGlhc2VzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xcbiAgICByZXR1cm4ga2V5ICsgJz1cXFwiJyArIENvbW1hbmRNYW5hZ2VyLmFsaWFzZXNba2V5XSArICdcXFwiJztcXG4gIH0pLmpvaW4oJyAnKSk7XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NDU6NTcuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo0NTo1Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmICghYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIGFyZ3MuYXJndW1lbnRzLnB1c2goJy4nKTtcXG4gIH1cXG5cXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGFyZykge1xcbiAgICB2YXIgZGlyID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdscycsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbHMnLCBhcmcsICdJcyBhIGZpbGUnKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdmFyIGZpbGVzID0gT2JqZWN0LmtleXMoZGlyLnJlYWQoKSk7XFxuXFxuICAgICAgaWYgKCFhcmdzLm9wdGlvbnMuYSkge1xcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5maWx0ZXIoZnVuY3Rpb24gKGZpbGUpIHtcXG4gICAgICAgICAgcmV0dXJuIGZpbGVbMF0gIT09ICcuJztcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoID4gMSkge1xcbiAgICAgICAgc3Rkb3V0LndyaXRlKGFyZyArICc6Jyk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChhcmdzLm9wdGlvbnMubCkge1xcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcXG4gICAgICAgICAgdmFyIGZpbGUgPSBkaXIub3BlbihuYW1lKTtcXG4gICAgICAgICAgdmFyIHR5cGUgPSBmaWxlLmlzRGlyKCkgPyAnZCcgOiAnLSc7XFxuICAgICAgICAgIHZhciBwZXJtcyA9IHR5cGUgKyAncnctci0tci0tJztcXG5cXG4gICAgICAgICAgcmV0dXJuIHBlcm1zICsgJyBndWVzdCBndWVzdCAnICsgZmlsZS5sZW5ndGgoKSArICcgJyArIGZpbGUubXRpbWUoKSArICcgJyArIG5hbWU7XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgc3Rkb3V0LndyaXRlKGZpbGVzLmpvaW4oYXJncy5vcHRpb25zLmwgPyAnXFxcXG4nIDogJyAnKSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibWtkaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1OToxMS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjU5OjExLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdta2RpcicsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdta2RpcicsIHBhdGgsICdGaWxlIGV4aXN0cycpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmNyZWF0ZUZvbGRlcigpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibXYuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowMDozNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAwOjM2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHRhcmdldFBhdGggPSBhcmdzLmFyZ3VtZW50cy5wb3AoKTtcXG4gIHZhciBzb3VyY2VQYXRocyA9IGFyZ3MuYXJndW1lbnRzO1xcbiAgdmFyIHRhcmdldCA9IEZpbGUub3Blbih0YXJnZXRQYXRoKTtcXG5cXG4gIGlmICghdGFyZ2V0UGF0aCB8fFxcbiAgICAgICFzb3VyY2VQYXRocy5sZW5ndGggfHxcXG4gICAgICAgIChzb3VyY2VQYXRocy5sZW5ndGggPiAxICYmXFxuICAgICAgICAgKCF0YXJnZXQuZXhpc3RzKCkgfHwgdGFyZ2V0LmlzRmlsZSgpKVxcbiAgICAgICAgKVxcbiAgICAgKSB7XFxuICAgIHN0ZGVyci53cml0ZSgndXNhZ2U6IG12IHNvdXJjZSB0YXJnZXRcXFxcbiBcXFxcdCBtdiBzb3VyY2UgLi4uIGRpcmVjdG9yeScpO1xcbiAgfSBlbHNlIGlmICghdGFyZ2V0LnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdtdicsIHRhcmdldC5kaXJuYW1lKSk7XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYmFja3VwID0gdGFyZ2V0LnNlbGYoKTtcXG4gICAgdmFyIG9rID0gc291cmNlUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChzdWNjZXNzLCBzb3VyY2VQYXRoKSB7XFxuICAgICAgaWYgKHN1Y2Nlc3MpIHtcXG4gICAgICAgIHZhciBzb3VyY2UgPSBGaWxlLm9wZW4oc291cmNlUGF0aCk7XFxuXFxuICAgICAgICBpZiAoIXNvdXJjZS5leGlzdHMoKSkge1xcbiAgICAgICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212Jywgc291cmNlUGF0aHNbMF0pKTtcXG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLmlzRGlyKCkgJiYgdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbXYnLCAncmVuYW1lICcgKyBzb3VyY2VQYXRoc1swXSArICcgdG8gJyArIHRhcmdldFBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICBpZiAoIXRhcmdldC5pc0ZpbGUoKSkge1xcbiAgICAgICAgICAgIHRhcmdldC5yZWFkKClbc291cmNlLmZpbGVuYW1lXSA9IHNvdXJjZS5zZWxmKCk7XFxuICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgdGFyZ2V0LndyaXRlKHNvdXJjZS5yZWFkKCksIGZhbHNlLCB0cnVlKTtcXG4gICAgICAgICAgfVxcblxcbiAgICAgICAgICBzb3VyY2UuZGVsZXRlKCk7XFxuICAgICAgICAgIHJldHVybiB0cnVlO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG5cXG4gICAgICByZXR1cm4gZmFsc2U7XFxuICAgIH0sIHRydWUpO1xcblxcbiAgICBpZiAob2spIHtcXG4gICAgICBGUy53cml0ZUZTKCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdGFyZ2V0LmRpclt0YXJnZXQuZmlsZW5hbWVdID0gYmFja3VwO1xcbiAgICB9XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInB3ZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAxOjEwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDE6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHB3ZCA9IEZTLmN1cnJlbnRQYXRoO1xcblxcbiAgaWYgKHN0ZG91dCkge1xcbiAgICBzdGRvdXQud3JpdGUocHdkKTtcXG4gICAgbmV4dCgpO1xcbiAgfSBlbHNlIHtcXG4gICAgcmV0dXJuIHB3ZDtcXG4gIH1cXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm0uanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowMjowOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAyOjA4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm0nLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3JtJywgYXJnLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdpcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm1kaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowMjo0Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAyOjQ3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSB8fCAhZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm1kaXInLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybWRpcicsIGFyZywgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic291cmNlLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDQ6MDEuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowNDowMS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIi8qZXNsaW50IG5vLWV2YWw6IDAqL1xcbmltcG9ydCBDb25zb2xlIGZyb20gJy4vY29uc29sZSc7XFxuaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZ3MuYXJndW1lbnRzWzBdKTtcXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKCdzb3VyY2U6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHRyeSB7XFxuICAgICAgICB2YXIgY29uc29sZSA9IG5ldyBDb25zb2xlKHN0ZG91dCwgc3RkZXJyKTsgLy8ganNoaW50IGlnbm9yZTogbGluZVxcbiAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KGV2YWwoZmlsZS5yZWFkKCkpKTtcXG4gICAgICAgIHN0ZG91dC53cml0ZSgnPC0gJyArIHJlc3VsdCk7XFxuICAgICAgfSBjYXRjaCAoZXJyKSB7XFxuICAgICAgICBzdGRlcnIud3JpdGUoZXJyLnN0YWNrKTtcXG4gICAgICB9XFxuICAgIH1cXG4gIH0gZWxzZSB7XFxuICAgIHN0ZGVyci53cml0ZSgnc291cmNlOiBub3QgZW5vdWdoIGFyZ3VtZW50cycpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ0b3VjaC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjA3OjI2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDc6MjYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ3RvdWNoJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSl7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCd0b3VjaCcsIHBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS53cml0ZSgnJywgdHJ1ZSwgdHJ1ZSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ1bmFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDc6NDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowNzo0OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICcuL2NvbW1hbmQtbWFuYWdlcic7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIGNtZCA9IGFyZ3MuYXJndW1lbnRzWzBdO1xcblxcbiAgaWYgKGNtZCkge1xcbiAgICBDb21tYW5kTWFuYWdlci51bmFsaWFzKGNtZCk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfVxuICB9LFxuICBcInR5cGVcIjogXCJkXCJcbn0iLCJpbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5cbmNvbnN0IE1PTlRIUyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZSB7XG4gIGNvbnN0cnVjdG9yKHBhdGgpIHtcbiAgICB0aGlzLnBhdGggPSBGUy50cmFuc2xhdGVQYXRoKHBhdGgpO1xuICAgIHBhdGggPSB0aGlzLnBhdGguc3BsaXQoJy8nKTtcbiAgICB0aGlzLmZpbGVuYW1lID0gcGF0aC5wb3AoKTtcbiAgICB0aGlzLmRpcm5hbWUgPSBwYXRoLmpvaW4oJy8nKSB8fCAnLyc7XG4gICAgdGhpcy5kaXIgPSBGUy5vcGVuKHRoaXMuZGlybmFtZSk7XG4gIH1cblxuICBzdGF0aWMgb3BlbihwYXRoKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKHBhdGgpO1xuICB9XG5cbiAgc3RhdGljIGdldFRpbWVzdGFtcCAoKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgfVxuXG4gIHBhcmVudEV4aXN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5kaXIgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLmRpciA9PT0gJ29iamVjdCcgJiYgdGhpcy5kaXIudHlwZSA9PT0gJ2QnO1xuICB9XG5cbiAgZXhpc3RzKCkge1xuICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSAmJiAoIXRoaXMuZmlsZW5hbWUgfHwgdHlwZW9mIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0gIT09ICd1bmRlZmluZWQnKTtcbiAgfVxuXG4gIGlzRmlsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5leGlzdHMoKSAmJiB0aGlzLmZpbGVuYW1lICYmXG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLnR5cGUgPT09ICdmJztcbiAgfVxuXG4gIGlzRGlyKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmXG4gICAgICAoIXRoaXMuZmlsZW5hbWUgfHwgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS50eXBlID09PSAnZCcpO1xuICB9XG5cbiAgZGVsZXRlKCkge1xuICAgIGlmICh0aGlzLmV4aXN0cygpKSB7XG4gICAgICBkZWxldGUgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXTtcbiAgICAgIEZTLndyaXRlRlMoKTtcbiAgICB9XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLndyaXRlKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gIH1cblxuICB3cml0ZShjb250ZW50LCBhcHBlbmQsIGZvcmNlKSB7XG4gICAgdmFyIHRpbWUgPSBGaWxlLmdldFRpbWVzdGFtcCgpO1xuXG4gICAgaWYgKCF0aGlzLmV4aXN0cygpKSB7XG4gICAgICBpZiAoZm9yY2UgJiYgdGhpcy5pc1ZhbGlkKCkpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVGaWxlKHRpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZpbGU6ICcgKyB0aGlzLnBhdGgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNGaWxlKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHdyaXRlIHRvIGRpcmVjdG9yeTogJXMnLCB0aGlzLnBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgX2NvbnRlbnQgPSAnJztcbiAgICAgIGlmIChhcHBlbmQpIHtcbiAgICAgICAgX2NvbnRlbnQgKz0gdGhpcy5yZWFkKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZGlyLm10aW1lID0gdGltZTtcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0ubXRpbWUgPSB0aW1lO1xuICAgICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5jb250ZW50ID0gX2NvbnRlbnQgKyBjb250ZW50O1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfVxuXG4gIHJlYWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsZW5hbWUgPyB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLmNvbnRlbnQgOiB0aGlzLmRpci5jb250ZW50O1xuICB9XG5cbiAgX2NyZWF0ZSh0eXBlLCBjb250ZW50LCB0aW1lc3RhbXApIHtcbiAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlICVzIGFscmVhZHkgZXhpc3RzJywgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRpbWVzdGFtcCkge1xuICAgICAgdGltZXN0YW1wID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcbiAgICB9XG5cbiAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdID0ge1xuICAgICAgY3RpbWU6IHRpbWVzdGFtcCxcbiAgICAgIG10aW1lOiB0aW1lc3RhbXAsXG4gICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgdHlwZTogdHlwZVxuICAgIH07XG5cbiAgICBGUy53cml0ZUZTKCk7XG4gIH1cblxuICBjcmVhdGVGb2xkZXIodGltZXN0YW1wKSB7XG4gICAgdGhpcy5fY3JlYXRlKCdkJywge30sIHRpbWVzdGFtcCk7XG4gIH1cblxuICBjcmVhdGVGaWxlKHRpbWVzdGFtcCkge1xuICAgIHRoaXMuX2NyZWF0ZSgnZicsICcnLCB0aW1lc3RhbXApO1xuICB9XG5cbiAgc2VsZigpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyIDogdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXTtcbiAgfVxuXG4gIG9wZW4oZmlsZSkge1xuICAgIHJldHVybiBGaWxlLm9wZW4odGhpcy5wYXRoICsgJy8nICsgZmlsZSk7XG4gIH1cblxuICBsZW5ndGgoKSB7XG4gICAgdmFyIGNvbnRlbnQgPSB0aGlzLnJlYWQoKTtcblxuICAgIGlmICh0aGlzLmlzRmlsZSgpKSB7XG4gICAgICByZXR1cm4gY29udGVudC5sZW5ndGg7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzRGlyKCkpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb250ZW50KS5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgfVxuXG4gIG10aW1lKCkge1xuICAgIHZhciB0ID0gbmV3IERhdGUodGhpcy5zZWxmKCkubXRpbWUpO1xuXG4gICAgdmFyIGRheUFuZE1vbnRoID0gTU9OVEhTW3QuZ2V0TW9udGgoKV0gKyAnICcgKyB0LmdldERheSgpO1xuICAgIGlmIChEYXRlLm5vdygpIC0gdC5nZXRUaW1lKCkgPiA2ICogMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwKSB7XG4gICAgICByZXR1cm4gZGF5QW5kTW9udGggKyAnICcgKyB0LmdldEZ1bGxZZWFyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0SG91cnMoKSArICc6JyArIHQuZ2V0TWludXRlcygpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCBMb2NhbFN0b3JhZ2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlJztcblxudmFyIEZTID0ge307XG52YXIgRklMRV9TWVNURU1fS0VZID0gJ2ZpbGVfc3lzdGVtJztcblxuRlMud3JpdGVGUyA9IGZ1bmN0aW9uICgpIHtcbiAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oRklMRV9TWVNURU1fS0VZLCBKU09OLnN0cmluZ2lmeShGUy5yb290KSk7XG59O1xuXG5cbkZTLnJvb3QgPSBKU09OLnBhcnNlKExvY2FsU3RvcmFnZS5nZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSkpO1xudmFyIGZpbGVTeXN0ZW0gPSByZXF1aXJlKCcuL2ZpbGUtc3lzdGVtLmpzb24nKTtcbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShvbGQsIG5uZXcpIHtcbiAgZm9yICh2YXIga2V5IGluIG5uZXcpIHtcbiAgICBvbGRba2V5XSA9IG5uZXdba2V5XTtcbiAgfVxufTtcblxuaWYgKCFGUy5yb290IHx8ICFGUy5yb290LmNvbnRlbnQpIHtcbiAgRlMucm9vdCA9IGZpbGVTeXN0ZW07XG59IGVsc2Uge1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAoZnVuY3Rpb24gcmVhZGRpcihvbGQsIG5uZXcpIHtcbiAgICBpZiAodHlwZW9mIG9sZC5jb250ZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5uZXcuY29udGVudCkge1xuICAgICAgICB2YXIgbiA9IG5uZXcuY29udGVudFtrZXldO1xuICAgICAgICB2YXIgbyA9IG9sZC5jb250ZW50W2tleV07XG5cbiAgICAgICAgaWYgKCFvLmNvbnRlbnQpIHtcbiAgICAgICAgICBvID0ge1xuICAgICAgICAgICAgY3RpbWU6IHRpbWUsXG4gICAgICAgICAgICBtdGltZTogdGltZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IG8uY29udGVudCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGVvZiBvID09PSAnc3RyaW5nJyA/ICdmJyA6ICdkJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoby50eXBlID09PSAnZicgJiYgby5tdGltZSA9PT0gby5jdGltZSkge1xuICAgICAgICAgIGNvcHkobywgbik7XG4gICAgICAgIH0gZWxzZSBpZiAoby50eXBlID09PSAnZCcpIHtcbiAgICAgICAgICByZWFkZGlyKG8sIG4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KShGUy5yb290LCBmaWxlU3lzdGVtKTtcblxuICBGUy53cml0ZUZTKCk7XG59XG5cbkZTLmN1cnJlbnRQYXRoID0gRlMuaG9tZSA9ICcvVXNlcnMvZ3Vlc3QnO1xuRlMuY3VycmVudERpciA9IEZTLnJvb3QuY29udGVudC5Vc2Vycy5jb250ZW50Lmd1ZXN0O1xuXG5GUy5kaXJuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpO1xufTtcblxuRlMuYmFzZW5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xufTtcblxuRlMudHJhbnNsYXRlUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBpbmRleDtcblxuICBwYXRoID0gcGF0aC5yZXBsYWNlKCd+JywgRlMuaG9tZSk7XG5cbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSAoRlMuY3VycmVudFBhdGggIT09ICcvJyA/IEZTLmN1cnJlbnRQYXRoICsgJy8nIDogJy8nKSArIHBhdGg7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4uJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXggLSAxLCAyKTtcbiAgfVxuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4nKSkpIHtcbiAgICBwYXRoLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBpZiAocGF0aFswXSA9PT0gJy4nKSB7XG4gICAgcGF0aC5zaGlmdCgpO1xuICB9XG5cbiAgaWYgKHBhdGgubGVuZ3RoIDwgMikge1xuICAgIHBhdGggPSBbLCAsIF07XG4gIH1cblxuICByZXR1cm4gcGF0aC5qb2luKCcvJykucmVwbGFjZSgvKFteL10rKVxcLyskLywgJyQxJyk7XG59O1xuXG5GUy5yZWFscGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG5cbiAgcmV0dXJuIEZTLmV4aXN0cyhwYXRoKSA/IHBhdGggOiBudWxsO1xufTtcblxuXG5GUy5vcGVuID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSBGUy50cmFuc2xhdGVQYXRoKHBhdGgpO1xuICB9XG5cbiAgcGF0aCA9IHBhdGguc3Vic3RyKDEpLnNwbGl0KCcvJykuZmlsdGVyKFN0cmluZyk7XG5cbiAgdmFyIGN3ZCA9IEZTLnJvb3Q7XG4gIHdoaWxlKHBhdGgubGVuZ3RoICYmIGN3ZC5jb250ZW50KSB7XG4gICAgY3dkID0gY3dkLmNvbnRlbnRbcGF0aC5zaGlmdCgpXTtcbiAgfVxuXG4gIHJldHVybiBjd2Q7XG59O1xuXG5GUy5leGlzdHMgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gISFGUy5vcGVuKHBhdGgpO1xufTtcblxuRlMuZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBbXS5qb2luLmNhbGwoYXJndW1lbnRzLCAnOiAnKTtcbn07XG5cbkZTLm5vdEZvdW5kID0gZnVuY3Rpb24gKGNtZCwgYXJnKSB7XG4gIHJldHVybiBGUy5lcnJvcihjbWQsIGFyZywgJ05vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnknKTtcbn07XG5cbkZTLmF1dG9jb21wbGV0ZSA9IGZ1bmN0aW9uIChfcGF0aCkge1xuICB2YXIgcGF0aCA9IHRoaXMudHJhbnNsYXRlUGF0aChfcGF0aCk7XG4gIHZhciBvcHRpb25zID0gW107XG5cbiAgaWYgKF9wYXRoLnNsaWNlKC0xKSA9PT0gJy8nKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICBpZiAocGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZpbGVuYW1lID0gX3BhdGguc3BsaXQoJy8nKS5wb3AoKTtcbiAgICB2YXIgb3BlblBhdGggPSBmaWxlbmFtZS5sZW5ndGggPiAxID8gcGF0aC5zbGljZSgwLCAtMSkgOiBwYXRoO1xuICAgIHZhciBkaXIgPSBGUy5vcGVuKG9wZW5QYXRoKTtcbiAgICB2YXIgZmlsZU5hbWUgPSAnJztcbiAgICB2YXIgcGFyZW50UGF0aCA9IHBhdGg7XG5cbiAgICBpZiAoIWRpcikge1xuICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICAgIGZpbGVOYW1lID0gcGF0aC5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcGFyZW50UGF0aCA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICAgIGRpciA9IEZTLm9wZW4ocGFyZW50UGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKGRpciAmJiB0eXBlb2YgZGlyLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gZGlyLmNvbnRlbnQpIHtcbiAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgZmlsZU5hbWUubGVuZ3RoKS50b0xvd2VyQ2FzZSgpID09PSBmaWxlTmFtZSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGlyLmNvbnRlbnRba2V5XS5jb250ZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAga2V5ICs9ICcvJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvcHRpb25zLnB1c2goa2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgRlM7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGFpbmVyLCBzY3JvbGwpIHtcbiAgd2luZG93Lm9ucmVzaXplID0gc2Nyb2xsO1xuXG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuZnVsbC1zY3JlZW4nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICFkb2N1bWVudC5tb3pGdWxsU2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAgICFkb2N1bWVudC53ZWJraXRGdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAgICAgIWRvY3VtZW50Lm1zRnVsbHNjcmVlbkVsZW1lbnQgKSB7XG4gICAgICBpZiAoY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2YgbG9jYWxTdG9yYWdlID09PSAndW5kZWZpbmVkJyA/XG4gIHtcbiAgICBzZXRJdGVtOiBmdW5jdGlvbigpIHt9LFxuICAgIGdldEl0ZW06IGZ1bmN0aW9uKCkgeyByZXR1cm4gbnVsbDsgfVxuICB9XG46XG4gIGxvY2FsU3RvcmFnZTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLl9jYWxsYmFja3NbZXZlbnRdKSB7XG4gICAgICB0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gW107XG4gICAgfVxuXG4gICAgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XS5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIHdyaXRlKGRhdGEpIHtcbiAgICB0aGlzLmVtbWl0KCdkYXRhJywgZGF0YSk7XG4gIH1cblxuICBlbW1pdChldmVudCwgZGF0YSkge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICAgIGNhbGxiYWNrcyAmJiBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgYmluZEZ1bGxTY3JlZW4gZnJvbSAnLi9mdWxsLXNjcmVlbic7XG5pbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuaW1wb3J0IFJFUEwgZnJvbSAnLi9SRVBMJztcbmltcG9ydCBTdHJlYW0gZnJvbSAnLi9zdHJlYW0nO1xuXG4vKipcbiAqIE9ubHkgdXNlZCBieSBzb3VyY2UuanMgLSB1bnVzZWQgaW1wb3J0IHNvIGl0IGdldHMgaW50byB0aGUgYnVuZGxlXG4gKi9cbmltcG9ydCBDb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmNsYXNzIFpTSCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRhaW5lciwgc3RhdHVzYmFyLCBjcmVhdGVIVE1MKSB7XG4gICAgaWYgKGNyZWF0ZUhUTUwpIHtcbiAgICAgIHRoaXMuY3JlYXRlKGNvbnRhaW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgdGhpcy5zdGF0dXNiYXIgPSBzdGF0dXNiYXI7XG4gICAgfVxuXG4gICAgdGhpcy5yb290Q29udGFpbmVyID0gdGhpcy5jb250YWluZXI7XG4gICAgdGhpcy5Db21tYW5kTWFuYWdlciA9IG5ldyBDb21tYW5kTWFuYWdlcigpO1xuICAgIHRoaXMuUkVQTCA9IG5ldyBSRVBMKHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlU3RyZWFtcygpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0KCk7XG4gICAgdGhpcy5wcm9tcHQoKTtcblxuICAgIGJpbmRGdWxsU2NyZWVuKHRoaXMuY29udGFpbmVyLnBhcmVudEVsZW1lbnQsIHRoaXMuc2Nyb2xsLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5Db21tYW5kTWFuYWdlci5yZWdpc3RlcignY2xlYXInLCB0aGlzLmNsZWFyLmJpbmQodGhpcykpO1xuICB9XG5cbiAgY3JlYXRlU3RyZWFtcygpIHtcbiAgICB0aGlzLnN0ZGVyciA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZG91dCA9IG5ldyBTdHJlYW0oKTtcblxuICAgIHRoaXMuc3RkZXJyLm9uKCdkYXRhJywgKGQpID0+IHRoaXMub3V0cHV0KGQsICdzdGRlcnInKSk7XG4gICAgdGhpcy5zdGRvdXQub24oJ2RhdGEnLCAoZCkgPT4gdGhpcy5vdXRwdXQoZCwgJ3N0ZG91dCcpKTtcbiAgfVxuXG4gIHB3ZCgpIHtcbiAgICByZXR1cm4gRlMuY3VycmVudFBhdGgucmVwbGFjZShGUy5ob21lLCAnficpO1xuICB9XG5cbiAgJFBTMSgpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPHNwYW4gY2xhc3M9XCJ3aG9cIj5ndWVzdDwvc3Bhbj5cbiAgICAgIG9uXG4gICAgICA8c3BhbiBjbGFzcz1cIndoZXJlXCI+ICR7dGhpcy5wd2QoKX0gPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJicmFuY2hcIj7CsW1hc3Rlcjwvc3Bhbj4mZ3Q7XG4gICAgYDtcbiAgfVxuXG4gIHByb21wdCgpIHtcbiAgICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9ICdwczEnO1xuICAgIGNvZGUuY2xhc3NOYW1lID0gJ2NvZGUnO1xuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSB0aGlzLiRQUzEoKTtcblxuICAgIHJvdy5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQoY29kZSk7XG5cbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuICAgIHRoaXMuUkVQTC51c2UoY29kZSk7XG4gICAgdGhpcy5zdGF0dXModGhpcy5wd2QoKSk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGhpcy5pbnB1dCk7XG4gICAgdGhpcy5pbnB1dC5mb2N1cygpO1xuICB9XG5cbiAgc3RhdHVzKHRleHQpIHtcbiAgICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzYmFyLmlubmVyVGV4dCA9IHRleHQ7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZUlucHV0KCkge1xuICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQuY2xhc3NOYW1lID0gJ2Zha2UtaW5wdXQnO1xuICAgIHRoaXMucm9vdENvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoaW5wdXQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgaW5wdXQuYmx1cigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIGNyZWF0ZShjb250YWluZXIpIHtcbiAgICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWluaW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWF4aW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGl0bGVcIj48L2Rpdj5cbiAgICAgICAgICA8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG4gICAgdGhpcy5zdGF0dXNiYXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnN0YXR1cy1iYXInKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICB2YXIgY29kZXMgPSB0aGlzLmNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjb2RlJyk7XG4gICAgaWYgKCFjb2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFJFUEwudXNlKGNvZGVzW2NvZGVzLmxlbmd0aCAtIDFdLCBaU0gpO1xuICAgIH1cbiAgfVxuXG4gIG91dHB1dCh0ZXh0LCBjbGFzc05hbWUpIHtcbiAgICB2YXIgb3V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3V0LmNsYXNzTmFtZSA9ICdjb2RlICcgKyBbY2xhc3NOYW1lXTtcbiAgICBvdXQuaW5uZXJIVE1MID0gdGV4dDtcblxuICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG91dCk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgfVxuXG4gIHNjcm9sbCgpIHtcbiAgICB2YXIgYyA9IHRoaXMucm9vdENvbnRhaW5lcjtcbiAgICBzZXRUaW1lb3V0KCgpID0+IGMuc2Nyb2xsVG9wID0gYy5zY3JvbGxIZWlnaHQsIDApO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgdGhpcy5wcm9tcHQoKTtcbiAgfVxuXG59XG5cbndpbmRvdy5aU0ggPSBaU0g7XG5leHBvcnQgZGVmYXVsdCBaU0g7XG4iXX0=
