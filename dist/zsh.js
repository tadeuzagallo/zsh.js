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
        options = _CommandManager2['default'].autocomplete(this.command());
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
        _CommandManager2['default'].parse(input, this.zsh.stdin, this.zsh.stdout, this.zsh.stderr, this.zsh.prompt.bind(this.zsh));
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

      span.className = _CommandManager2['default'].isValid(command) ? 'valid' : 'invalid';

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

},{}],"zsh.js/command-manager":[function(require,module,exports){
module.exports=require('8EyLTk');
},{}],"8EyLTk":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

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

exports['default'] = {
  commands: {},
  aliases: {},

  exists: function exists(cmd) {
    var path = _File2['default'].open('/usr/bin');
    return path.open(cmd + '.js').isFile();
  },

  load: function load(cmd) {
    var path = _File2['default'].open('/usr/bin');
    var source = path.open(cmd + '.js');
    var fn;
    if (source.isFile()) {
      var self = this;
      source = source.read();
      source = source.replace(/^import +([A-Za-z]+) +from +'([./\-_A-Za-z]+)'/gm, function (match, variable, file) {
        return 'var ' + variable + ' = require(\'' + file + '\')';
      });
      source = source.replace('export default', 'var __default__ =');
      fn = eval('(function () { ' + source + '; return __default__;})')();
    }
    return fn;
  },

  isValid: function isValid(cmd) {
    return !!(this.commands[cmd] || this.aliases[cmd] || this.exists(cmd));
  },

  autocomplete: function autocomplete(cmd) {
    var matches = [];
    cmd = cmd.toLowerCase();

    Object.keys(this.commands).concat(Object.keys(this.aliases)).forEach(function (command) {
      if (command.substr(0, cmd.length).toLowerCase() === cmd) {
        matches.push(command);
      }
    });

    return matches;
  },

  parse: function parse(cmd, stdin, stdout, stderr, next) {
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
  },

  exec: function exec(cmd, args, stdin, stdout, stderr, next) {
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
  },

  register: function register(cmd, fn) {
    this.commands[cmd] = fn;
  },

  alias: function alias(cmd, original) {
    if (arguments.length === 0) {
      return this.aliases;
    }
    this.aliases[cmd] = original;
  },

  unalias: function unalias(cmd) {
    delete this.aliases[cmd];
  },

  get: function get(cmd) {
    return this.commands[cmd];
  } };
module.exports = exports['default'];

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":"JbJps0"}],"zsh.js/console":[function(require,module,exports){
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
          "mtime": "2016-04-27T23:38:18.000Z",
          "ctime": "2016-04-27T23:38:18.000Z",
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
              "mtime": "2016-04-27T23:38:18.000Z",
              "ctime": "2016-04-27T23:38:18.000Z",
              "content": "# About me\n\nI'm a Software Engineer, currently working at Facebook, in the React Native\nPerformance team.  When I'm not working I like to learn about and play with\nCompilers and Low Level Programming.\n---\n\n# About this website\n\nI wanted something more than a boring portfolio, so I thought it'd be cool to\nwrite a copy of my terminal setup in JavaScript. The bits of it that I managed\nto implement look exactly like what I'm using on my development machine.\n---\n\n# Commands\n\nIf you want to know more about me, there are a few commands:\n  * about  (currently running)\n  * contact \n  * resume\n  * projects\n\nFor the terminal commands you can use `help` to list all the available commands.\n---\n    \n# Tmux is also available!\n\nThe prefix is the default (C-b) which means that you have to press ctrl+b before\nany tmux command.\nThe following commands are available:\n  * c - create a new window\n  * h or left - switch to previous window\n  * l or right - switch to next window\n  * q - close current window\n---\n\nI hope you have as much fun playing with the terminal as I had building it :)\n- @tadeuzagallo\n",
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
          "mtime": "2016-04-28T00:39:28.000Z",
          "ctime": "2016-04-28T00:39:28.000Z",
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
              "mtime": "2016-04-28T00:39:28.000Z",
              "ctime": "2016-04-28T00:39:28.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\nimport File from 'zsh.js/file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  stdout.write('registered commands:');\n  stdout.write(Object.keys(CommandManager.commands).join(' '));\n\n  stdout.write('\\n');\n  stdout.write('executables (on /usr/bin):');\n  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {\n    return file.replace(/\\.js$/, '');\n  }).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n\n  const it = (key) => `${key}=\"${CommandManager.aliases[key]}\"`;\n  stdout.write(Object.keys(CommandManager.aliases).map(it).join(' '));\n\n  next();\n}\n",
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
              "mtime": "2016-04-27T22:49:50.000Z",
              "ctime": "2016-04-27T22:49:50.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var ok = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (target.isDir()) {\n            target.read()[source.filename] = source.self();\n          } else if (source.isFile()) {\n            target.write(source.read(), false, true);\n          } else {\n            console.assert(!target.exists());\n            target.dir.content[target.filename] = source.self();\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (ok) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n}\n",
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
      }

      var _content = '';
      if (append) {
        _content += this.read();
      }

      this.dir.mtime = time;
      this.dir.content[this.filename].mtime = time;
      this.dir.content[this.filename].content = _content + content;
      _FS2['default'].writeFS();
    }
  }, {
    key: 'read',
    value: function read() {
      if (!this.exists()) {
        throw new Error('File %s doesn\'t exist', this.path);
      }
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
      return this.filename ? this.dir.content[this.filename] : this.dir;
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

},{}],"zsh.js/stream":[function(require,module,exports){
module.exports=require('JbJps0');
},{}],"JbJps0":[function(require,module,exports){
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

    this.createStreams();

    this.rootContainer = this.container;
    this.REPL = new _REPL2['default'](this);
    this.FS = _FS2['default'];
    this.initializeInput();
    this.prompt();

    _bindFullScreen2['default'](this.container.parentElement, this.scroll.bind(this));

    _CommandManager2['default'].register('clear', this.clear.bind(this));
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

},{"./REPL":1,"./command-manager":"8EyLTk","./console":"CjB+4o","./fs":"dDj8kd","./full-screen":13,"./stream":"JbJps0"}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNqQixJQUFNLElBQUksR0FBRyxFQUFFLENBQUM7O0FBRWhCLElBQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNqQixJQUFNLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFDcEIsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVqQixJQUFNLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO0FBQy9DLElBQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQztBQUN6QixJQUFNLGlCQUFpQixHQUFHLHVCQUF1QixDQUFDOztJQUU3QixJQUFJO0FBQ1osV0FEUSxJQUFJLENBQ1gsR0FBRyxFQUFFOzs7MEJBREUsSUFBSTs7QUFFckIsUUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEIsUUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDZixRQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNwQixRQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUNwQixRQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQzs7QUFFZixRQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQywwQkFBYSxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQSxDQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5RyxRQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUMvQyxRQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDOztBQUV4QyxRQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbkIsT0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsS0FBSzthQUFLLE1BQUssS0FBSyxDQUFDLEtBQUssQ0FBQztLQUFBLENBQUMsQ0FBQztHQUNwRDs7ZUFka0IsSUFBSTs7V0FnQlosdUJBQUc7QUFDWixVQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUMsVUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0tBQ2hDOzs7V0FFQyxZQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDbEIsT0FBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3hFOzs7V0FFRSxhQUFDLElBQUksRUFBRTtBQUNSLFVBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ2hDLFVBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLGFBQU8sSUFBSSxDQUFDO0tBQ2I7OztXQUVJLGVBQUMsS0FBSyxFQUFFO0FBQ1gsVUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO0FBQ2pCLGVBQU87T0FDUjs7QUFFRCxXQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkIsY0FBUSxLQUFLLENBQUMsT0FBTztBQUNuQixhQUFLLElBQUksQ0FBQztBQUNWLGFBQUssS0FBSztBQUNSLGNBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLGdCQUFNO0FBQUEsQUFDUixhQUFLLEVBQUUsQ0FBQztBQUNSLGFBQUssSUFBSTtBQUNQLGNBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BDLGdCQUFNO0FBQUEsQUFDUixhQUFLLEdBQUc7QUFDTixjQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDcEIsZ0JBQU07QUFBQSxBQUNSLGFBQUssS0FBSztBQUNSLGNBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNkLGdCQUFNO0FBQUEsQUFDUixhQUFLLFNBQVM7QUFDWixjQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDakIsZ0JBQU07QUFBQSxBQUNSO0FBQ0UsY0FBSSxLQUFLLENBQUMsT0FBTyxFQUFFO0FBQ2pCLGdCQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1dBQ3BCLE1BQU07QUFDTCxnQkFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztXQUNwQjtBQUFBLE9BQ0o7S0FDRjs7O1dBRVEsbUJBQUMsU0FBUyxFQUFFO0FBQ25CLFVBQUksU0FBUyxLQUFLLElBQUksRUFBRTtBQUN0QixZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7T0FDMUMsTUFBTTtBQUNMLFlBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztPQUM5RDtBQUNELFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNkOzs7V0FFVyx3QkFBRztBQUNiLFVBQUksT0FBTyxDQUFDO0FBQ1osVUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDOztBQUVqQixVQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ2pDLGVBQU8sR0FBRyw0QkFBZSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7T0FDdkQsTUFBTTtBQUNMLFlBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNuQyxlQUFPLEdBQUcsZ0JBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2pDOztBQUVELFVBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDeEIsWUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFO0FBQ2xCLGNBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLGNBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLGNBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRWQsY0FBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDcEYsTUFBTTtBQUNMLGNBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQztTQUNwQzs7QUFFRCxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQy9CLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNkLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFDO0FBQ3hCLFlBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDekMsWUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUNuQjtLQUNGOzs7V0FFYyx5QkFBQyxTQUFTLEVBQUU7QUFDekIsVUFBSSxTQUFTLEtBQUssRUFBRSxFQUFFO0FBQ3BCLFlBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztPQUN4RCxNQUFNO0FBQ0wsWUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO09BQzlFOztBQUVELFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ25ELFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDL0IsVUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQ2Q7OztXQUVLLGdCQUFDLFlBQVksRUFBRTtBQUNuQixVQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDOztBQUUvQixVQUFJLENBQUMsWUFBWSxFQUFFO0FBQ2pCLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNkOztBQUVELFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRTlCLFVBQUksS0FBSyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ3BFLFlBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDbEQsa0NBQWEsT0FBTyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztPQUMxRzs7QUFFRCxVQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7O0FBRXhDLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs7QUFFYixVQUFJLEtBQUssRUFBRTtBQUNULG9DQUFlLEtBQUssQ0FDbEIsS0FBSyxFQUNMLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQy9CLENBQUM7T0FDSCxNQUFNO0FBQ0wsWUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUNuQjtLQUNGOzs7V0FFTSxpQkFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ2hCLFVBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDOztBQUUxQyxlQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsUUFBUSxFQUFFO0FBQ3BDLGdCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDZixDQUFDLENBQUM7S0FDSjs7O1dBRVUsdUJBQUc7QUFDWixVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV0RCxVQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckIsYUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO09BQ25CO0tBQ0Y7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEIsVUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDaEI7OztXQUVRLHFCQUFHO0FBQ1YsVUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtBQUNsQixZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRixZQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDYixZQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7T0FDZDtLQUNGOzs7V0FFYSx3QkFBQyxLQUFLLEVBQUU7QUFDcEIsVUFBSSxPQUFPLENBQUM7QUFDWixVQUFJLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDOztBQUV6QixVQUFJLEdBQUcsQ0FBQTtBQUNMLFdBQUcsRUFBRSxHQUFHO1FBQ1QsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUM7O0FBRWhCLFVBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFO0FBQzVCLFlBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ25CLGNBQUksSUFBSSxFQUFFLENBQUM7U0FDWjtPQUNGLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7QUFDbkMsWUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ2xCLGNBQUksR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUMzQztPQUNGLE1BQU0sSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUM7QUFDcEMsZUFBTyxHQUFHLGdCQUFnQixDQUFDOztBQUUzQixZQUFJLElBQUksR0FBRyxDQUFDOztBQUVaLFlBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtBQUNsQixjQUFJLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDNUI7O0FBRUQsWUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDakMsTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtBQUNyQyxlQUFPLEdBQUcsWUFBWSxDQUFDO0FBQ3ZCLFlBQUksSUFBSSxHQUFHLENBQUM7O0FBRVosWUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ2xCLGNBQUksSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUM1Qjs7QUFFRCxZQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNqQyxNQUFNLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRTtBQUN6QixZQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7T0FDWDs7QUFFRCxhQUFPLElBQUksQ0FBQztLQUNiOzs7V0FFSyxnQkFBQyxLQUFLLEVBQUU7QUFDWixVQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUM5QyxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQy9CLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFlBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDbkI7S0FDRjs7O1dBRUssZ0JBQUMsS0FBSyxFQUFFO0FBQ1osVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFdEMsVUFBSSxFQUFDLENBQUMsSUFBSSxFQUFFO0FBQ1YsZUFBTztPQUNSOztBQUVELFVBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXJDLFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JGLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNkOzs7V0FFTSxtQkFBRztBQUNSLFVBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO0FBQ3RDLFlBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNqQyxZQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO09BQ2hEOztBQUVELGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN2Qjs7O1dBRWdCLDZCQUFHO0FBQ2xCLFVBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3BDLFlBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUMvQixZQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztPQUN6RDs7QUFFRCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDckI7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM3QyxVQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRXBELFVBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUMsVUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzdCLFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQ3JDLFVBQUksSUFBSSxHQUFHLElBQUksQ0FBQzs7QUFFaEIsVUFBSSxRQUFRLEdBQUcsa0JBQVUsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUNuQyxZQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDO0FBQ3pDLGVBQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7T0FDNUUsQ0FBQzs7QUFFRixVQUFJLENBQUMsU0FBUyxHQUFHLDRCQUFlLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDOztBQUV2RSxVQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUMvQixlQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDekMsTUFBTTtBQUNMLGFBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO09BQ3REOztBQUVELFVBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLFVBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0tBQzlDOzs7U0E1UmtCLElBQUk7OztxQkFBSixJQUFJOzs7Ozs7Ozs7OztBQ3BCekIsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDOztBQUVwQixVQUFVLENBQUMsWUFBWSxHQUFHLFVBQVMsU0FBUyxFQUFFO0FBQzVDLE1BQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNmLE1BQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNkLE1BQUksTUFBTSxHQUFHLEtBQUssQ0FBQztBQUNuQixNQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRVQsT0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsUUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLFFBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0FBQ2pDLFVBQUksTUFBTSxFQUFFO0FBQ1YsWUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFO0FBQ25CLGNBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDN0IsZ0JBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztXQUNqQyxNQUFNO0FBQ0wsaUJBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakIsZ0JBQUksR0FBRyxFQUFFLENBQUM7QUFDVixrQkFBTSxHQUFHLElBQUksQ0FBQztXQUNmO1NBQ0YsTUFBTTtBQUNMLGNBQUksSUFBSSxJQUFJLENBQUM7U0FDZDtPQUNGLE1BQU07QUFDTCxjQUFNLEdBQUcsSUFBSSxDQUFDO09BQ2Y7S0FDRixNQUFNLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNsQyxXQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCLFVBQUksR0FBRyxFQUFFLENBQUM7S0FDWCxNQUFNO0FBQ0wsVUFBSSxJQUFJLElBQUksQ0FBQztLQUNkO0dBQ0Y7O0FBRUQsTUFBSSxNQUFNLEVBQUU7QUFDVixVQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7R0FDeEMsTUFBTSxJQUFJLElBQUksRUFBRTtBQUNmLFNBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEI7O0FBRUQsU0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDOztBQUVGLFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsTUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBRSxJQUFJLEVBQUUsQ0FBQzs7QUFFNUIsTUFBSSxHQUFHLEdBQUc7QUFDUixhQUFTLEVBQUUsRUFBRTtBQUNiLFdBQU8sRUFBRSxFQUFFO0FBQ1gsT0FBRyxFQUFFLElBQUk7R0FDVixDQUFDOztBQUVGLE1BQUksR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVyQyxXQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0FBQ2hDLE9BQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7R0FDaEU7O0FBRUQsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMzQyxRQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxCLFFBQUksQ0FBQyxHQUFHLEVBQUU7QUFDUixlQUFTO0tBQ1Y7O0FBRUQsUUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDN0IsVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QixVQUFJLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQzNCLGlCQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixTQUFDLEVBQUUsQ0FBQztPQUNMLE1BQU07QUFDTCxpQkFBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUMxQjtLQUNGLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3pCLFFBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDM0MsTUFBTTtBQUNMLFNBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCO0dBQ0Y7O0FBRUQsU0FBTyxHQUFHLENBQUM7Q0FDWixDQUFDOztxQkFFYSxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7MEJDbEZGLGVBQWU7Ozs7a0JBQ3ZCLE1BQU07Ozs7b0JBQ0osUUFBUTs7OztzQkFDTixVQUFVOzs7O3FCQUVkO0FBQ2IsVUFBUSxFQUFFLEVBQUU7QUFDWixTQUFPLEVBQUUsRUFBRTs7QUFFWCxRQUFNLEVBQUEsZ0JBQUMsR0FBRyxFQUFFO0FBQ1YsUUFBSSxJQUFJLEdBQUcsa0JBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7R0FDeEM7O0FBRUQsTUFBSSxFQUFBLGNBQUMsR0FBRyxFQUFFO0FBQ1IsUUFBSSxJQUFJLEdBQUcsa0JBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLFFBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLFFBQUksRUFBRSxDQUFDO0FBQ1AsUUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUU7QUFDbkIsVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLFlBQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDdkIsWUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsa0RBQWtELEVBQUUsVUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBSztBQUNyRyx3QkFBYyxRQUFRLHFCQUFlLElBQUksU0FBSztPQUMvQyxDQUFDLENBQUM7QUFDSCxZQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQy9ELFFBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxHQUFHLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztLQUNyRTtBQUNELFdBQU8sRUFBRSxDQUFDO0dBQ1g7O0FBRUQsU0FBTyxFQUFBLGlCQUFDLEdBQUcsRUFBRTtBQUNYLFdBQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQztHQUN4RTs7QUFFRCxjQUFZLEVBQUEsc0JBQUMsR0FBRyxFQUFFO0FBQ2hCLFFBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNqQixPQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDOztBQUV4QixBQUFDLFVBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRTtBQUN4RixVQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxHQUFHLEVBQUU7QUFDdkQsZUFBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztPQUN2QjtLQUNGLENBQUMsQ0FBQzs7QUFFSCxXQUFPLE9BQU8sQ0FBQztHQUNoQjs7QUFFRCxPQUFLLEVBQUEsZUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0FBQ3RDLFFBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3JCLFNBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLFNBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNwQzs7QUFFRCxPQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNyQixRQUFJLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDMUIsUUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFekIsUUFBSSxLQUFLLENBQUM7O0FBRVYsUUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBRTtBQUNoQyxVQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNCLFVBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQ3JDLFVBQUksSUFBSSxHQUFHLEtBQUssQ0FBQzs7QUFFakIsVUFBSSxDQUFDLEFBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNwQyxZQUFJLEVBQUUsQ0FBQztPQUNSOztBQUVELFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pDLFVBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRSxVQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDeEIsVUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU5QixVQUFJLENBQUMsSUFBSSxFQUFFO0FBQ1QsY0FBTSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdDLGVBQU87T0FDUjs7QUFFRCxVQUFJLElBQUksR0FBRyxrQkFBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRTNCLFVBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUU7QUFDeEIsY0FBTSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0QsZUFBTztPQUNSLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRTtBQUMxQixjQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxlQUFPO09BQ1IsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtBQUN2QixjQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRCxlQUFPO09BQ1I7O0FBRUQsVUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNYLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNkOztBQUVELFVBQUksT0FBTyxHQUFHLHlCQUFZLENBQUM7QUFDM0IsYUFBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBUyxJQUFJLEVBQUU7QUFDaEMsWUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztPQUNyQyxDQUFDLENBQUM7O0FBRUgsVUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO0FBQ2hCLGNBQU0sR0FBRyxPQUFPLENBQUM7T0FDbEI7O0FBRUQsVUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7QUFDaEMsY0FBTSxHQUFHLE9BQU8sQ0FBQztPQUNsQjs7QUFFRCxVQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDakIsVUFBSSxHQUFHLFlBQVk7QUFDakIsd0JBQUcsT0FBTyxFQUFFLENBQUM7QUFDYixhQUFLLEVBQUUsQ0FBQztPQUNULENBQUM7S0FDSDs7QUFFRCxRQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDdkQ7O0FBRUQsTUFBSSxFQUFBLGNBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7QUFDM0MsUUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3JCLFVBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFBLENBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlELFVBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckUsYUFBTztLQUNSOztBQUVELFFBQUksRUFBRSxDQUFDO0FBQ1AsUUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssVUFBVSxFQUFFO0FBQzVDLFFBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCLE1BQU0sSUFBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRyxFQUNqQyxNQUFNO0FBQ0wsWUFBTSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUMvQyxVQUFJLEVBQUUsQ0FBQztBQUNQLGFBQU87S0FDUjs7QUFFRCxRQUFJO0FBQ0YsVUFBSSxHQUFHLHdCQUFXLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixRQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDdkQsQ0FBQyxPQUFPLEdBQUcsRUFBRTtBQUNaLFlBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLFVBQUksRUFBRSxDQUFDO0tBQ1I7R0FDRjs7QUFFRCxVQUFRLEVBQUEsa0JBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRTtBQUNoQixRQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUN6Qjs7QUFFRCxPQUFLLEVBQUEsZUFBQyxHQUFHLEVBQUUsUUFBUSxFQUFFO0FBQ25CLFFBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDMUIsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3JCO0FBQ0QsUUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUM7R0FDOUI7O0FBRUQsU0FBTyxFQUFBLGlCQUFDLEdBQUcsRUFBRTtBQUNYLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUMxQjs7QUFFRCxLQUFHLEVBQUEsYUFBQyxHQUFHLEVBQUU7QUFDUCxXQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDM0IsRUFDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7O21CQ2pLZSxPQUFPOzs7O0FBRnZCLFlBQVksQ0FBQzs7QUFJYixJQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztBQUNoQyxJQUFNLFNBQVMsR0FBRyxtQkFBQyxJQUFJO1NBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQ04sSUFBSSxFQUNKLFVBQUMsQ0FBQztXQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFO0dBQUEsQ0FDbkMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0NBQUEsQ0FBQzs7SUFFTyxPQUFPO0FBQ2YsV0FEUSxPQUFPLENBQ2QsTUFBTSxFQUFFLE1BQU0sRUFBRTswQkFEVCxPQUFPOztBQUV4QixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztHQUN0Qjs7ZUFKa0IsT0FBTzs7V0FNdkIsZUFBRztBQUNKLFVBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ3pDOzs7V0FFSSxpQkFBRztBQUNOLFVBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ3pDOzs7V0FFSSxpQkFBRztBQUNOLHVCQUFJLEtBQUssRUFBRSxDQUFDO0tBQ2I7OztTQWhCa0IsT0FBTzs7O3FCQUFQLE9BQU87Ozs7QUNYNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztrQkNoS2UsTUFBTTs7OztBQUVyQixJQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7O0lBRS9FLElBQUk7QUFDWixXQURRLElBQUksQ0FDWCxJQUFJLEVBQUU7MEJBREMsSUFBSTs7QUFFckIsUUFBSSxDQUFDLElBQUksR0FBRyxnQkFBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkMsUUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLFFBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzNCLFFBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7QUFDckMsUUFBSSxDQUFDLEdBQUcsR0FBRyxnQkFBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2xDOztlQVBrQixJQUFJOztXQWlCWCx3QkFBRztBQUNiLGFBQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUM7S0FDL0I7OztXQUVNLG1CQUFHO0FBQ1IsYUFBTyxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztLQUM5RDs7O1dBRUssa0JBQUc7QUFDUCxhQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssV0FBVyxDQUFBLEFBQUMsQ0FBQztLQUNyRzs7O1dBRUssa0JBQUc7QUFDUCxhQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztLQUNoRDs7O1dBRUksaUJBQUc7QUFDTixhQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FDakIsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFBLEFBQUMsQ0FBQztLQUNwRTs7O1dBRUssbUJBQUc7QUFDUCxVQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtBQUNqQixlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN2Qyx3QkFBRyxPQUFPLEVBQUUsQ0FBQztPQUNkO0tBQ0Y7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzdCOzs7V0FFSSxlQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO0FBQzVCLFVBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7QUFFL0IsVUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtBQUNsQixZQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUU7QUFDM0IsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN2QixNQUFNO0FBQ0wsZ0JBQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9DO09BQ0YsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ3pCLGNBQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQzdEOztBQUVELFVBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztBQUNsQixVQUFJLE1BQU0sRUFBRTtBQUNWLGdCQUFRLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO09BQ3pCOztBQUVELFVBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUN0QixVQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUM3QyxVQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFDN0Qsc0JBQUcsT0FBTyxFQUFFLENBQUM7S0FDZDs7O1dBRUcsZ0JBQUc7QUFDTCxVQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ2xCLGNBQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3REO0FBQ0QsYUFBTyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7S0FDbkY7OztXQUVNLGlCQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFO0FBQ2hDLFVBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ2pCLGNBQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3REOztBQUVELFVBQUksQ0FBQyxTQUFTLEVBQUU7QUFDZCxpQkFBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztPQUNqQzs7QUFFRCxVQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUc7QUFDaEMsYUFBSyxFQUFFLFNBQVM7QUFDaEIsYUFBSyxFQUFFLFNBQVM7QUFDaEIsZUFBTyxFQUFFLE9BQU87QUFDaEIsWUFBSSxFQUFFLElBQUk7T0FDWCxDQUFDOztBQUVGLHNCQUFHLE9BQU8sRUFBRSxDQUFDO0tBQ2Q7OztXQUVXLHNCQUFDLFNBQVMsRUFBRTtBQUN0QixVQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDbEM7OztXQUVTLG9CQUFDLFNBQVMsRUFBRTtBQUNwQixVQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDbEM7OztXQUVHLGdCQUFHO0FBQ0wsYUFBTyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0tBQ25FOzs7V0FFRyxjQUFDLElBQUksRUFBRTtBQUNULGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztLQUMxQzs7O1dBRUssa0JBQUc7QUFDUCxVQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRTFCLFVBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ2pCLGVBQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQztPQUN2QixNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO0FBQ3ZCLGVBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7T0FDcEMsTUFBTTtBQUNMLGVBQU8sQ0FBQyxDQUFDO09BQ1Y7S0FDRjs7O1dBRUksaUJBQUc7QUFDTixVQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRXBDLFVBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzFELFVBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtBQUMzRCxlQUFPLFdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO09BQzVDLE1BQU07QUFDTCxlQUFPLFdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7T0FDaEU7S0FDRjs7O1dBaElVLGNBQUMsSUFBSSxFQUFFO0FBQ2hCLGFBQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdkI7OztXQUVtQix3QkFBRztBQUNyQixhQUFPLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDakM7OztTQWZrQixJQUFJOzs7cUJBQUosSUFBSTs7Ozs7O0FDSnpCLFlBQVksQ0FBQzs7QUFFYixJQUFJLHNCQUFzQixHQUFHLGdDQUFVLEdBQUcsRUFBRTtBQUFFLFNBQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDO0NBQUUsQ0FBQzs7QUFFekcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFO0FBQzNDLE9BQUssRUFBRSxJQUFJO0NBQ1osQ0FBQyxDQUFDOztBQUVILElBQUksYUFBYSxHQUFHLE9BQU8sQ0FSRixpQkFBaUIsQ0FBQSxDQUFBOztBQVUxQyxJQUFJLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFSM0QsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ1osSUFBSSxlQUFlLEdBQUcsYUFBYSxDQUFDOztBQUVwQyxFQUFFLENBQUMsT0FBTyxHQUFHLFlBQVk7QUFDdkIsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBYSxPQUFPLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEUsQ0FBQzs7QUFHRixFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFhLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQzVELElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQy9DLElBQUksSUFBSSxHQUFHLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7QUFDbEMsT0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7QUFDcEIsT0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUN0QjtDQUNGLENBQUM7O0FBRUYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNoQyxJQUFFLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztDQUN0QixNQUFNO0FBQ0wsTUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzs7QUFFcEMsR0FBQyxTQUFTLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQzNCLFFBQUksT0FBTyxHQUFHLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRTtBQUN0QyxXQUFLLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDNUIsWUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxQixZQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUV6QixZQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtBQUNkLFdBQUMsR0FBRztBQUNGLGlCQUFLLEVBQUUsSUFBSTtBQUNYLGlCQUFLLEVBQUUsSUFBSTtBQUNYLG1CQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU87QUFDbEIsZ0JBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxRQUFRLEdBQUcsR0FBRyxHQUFHLEdBQUc7V0FDeEMsQ0FBQztTQUNIOztBQUVELFlBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFO0FBQ3pDLGNBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDWixNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7QUFDekIsaUJBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDZjtPQUNGO0tBQ0Y7R0FDRixDQUFBLENBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQzs7QUFFeEIsSUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0NBQ2Q7O0FBRUQsRUFBRSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQztBQUMxQyxFQUFFLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDOztBQUVwRCxFQUFFLENBQUMsT0FBTyxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQzNCLFNBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQy9DLENBQUM7O0FBRUYsRUFBRSxDQUFDLFFBQVEsR0FBRyxVQUFVLElBQUksRUFBRTtBQUM1QixTQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDOUIsQ0FBQzs7QUFFRixFQUFFLENBQUMsYUFBYSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ2pDLE1BQUksS0FBSyxDQUFDOztBQUVWLE1BQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRWxDLE1BQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUNuQixRQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsR0FBSSxJQUFJLENBQUM7R0FDckU7O0FBRUQsTUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXZCLFNBQU0sRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQSxFQUFHO0FBQ25DLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUMzQjs7QUFFRCxTQUFNLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUEsRUFBRztBQUNsQyxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztHQUN2Qjs7QUFFRCxNQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDbkIsUUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQ2Q7O0FBRUQsTUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNuQixRQUFJLEdBQUcsSUFBTSxDQUFDO0dBQ2Y7O0FBRUQsU0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDcEQsQ0FBQzs7QUFFRixFQUFFLENBQUMsUUFBUSxHQUFHLFVBQVMsSUFBSSxFQUFFO0FBQzNCLE1BQUksR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUU5QixTQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztDQUN0QyxDQUFDOztBQUdGLEVBQUUsQ0FBQyxJQUFJLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDeEIsTUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ25CLFFBQUksR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQy9COztBQUVELE1BQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRWhELE1BQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDbEIsU0FBTSxJQUFJLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUU7QUFDaEMsT0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7R0FDakM7O0FBRUQsU0FBTyxHQUFHLENBQUM7Q0FDWixDQUFDOztBQUVGLEVBQUUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDMUIsU0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN4QixDQUFDOztBQUVGLEVBQUUsQ0FBQyxLQUFLLEdBQUcsWUFBWTtBQUNyQixTQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztDQUN0QyxDQUFDOztBQUVGLEVBQUUsQ0FBQyxRQUFRLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ2hDLFNBQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLDJCQUEyQixDQUFDLENBQUM7Q0FDeEQsQ0FBQzs7QUFFRixFQUFFLENBQUMsWUFBWSxHQUFHLFVBQVUsS0FBSyxFQUFFO0FBQ2pDLE1BQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDckMsTUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDOztBQUVqQixNQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDM0IsUUFBSSxJQUFJLEdBQUcsQ0FBQztHQUNiOztBQUVELE1BQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixRQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RDLFFBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzlELFFBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUIsUUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLFFBQUksVUFBVSxHQUFHLElBQUksQ0FBQzs7QUFFdEIsUUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNSLFVBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLGNBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDcEMsZ0JBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQztBQUNuQyxTQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMzQjs7QUFFRCxRQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFO0FBQzFDLFdBQUssSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUMzQixZQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLEVBQUU7QUFDN0QsY0FBSSxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRTtBQUNoRCxlQUFHLElBQUksR0FBRyxDQUFDO1dBQ1o7O0FBRUQsaUJBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkI7T0FDRjtLQUNGO0dBQ0Y7O0FBRUQsU0FBTyxPQUFPLENBQUM7Q0FDaEIsQ0FBQzs7QUFVRixPQUFPLENBQUMsU0FBUyxDQUFDLEdBUkgsRUFBRSxDQUFBO0FBU2pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7QUM1S3BDLFlBQVksQ0FBQzs7QUFFYixNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVMsU0FBUyxFQUFFLE1BQU0sRUFBRTtBQUMzQyxRQUFNLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQzs7QUFFekIsV0FBUyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDLEVBQUU7QUFDN0QsS0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDOztBQUVuQixRQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixJQUMzQixDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsSUFDNUIsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLElBQy9CLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFHO0FBQ3RDLFVBQUksU0FBUyxDQUFDLGlCQUFpQixFQUFFO0FBQy9CLGlCQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztPQUMvQixNQUFNLElBQUksU0FBUyxDQUFDLG1CQUFtQixFQUFFO0FBQ3hDLGlCQUFTLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztPQUNqQyxNQUFNLElBQUksU0FBUyxDQUFDLG9CQUFvQixFQUFFO0FBQ3pDLGlCQUFTLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztPQUNsQyxNQUFNLElBQUksU0FBUyxDQUFDLHVCQUF1QixFQUFFO0FBQzVDLGlCQUFTLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7T0FDakU7S0FDRixNQUFNO0FBQ0wsVUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFO0FBQzNCLGdCQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7T0FDM0IsTUFBTSxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTtBQUNwQyxnQkFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7T0FDN0IsTUFBTSxJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRTtBQUN2QyxnQkFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUM7T0FDaEMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRTtBQUN4QyxnQkFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7T0FDakM7S0FDRjtHQUNGLENBQUM7Q0FDSCxDQUFDOzs7QUNqQ0YsWUFBWSxDQUFDOztBQUViLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxZQUFZLEtBQUssV0FBVyxHQUNsRDtBQUNFLFNBQU8sRUFBRSxtQkFBVyxFQUFFO0FBQ3RCLFNBQU8sRUFBRSxtQkFBVztBQUFFLFdBQU8sSUFBSSxDQUFDO0dBQUU7Q0FDckMsR0FFRCxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7OztJQ1JNLE1BQU07QUFDZCxXQURRLE1BQU0sR0FDWDswQkFESyxNQUFNOztBQUV2QixRQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztHQUN0Qjs7ZUFIa0IsTUFBTTs7V0FLdkIsWUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ2xCLFVBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzNCLFlBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO09BQzdCOztBQUVELFVBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3ZDOzs7V0FFSSxlQUFDLElBQUksRUFBRTtBQUNWLFVBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzFCOzs7V0FFSSxlQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7QUFDakIsVUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxlQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUNqRCxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2hCLENBQUMsQ0FBQztLQUNKOzs7U0F0QmtCLE1BQU07OztxQkFBTixNQUFNOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OEJDQUEsZUFBZTs7Ozs4QkFDZixtQkFBbUI7Ozs7a0JBQy9CLE1BQU07Ozs7b0JBQ0osUUFBUTs7OztzQkFDTixVQUFVOzs7Ozs7Ozt1QkFLVCxXQUFXOzs7O0lBRXpCLEdBQUc7QUFDSSxXQURQLEdBQUcsQ0FDSyxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTswQkFEMUMsR0FBRzs7QUFFTCxRQUFJLFVBQVUsRUFBRTtBQUNkLFVBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDeEIsTUFBTTtBQUNMLFVBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQzNCLFVBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0tBQzVCOztBQUVELFFBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7QUFFckIsUUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ3BDLFFBQUksQ0FBQyxJQUFJLEdBQUcsc0JBQVMsSUFBSSxDQUFDLENBQUM7QUFDM0IsUUFBSSxDQUFDLEVBQUUsa0JBQUssQ0FBQztBQUNiLFFBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN2QixRQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRWQsZ0NBQWUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7QUFFckUsZ0NBQWUsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0dBQ3pEOztlQXBCRyxHQUFHOztXQXNCTSx5QkFBRzs7O0FBQ2QsVUFBSSxDQUFDLEtBQUssR0FBRyx5QkFBWSxDQUFDO0FBQzFCLFVBQUksQ0FBQyxNQUFNLEdBQUcseUJBQVksQ0FBQztBQUMzQixVQUFJLENBQUMsTUFBTSxHQUFHLHlCQUFZLENBQUM7O0FBRTNCLFVBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFDLENBQUM7ZUFBSyxNQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO09BQUEsQ0FBQyxDQUFDO0FBQ3hELFVBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFDLENBQUM7ZUFBSyxNQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO09BQUEsQ0FBQyxDQUFDOztBQUV4RCxZQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFVBQUMsS0FBSyxFQUFLO0FBQzVDLGNBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUN6QixDQUFDLENBQUM7S0FDSjs7O1dBRUUsZUFBRztBQUNKLGFBQU8sZ0JBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBRyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDN0M7OztXQUVHLGdCQUFHO0FBQ0wsK0ZBR3lCLElBQUksQ0FBQyxHQUFHLEVBQUUsbUVBRWpDO0tBQ0g7OztXQUVLLGtCQUFHO0FBQ1AsVUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QyxVQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFDLFVBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRTFDLFVBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLFVBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDOztBQUV4QixVQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7QUFFN0IsU0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUV0QixVQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQyxVQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixVQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNkLFNBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLFVBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDcEI7OztXQUVLLGdCQUFDLElBQUksRUFBRTtBQUNYLFVBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUNsQixZQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7T0FDakM7S0FDRjs7O1dBRWMsMkJBQUc7QUFDaEIsVUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxXQUFLLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztBQUMvQixVQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFDLENBQUMsRUFBSztBQUNsRCxTQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDbkIsWUFBSSxLQUFLLEtBQUssUUFBUSxDQUFDLGFBQWEsRUFBRTtBQUNwQyxlQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDZCxNQUFNO0FBQ0wsZUFBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2Y7T0FDRixDQUFDLENBQUM7O0FBRUgsVUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7S0FDcEI7OztXQUVLLGdCQUFDLFNBQVMsRUFBRTtBQUNoQixVQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRTtBQUNqQyxpQkFBUyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7T0FDaEQ7O0FBRUQsZUFBUyxDQUFDLFNBQVMsaWNBY2xCLENBQUM7O0FBRUYsVUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JELFVBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUN6RDs7O1dBRUssa0JBQUc7QUFDUCxVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFELFVBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ2pCLFlBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUNmLE1BQU07QUFDTCxZQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztPQUM3QztLQUNGOzs7V0FFSyxnQkFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO0FBQ3RCLFVBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEMsU0FBRyxDQUFDLFNBQVMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0QyxTQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzs7QUFFckIsVUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ2Y7OztXQUVLLGtCQUFHO0FBQ1AsVUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUMzQixnQkFBVSxDQUFDO2VBQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWTtPQUFBLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDbkQ7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQzlCLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNmOzs7U0E3SUcsR0FBRzs7O0FBaUpULE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO3FCQUNGLEdBQUciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcbmltcG9ydCBMb2NhbFN0b3JhZ2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuLy8gVE9ETzogSW1wbGVtZW50IFZJIGJpbmRpbmdzXG5cbmNvbnN0IExFRlQgPSAzNztcbmNvbnN0IFVQID0gMzg7XG5jb25zdCBSSUdIVCA9IDM5O1xuY29uc3QgRE9XTiA9IDQwO1xuXG5jb25zdCBUQUIgPSA5O1xuY29uc3QgRU5URVIgPSAxMztcbmNvbnN0IEJBQ0tTUEFDRSA9IDg7XG5jb25zdCBTUEFDRSA9IDMyO1xuXG5jb25zdCBISVNUT1JZX1NUT1JBR0VfS0VZID0gJ1RFUk1JTkFMX0hJU1RPUlknO1xuY29uc3QgSElTVE9SWV9TSVpFID0gMTAwO1xuY29uc3QgSElTVE9SWV9TRVBBUkFUT1IgPSAnJSVISVNUT1JZX1NFUEFSQVRPUiUlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkVQTCB7XG4gIGNvbnN0cnVjdG9yKHpzaCkge1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMubGFzdEtleSA9IG51bGw7XG4gICAgdGhpcy56c2ggPSB6c2g7XG5cbiAgICB0aGlzLmZ1bGxIaXN0b3J5ID0gKFtMb2NhbFN0b3JhZ2UuZ2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZKV0gKyAnJykuc3BsaXQoSElTVE9SWV9TRVBBUkFUT1IpLmZpbHRlcihTdHJpbmcpO1xuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoMCkgfHwgW107XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXG4gICAgdGhpcy5jcmVhdGVDYXJldCgpO1xuICAgIHpzaC5zdGRpbi5vbignZGF0YScsIChldmVudCkgPT4gdGhpcy5wYXJzZShldmVudCkpO1xuICB9XG5cbiAgY3JlYXRlQ2FyZXQoKSB7XG4gICAgdGhpcy5jYXJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB0aGlzLmNhcmV0LmNsYXNzTmFtZSA9ICdjYXJldCc7XG4gIH1cblxuICBvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAoKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkpLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgdXNlKHNwYW4pIHtcbiAgICB0aGlzLnNwYW4gJiYgdGhpcy5yZW1vdmVDYXJldCgpO1xuICAgIHRoaXMuc3BhbiA9IHNwYW47XG4gICAgdGhpcy53cml0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcGFyc2UoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQubWV0YUtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICBjYXNlIExFRlQ6XG4gICAgICBjYXNlIFJJR0hUOlxuICAgICAgICB0aGlzLm1vdmVDYXJldChldmVudC5rZXlDb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFVQOlxuICAgICAgY2FzZSBET1dOOlxuICAgICAgICB0aGlzLm5hdmlnYXRlSGlzdG9yeShldmVudC5rZXlDb2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRBQjpcbiAgICAgICAgdGhpcy5hdXRvY29tcGxldGUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEVOVEVSOlxuICAgICAgICB0aGlzLnN1Ym1pdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQkFDS1NQQUNFOlxuICAgICAgICB0aGlzLmJhY2tzcGFjZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChldmVudC5jdHJsS2V5KSB7XG4gICAgICAgICAgdGhpcy5hY3Rpb24oZXZlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1vdmVDYXJldChkaXJlY3Rpb24pIHtcbiAgICBpZiAoZGlyZWN0aW9uID09PSBMRUZUKSB7XG4gICAgICB0aGlzLmluZGV4ID0gTWF0aC5tYXgodGhpcy5pbmRleCAtIDEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluZGV4ID0gTWF0aC5taW4odGhpcy5pbmRleCArIDEsIHRoaXMuaW5wdXQubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIGF1dG9jb21wbGV0ZSgpIHtcbiAgICB2YXIgb3B0aW9ucztcbiAgICB2YXIgcGF0aCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuY29tbWFuZCgpID09PSB0aGlzLmlucHV0KSB7XG4gICAgICBvcHRpb25zID0gQ29tbWFuZE1hbmFnZXIuYXV0b2NvbXBsZXRlKHRoaXMuY29tbWFuZCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5wb3AoKTtcbiAgICAgIG9wdGlvbnMgPSBGUy5hdXRvY29tcGxldGUocGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAocGF0aCAhPT0gZmFsc2UpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgcGF0aC5wb3AoKTtcbiAgICAgICAgcGF0aC5wdXNoKCcnKTtcblxuICAgICAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5yZXBsYWNlKC8gW14gXSokLywgJyAnICsgcGF0aC5qb2luKCcvJykgKyBvcHRpb25zLnNoaWZ0KCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnB1dCA9IG9wdGlvbnMuc2hpZnQoKSArICcgJztcbiAgICAgIH1cblxuICAgICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5sZW5ndGgpe1xuICAgICAgdGhpcy56c2guc3Rkb3V0LndyaXRlKG9wdGlvbnMuam9pbignICcpKTtcbiAgICAgIHRoaXMuenNoLnByb21wdCgpO1xuICAgIH1cbiAgfVxuXG4gIG5hdmlnYXRlSGlzdG9yeShkaXJlY3Rpb24pIHtcbiAgICBpZiAoZGlyZWN0aW9uID09PSBVUCkge1xuICAgICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1heCh0aGlzLmhpc3RvcnlJbmRleCAtIDEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhpc3RvcnlJbmRleCA9IE1hdGgubWluKHRoaXMuaGlzdG9yeUluZGV4ICsgMSwgdGhpcy5oaXN0b3J5Lmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIHRoaXMuaW5wdXQgPSB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdIHx8ICcnO1xuICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBzdWJtaXQocHJldmVudFdyaXRlKSB7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuXG4gICAgaWYgKCFwcmV2ZW50V3JpdGUpIHtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLmlucHV0LnRyaW0oKTtcblxuICAgIGlmIChpbnB1dCAmJiBpbnB1dCAhPT0gdGhpcy5mdWxsSGlzdG9yeVt0aGlzLmZ1bGxIaXN0b3J5Lmxlbmd0aCAtIDFdKSB7XG4gICAgICB0aGlzLmZ1bGxIaXN0b3J5W3RoaXMuZnVsbEhpc3RvcnkubGVuZ3RoXSA9IGlucHV0O1xuICAgICAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oSElTVE9SWV9TVE9SQUdFX0tFWSwgdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgtSElTVE9SWV9TSVpFKS5qb2luKEhJU1RPUllfU0VQQVJBVE9SKSk7XG4gICAgfVxuXG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgwKTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICBpZiAoaW5wdXQpIHtcbiAgICAgIENvbW1hbmRNYW5hZ2VyLnBhcnNlKFxuICAgICAgICBpbnB1dCxcbiAgICAgICAgdGhpcy56c2guc3RkaW4sXG4gICAgICAgIHRoaXMuenNoLnN0ZG91dCxcbiAgICAgICAgdGhpcy56c2guc3RkZXJyLFxuICAgICAgICB0aGlzLnpzaC5wcm9tcHQuYmluZCh0aGlzLnpzaClcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuenNoLnByb21wdCgpO1xuICAgIH1cbiAgfVxuXG4gIHRyaWdnZXIoZXZ0LCBtc2cpIHtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5saXN0ZW5lcnNbZXZ0XSB8fCBbXTtcblxuICAgIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sobXNnKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlbW92ZUNhcmV0KCkge1xuICAgIHZhciBjYXJldCA9IHRoaXMuc3Bhbi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYXJldCcpO1xuXG4gICAgaWYgKGNhcmV0ICYmIGNhcmV0WzBdKSB7XG4gICAgICBjYXJldFswXS5yZW1vdmUoKTtcbiAgICB9XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLmlucHV0ID0gJyc7XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gIH1cblxuICBiYWNrc3BhY2UoKSB7XG4gICAgaWYgKHRoaXMuaW5kZXggPiAwKSB7XG4gICAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCAtIDEpICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgICB0aGlzLmluZGV4LS07XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfVxuICB9XG5cbiAgYWN0dWFsQ2hhckNvZGUoZXZlbnQpIHtcbiAgICB2YXIgb3B0aW9ucztcbiAgICB2YXIgY29kZSA9IGV2ZW50LmtleUNvZGU7XG5cbiAgICBjb2RlID0ge1xuICAgICAgMTczOiAxODlcbiAgICB9W2NvZGVdIHx8IGNvZGU7XG5cbiAgICBpZiAoY29kZSA+PSA2NSAmJiBjb2RlIDw9IDkwKSB7XG4gICAgICBpZiAoIWV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gMzI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHtcbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlID0gJykhQCMkJV4mKignLmNoYXJDb2RlQXQoY29kZSAtIDQ4KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gMTg2ICYmIGNvZGUgPD0gMTkyKXtcbiAgICAgIG9wdGlvbnMgPSAnOz0sLS4vYDorPF8+P34nO1xuXG4gICAgICBjb2RlIC09IDE4NjtcblxuICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgIGNvZGUgKz0gb3B0aW9ucy5sZW5ndGggLyAyO1xuICAgICAgfVxuXG4gICAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICAgIH0gZWxzZSBpZiAoY29kZSA+PSAyMTkgJiYgY29kZSA8PSAyMjIpIHtcbiAgICAgIG9wdGlvbnMgPSAnW1xcXFxdXFwne3x9XCInO1xuICAgICAgY29kZSAtPSAyMTk7XG5cbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICAgIH1cblxuICAgICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgICB9IGVsc2UgaWYgKGNvZGUgIT09IFNQQUNFKSB7XG4gICAgICBjb2RlID0gLTE7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBhY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC5rZXlDb2RlKSA9PT0gJ0MnKSB7XG4gICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgICB0aGlzLmlucHV0ID0gJyc7XG4gICAgICB0aGlzLnN1Ym1pdCh0cnVlKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoZXZlbnQpIHtcbiAgICB2YXIgY29kZSA9IHRoaXMuYWN0dWFsQ2hhckNvZGUoZXZlbnQpO1xuXG4gICAgaWYgKCF+Y29kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjaGFyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcblxuICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnN1YnN0cigwLCB0aGlzLmluZGV4KSArIGNoYXIgKyB0aGlzLmlucHV0LnN1YnN0cih0aGlzLmluZGV4KTtcbiAgICB0aGlzLmluZGV4Kys7XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgY29tbWFuZCgpIHtcbiAgICBpZiAodGhpcy5pbnB1dCAhPT0gdGhpcy5fX2lucHV0Q29tbWFuZCkge1xuICAgICAgdGhpcy5fX2lucHV0Q29tbWFuZCA9IHRoaXMuaW5wdXQ7XG4gICAgICB0aGlzLl9fY29tbWFuZCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5zaGlmdCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9fY29tbWFuZDtcbiAgfVxuXG4gIGNvbW1hbmRBcmdzU3RyaW5nKCkge1xuICAgIGlmICh0aGlzLmlucHV0ICE9PSB0aGlzLl9faW5wdXRDQXJncykge1xuICAgICAgdGhpcy5fX2lucHV0Q0FyZ3MgPSB0aGlzLmlucHV0O1xuICAgICAgdGhpcy5fX2NhcmdzID0gdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5jb21tYW5kKCkubGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fX2NhcmdzO1xuICB9XG5cbiAgd3JpdGUoKSB7XG4gICAgdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSA9IHRoaXMuaW5wdXQ7XG4gICAgdGhpcy5jYXJldC5pbm5lckhUTUwgPSB0aGlzLmlucHV0W3RoaXMuaW5kZXhdIHx8ICcnO1xuXG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvbW1hbmQgPSB0aGlzLmNvbW1hbmQoKTtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLmNvbW1hbmRBcmdzU3RyaW5nKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHB1dENhcmV0ID0gZnVuY3Rpb24gKHN0ciwgaW5kZXgpIHtcbiAgICAgIHNlbGYuY2FyZXQuaW5uZXJUZXh0ID0gc3RyW2luZGV4XSB8fCAnICc7XG4gICAgICByZXR1cm4gc3RyLnN1YnN0cigwLCBpbmRleCkgKyBzZWxmLmNhcmV0Lm91dGVySFRNTCArIHN0ci5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICB9O1xuXG4gICAgc3Bhbi5jbGFzc05hbWUgPSBDb21tYW5kTWFuYWdlci5pc1ZhbGlkKGNvbW1hbmQpID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJztcblxuICAgIGlmICh0aGlzLmluZGV4IDwgY29tbWFuZC5sZW5ndGgpIHtcbiAgICAgIGNvbW1hbmQgPSBwdXRDYXJldChjb21tYW5kLCB0aGlzLmluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5wdXQgPSBwdXRDYXJldChpbnB1dCwgdGhpcy5pbmRleCAtIGNvbW1hbmQubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBzcGFuLmlubmVySFRNTCA9IGNvbW1hbmQ7XG4gICAgdGhpcy5zcGFuLmlubmVySFRNTCA9IHNwYW4ub3V0ZXJIVE1MICsgaW5wdXQ7XG4gIH1cbn1cbiIsInZhciBBcmdzUGFyc2VyID0ge307XG5cbkFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzID0gZnVuY3Rpb24ocmF3U3RyaW5nKSB7XG4gIHZhciBfYXJncyA9IFtdO1xuICB2YXIgd29yZCA9ICcnO1xuICB2YXIgc3RyaW5nID0gZmFsc2U7XG4gIHZhciBpLCBsO1xuXG4gIGZvciAoaSA9IDAsIGwgPSByYXdTdHJpbmcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNoYXIgPSByYXdTdHJpbmdbaV07XG4gICAgaWYgKGNoYXIgPT09ICdcIicgfHwgY2hhciA9PT0gJ1xcJycpIHtcbiAgICAgIGlmIChzdHJpbmcpIHtcbiAgICAgICAgaWYgKGNoYXIgPT09IHN0cmluZykge1xuICAgICAgICAgIGlmIChyYXdTdHJpbmdbaSAtIDFdID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgIHdvcmQgPSB3b3JkLnNsaWNlKDAsIC0xKSArIGNoYXI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9hcmdzLnB1c2god29yZCk7XG4gICAgICAgICAgICB3b3JkID0gJyc7XG4gICAgICAgICAgICBzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3b3JkICs9IGNoYXI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0cmluZyA9IGNoYXI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjaGFyID09PSAnICcgJiYgIXN0cmluZykge1xuICAgICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgICAgIHdvcmQgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgd29yZCArPSBjaGFyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdHJpbmcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VudGVybWluYXRlZCBzdHJpbmcnKTtcbiAgfSBlbHNlIGlmICh3b3JkKSB7XG4gICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgfVxuXG4gIHJldHVybiBfYXJncztcbn07XG5cbkFyZ3NQYXJzZXIucGFyc2UgPSBmdW5jdGlvbiAoYXJncykge1xuICBhcmdzID0gKFthcmdzXSArICcnKS50cmltKCk7XG5cbiAgdmFyIG91dCA9IHtcbiAgICBhcmd1bWVudHM6IFtdLFxuICAgIG9wdGlvbnM6IHt9LFxuICAgIHJhdzogYXJnc1xuICB9O1xuXG4gIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyhhcmdzKTtcblxuICBmdW5jdGlvbiBhZGRPcHRpb24ob3B0aW9uLCB2YWx1ZSkge1xuICAgIG91dC5vcHRpb25zW29wdGlvbl0gPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiB0cnVlO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKCFhcmcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3Vic3RyKDAsIDIpID09PSAnLS0nKSB7XG4gICAgICB2YXIgbmV4dCA9IGFyZ3NbaSArIDFdO1xuICAgICAgaWYgKG5leHQgJiYgbmV4dFswXSAhPT0gJy0nKSB7XG4gICAgICAgIGFkZE9wdGlvbihhcmcuc3Vic3RyKDIpLCBuZXh0KTtcbiAgICAgICAgaSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnWzBdID09PSAnLScpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChhcmcuc3Vic3RyKDEpLCBhZGRPcHRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYXJndW1lbnRzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQXJnc1BhcnNlcjtcbiIsIi8qZXNsaW50IG5vLWV2YWw6IDAqL1xuaW1wb3J0IEFyZ3NQYXJzZXIgZnJvbSAnLi9hcmdzLXBhcnNlcic7XG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5pbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xuaW1wb3J0IFN0cmVhbSBmcm9tICcuL3N0cmVhbSc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY29tbWFuZHM6IHt9LFxuICBhbGlhc2VzOiB7fSxcblxuICBleGlzdHMoY21kKSB7XG4gICAgdmFyIHBhdGggPSBGaWxlLm9wZW4oJy91c3IvYmluJyk7XG4gICAgcmV0dXJuIHBhdGgub3BlbihjbWQgKyAnLmpzJykuaXNGaWxlKCk7XG4gIH0sXG5cbiAgbG9hZChjbWQpIHtcbiAgICB2YXIgcGF0aCA9IEZpbGUub3BlbignL3Vzci9iaW4nKTtcbiAgICB2YXIgc291cmNlID0gcGF0aC5vcGVuKGNtZCArICcuanMnKTtcbiAgICB2YXIgZm47XG4gICAgaWYgKHNvdXJjZS5pc0ZpbGUoKSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc291cmNlID0gc291cmNlLnJlYWQoKTtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC9eaW1wb3J0ICsoW0EtWmEtel0rKSArZnJvbSArJyhbLi9cXC1fQS1aYS16XSspJy9nbSwgKG1hdGNoLCB2YXJpYWJsZSwgZmlsZSkgPT4ge1xuICAgICAgICByZXR1cm4gYHZhciAke3ZhcmlhYmxlfSA9IHJlcXVpcmUoJyR7ZmlsZX0nKWA7XG4gICAgICB9KTtcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKCdleHBvcnQgZGVmYXVsdCcsICd2YXIgX19kZWZhdWx0X18gPScpO1xuICAgICAgZm4gPSBldmFsKCcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlICsgJzsgcmV0dXJuIF9fZGVmYXVsdF9fO30pJykoKTtcbiAgICB9XG4gICAgcmV0dXJuIGZuO1xuICB9LFxuXG4gIGlzVmFsaWQoY21kKSB7XG4gICAgcmV0dXJuICEhKHRoaXMuY29tbWFuZHNbY21kXSB8fCB0aGlzLmFsaWFzZXNbY21kXSB8fCB0aGlzLmV4aXN0cyhjbWQpKTtcbiAgfSxcblxuICBhdXRvY29tcGxldGUoY21kKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICBjbWQgPSBjbWQudG9Mb3dlckNhc2UoKTtcblxuICAgIChPYmplY3Qua2V5cyh0aGlzLmNvbW1hbmRzKS5jb25jYXQoT2JqZWN0LmtleXModGhpcy5hbGlhc2VzKSkpLmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICAgIGlmIChjb21tYW5kLnN1YnN0cigwLCBjbWQubGVuZ3RoKS50b0xvd2VyQ2FzZSgpID09PSBjbWQpIHtcbiAgICAgICAgbWF0Y2hlcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoZXM7XG4gIH0sXG5cbiAgcGFyc2UoY21kLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgICBpZiAofmNtZC5pbmRleE9mKCd8JykpIHtcbiAgICAgIGNtZCA9IGNtZC5zcGxpdCgnfCcpO1xuICAgICAgY21kLmZvckVhY2godGhpcy5wYXJzZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBjbWQgPSBjbWQuc3BsaXQoJyAnKTtcbiAgICB2YXIgY29tbWFuZCA9IGNtZC5zaGlmdCgpO1xuICAgIHZhciBhcmdzID0gY21kLmpvaW4oJyAnKTtcblxuICAgIHZhciBpbmRleDtcblxuICAgIGlmICh+KGluZGV4ID0gYXJncy5pbmRleE9mKCc+JykpKSB7XG4gICAgICB2YXIgcHJldiA9IGFyZ3NbaW5kZXggLSAxXTtcbiAgICAgIHZhciBhcHBlbmQgPSBhcmdzW2luZGV4ICsgMV0gPT09ICc+JztcbiAgICAgIHZhciBpbml0ID0gaW5kZXg7XG5cbiAgICAgIGlmICh+KFsnMScsICcyJywgJyYnXSkuaW5kZXhPZihwcmV2KSkge1xuICAgICAgICBpbml0LS07XG4gICAgICB9XG5cbiAgICAgIHZhciBfYXJncyA9IGFyZ3Muc3Vic3RyKDAsIGluaXQpO1xuICAgICAgYXJncyA9IGFyZ3Muc3Vic3RyKGluZGV4ICsgYXBwZW5kICsgMSkuc3BsaXQoJyAnKS5maWx0ZXIoU3RyaW5nKTtcbiAgICAgIHZhciBwYXRoID0gYXJncy5zaGlmdCgpO1xuICAgICAgYXJncyA9IF9hcmdzICsgYXJncy5qb2luKCcgJyk7XG5cbiAgICAgIGlmICghcGF0aCkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogcGFyc2UgZXJyb3IgbmVhciBgXFxcXG5cXCcnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcblxuICAgICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vdCBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBpcyBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhcHBlbmQpIHtcbiAgICAgICAgZmlsZS5jbGVhcigpO1xuICAgICAgfVxuXG4gICAgICB2YXIgX3N0ZG91dCA9IG5ldyBTdHJlYW0oKTtcbiAgICAgIF9zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIGZpbGUud3JpdGUoZGF0YSArICdcXG4nLCB0cnVlLCB0cnVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocHJldiAhPT0gJzInKSB7XG4gICAgICAgIHN0ZG91dCA9IF9zdGRvdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcmV2ID09PSAnMicgfHwgcHJldiA9PT0gJyYnKSB7XG4gICAgICAgIHN0ZGVyciA9IF9zdGRvdXQ7XG4gICAgICB9XG5cbiAgICAgIHZhciBfbmV4dCA9IG5leHQ7XG4gICAgICBuZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBGUy53cml0ZUZTKCk7XG4gICAgICAgIF9uZXh0KCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuZXhlYyhjb21tYW5kLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICB9LFxuXG4gIGV4ZWMoY21kLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgICBpZiAodGhpcy5hbGlhc2VzW2NtZF0pIHtcbiAgICAgIHZhciBsaW5lID0gKHRoaXMuYWxpYXNlc1tjbWRdICsgJyAnICsgYXJncykudHJpbSgpLnNwbGl0KCcgJyk7XG4gICAgICB0aGlzLmV4ZWMobGluZS5zaGlmdCgpLCBsaW5lLmpvaW4oJyAnKSwgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZm47XG4gICAgaWYgKHR5cGVvZiB0aGlzLmNvbW1hbmRzW2NtZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGZuID0gdGhpcy5jb21tYW5kc1tjbWRdO1xuICAgIH0gZWxzZSBpZiAoKGZuID0gdGhpcy5sb2FkKGNtZCkpKSB7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ZGVyci53cml0ZSgnenNoOiBjb21tYW5kIG5vdCBmb3VuZDogJyArIGNtZCk7XG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlKGFyZ3MpO1xuICAgICAgZm4uY2FsbCh1bmRlZmluZWQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGRlcnIud3JpdGUoZXJyLnN0YWNrKTtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0sXG5cbiAgcmVnaXN0ZXIoY21kLCBmbikge1xuICAgIHRoaXMuY29tbWFuZHNbY21kXSA9IGZuO1xuICB9LFxuXG4gIGFsaWFzKGNtZCwgb3JpZ2luYWwpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuYWxpYXNlcztcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VzW2NtZF0gPSBvcmlnaW5hbDtcbiAgfSxcblxuICB1bmFsaWFzKGNtZCkge1xuICAgIGRlbGV0ZSB0aGlzLmFsaWFzZXNbY21kXTtcbiAgfSxcblxuICBnZXQoY21kKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHNbY21kXTtcbiAgfSxcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHpzaCBmcm9tICcuL3pzaCc7XG5cbmNvbnN0IG1hcCA9IEFycmF5LnByb3RvdHlwZS5tYXA7XG5jb25zdCBzdHJpbmdpZnkgPSAoYXJncykgPT5cbiAgbWFwLmNhbGwoXG4gICAgYXJncyxcbiAgICAoYSkgPT4gSlNPTi5zdHJpbmdpZnkoYSkgfHwgW2FdKycnXG4gICkuam9pbignICcpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb25zb2xlIHtcbiAgY29uc3RydWN0b3Ioc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICB0aGlzLnN0ZG91dCA9IHN0ZG91dDtcbiAgICB0aGlzLnN0ZGVyciA9IHN0ZGVycjtcbiAgfVxuXG4gIGxvZygpIHtcbiAgICB0aGlzLnN0ZG91dC53cml0ZShzdHJpbmdpZnkoYXJndW1lbnRzKSk7XG4gIH1cblxuICBlcnJvcigpIHtcbiAgICB0aGlzLnN0ZGVyci53cml0ZShzdHJpbmdpZnkoYXJndW1lbnRzKSk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB6c2guY2xlYXIoKTtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgXCJjb250ZW50XCI6IHtcbiAgICBcIlVzZXJzXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgIFwiZ3Vlc3RcIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIzOjM4OjE4LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMzozODoxOC4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiLnZpbXJjXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi56c2hyY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhYm91dC5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIzOjM4OjE4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjM6Mzg6MTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIEFib3V0IG1lXFxuXFxuSSdtIGEgU29mdHdhcmUgRW5naW5lZXIsIGN1cnJlbnRseSB3b3JraW5nIGF0IEZhY2Vib29rLCBpbiB0aGUgUmVhY3QgTmF0aXZlXFxuUGVyZm9ybWFuY2UgdGVhbS4gIFdoZW4gSSdtIG5vdCB3b3JraW5nIEkgbGlrZSB0byBsZWFybiBhYm91dCBhbmQgcGxheSB3aXRoXFxuQ29tcGlsZXJzIGFuZCBMb3cgTGV2ZWwgUHJvZ3JhbW1pbmcuXFxuLS0tXFxuXFxuIyBBYm91dCB0aGlzIHdlYnNpdGVcXG5cXG5JIHdhbnRlZCBzb21ldGhpbmcgbW9yZSB0aGFuIGEgYm9yaW5nIHBvcnRmb2xpbywgc28gSSB0aG91Z2h0IGl0J2QgYmUgY29vbCB0b1xcbndyaXRlIGEgY29weSBvZiBteSB0ZXJtaW5hbCBzZXR1cCBpbiBKYXZhU2NyaXB0LiBUaGUgYml0cyBvZiBpdCB0aGF0IEkgbWFuYWdlZFxcbnRvIGltcGxlbWVudCBsb29rIGV4YWN0bHkgbGlrZSB3aGF0IEknbSB1c2luZyBvbiBteSBkZXZlbG9wbWVudCBtYWNoaW5lLlxcbi0tLVxcblxcbiMgQ29tbWFuZHNcXG5cXG5JZiB5b3Ugd2FudCB0byBrbm93IG1vcmUgYWJvdXQgbWUsIHRoZXJlIGFyZSBhIGZldyBjb21tYW5kczpcXG4gICogYWJvdXQgIChjdXJyZW50bHkgcnVubmluZylcXG4gICogY29udGFjdCBcXG4gICogcmVzdW1lXFxuICAqIHByb2plY3RzXFxuXFxuRm9yIHRoZSB0ZXJtaW5hbCBjb21tYW5kcyB5b3UgY2FuIHVzZSBgaGVscGAgdG8gbGlzdCBhbGwgdGhlIGF2YWlsYWJsZSBjb21tYW5kcy5cXG4tLS1cXG4gICAgXFxuIyBUbXV4IGlzIGFsc28gYXZhaWxhYmxlIVxcblxcblRoZSBwcmVmaXggaXMgdGhlIGRlZmF1bHQgKEMtYikgd2hpY2ggbWVhbnMgdGhhdCB5b3UgaGF2ZSB0byBwcmVzcyBjdHJsK2IgYmVmb3JlXFxuYW55IHRtdXggY29tbWFuZC5cXG5UaGUgZm9sbG93aW5nIGNvbW1hbmRzIGFyZSBhdmFpbGFibGU6XFxuICAqIGMgLSBjcmVhdGUgYSBuZXcgd2luZG93XFxuICAqIGggb3IgbGVmdCAtIHN3aXRjaCB0byBwcmV2aW91cyB3aW5kb3dcXG4gICogbCBvciByaWdodCAtIHN3aXRjaCB0byBuZXh0IHdpbmRvd1xcbiAgKiBxIC0gY2xvc2UgY3VycmVudCB3aW5kb3dcXG4tLS1cXG5cXG5JIGhvcGUgeW91IGhhdmUgYXMgbXVjaCBmdW4gcGxheWluZyB3aXRoIHRoZSB0ZXJtaW5hbCBhcyBJIGhhZCBidWlsZGluZyBpdCA6KVxcbi0gQHRhZGV1emFnYWxsb1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNvbnRhY3QubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBBbGwgbXkgY29udGFjdHMsIGZlZWwgZnJlZSB0byByZWFjaCBtZSBhdCBhbnkgb2YgdGhlc2VcXG5cXG4qIDxhIGhyZWY9XFxcIm1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tXFxcIiBhbHQ9XFxcIkVtYWlsXFxcIj5bRW1haWxdKG1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiR2l0SHViXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dpdEh1Yl0oaHR0cHM6Ly9naXRodWIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJUd2l0dGVyXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W1R3aXR0ZXJdKGh0dHBzOi8vdHdpdHRlci5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJGYWNlYm9va1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltGYWNlYm9va10oaHR0cHM6Ly9mYWNlYm9vay5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG9cXFwiIGFsdD1cXFwiR29vZ2xlICtcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bR29vZ2xlICtdKGh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OVxcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltMaW5rZWRpbl0oaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OSk8L2E+XFxuKiA8YSBocmVmPVxcXCJza3lwZTovL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCI+W1NreXBlXShza3lwZTovL3RhZGV1emFnYWxsbyk8L2E+XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHJvamVjdHMubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiRm9yIG5vdyB5b3UgY2FuIGhhdmUgYSBsb29rIGF0IHRoaXMgb25lISA6KVxcbihUaGF0J3Mgd2hhdCBJJ20gZG9pbmcpXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVhZG1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImZvbyBiYXIgYmF6XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVzdW1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgVGFkZXUgWmFnYWxsbyBkYSBTaWx2YVxcbi0tLVxcblxcbiMjIFByb2ZpbGVcXG4tLS0gXFxuICBJIGFtIHBhc3Npb25hdGUgZm9yIGFsbCBraW5kcyBvZiBkZXZlbG9wbWVudCwgbG92ZSB0byBsZWFybiBuZXcgbGFuZ3VhZ2VzIGFuZCBwYXJhZGlnbXMsIGFsd2F5cyByZWFkeSBmb3IgYSBnb29kIGNoYWxsZW5nZS5cXG4gIEkgYWxzbyBsaWtlIE1hdGgsIEdhbWUgZGV2ZWxvcG1lbnQgYW5kIHdoZW4gcG9zc2libGUgY29udHJpYnV0ZSB0byBvcGVuIHNvdXJjZSBwcm9qZWN0cy5cXG5cXG4jIyBHZW5lcmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuICAqIEVtYWlsOiB0YWRldXphZ2FsbG9AZ21haWwuY29tXFxuICAqIFBob25lOiArNTUgMzIgODg2MyAzNjg0XFxuICAqIFNreXBlOiB0YWRldXphZ2FsbG9cXG4gICogR2l0aHViOiBnaXRodWIuY29tL3RhZGV1emFnYWxsb1xcbiAgKiBMb2NhdGlvbjogSnVpeiBkZSBGb3JhL01HLCBCcmF6aWxcXG5cXG4jIyBFZHVjYXRpb25hbCBCYWNrZ3JvdW5kXFxuLS0tXFxuXFxuICAqIFdlYiBEZXZlbG9wbWVudCBhdCBJbnN0aXR1dG8gVmlhbm5hIEp1bmlvciwgMjAxMFxcbiAgKiBHZW5lcmFsIEVuZ2xpc2ggYXQgVGhlIENhcmx5bGUgSW5zdGl0dXRlLCAyMDExXFxuXFxuIyBXb3JrIEV4cGVyaWVuY2VcXG4tLS1cXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUXJhbmlvKjwvaT4gZnJvbSA8aT4qRGVjZW1iZXIsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gUXJhbmlvIGlzIGEgc3RhcnR1cCB0aGF0IGdyZXcgaW5zaWRlIHRoZSBjb21wYW55IEkgd29yayAoZU1pb2xvLmNvbSkgYW5kIEkgd2FzIGludml0ZWQgdG8gbGVhZCB0aGUgaU9TIGRldmVsb3BtZW50IHRlYW1cXG4gICAgICBvbiBhIGNvbXBsZXRlbHkgcmV3cml0ZW4gdmVyc2lvbiBvZiB0aGUgYXBwXFxuXFxuICAqIDxpPipXZWIgYW5kIE1vYmlsZSBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQm9udXoqPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBJIHN0YXJ0ZWQgZGV2ZWxvcGluZyB0aGUgaU9TIGFwcCBhcyBhIGZyZWVsYW5jZXIsIGFmdGVyIHRoZSBhcHAgd2FzIHB1Ymxpc2hlZCBJIHdhcyBpbnZpdGVkIHRvIG1haW50YWluIHRoZSBSdWJ5IG9uIFJhaWxzXFxuICAgICAgYXBpIGFuZCB3b3JrIG9uIHRoZSBBbmRyb2lkIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KmVNaW9sby5jb20qPC9pPiBmcm9tIDxpPipBcHJpbCwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBUaGUgY29tcGFueSBqdXN0IHdvcmtlZCB3aXRoIFBIUCwgc28gSSBqb2luZWQgd2l0aCB0aGUgaW50ZW50aW9uIG9mIGJyaW5naW5nIG5ldyB0ZWNobm9sb2dpZXMuIFdvcmtlZCB3aXRoIFB5dGhvbiwgUnVieSwgaU9TLFxcbiAgICAgIEFuZHJvaWQgYW5kIEhUTUw1IGFwcGxpY2F0aW9uc1xcblxcbiAgKiA8aT4qaU9TIERldmVsb3Blcio8L2k+IGF0IDxpPipQcm9Eb2N0b3IgU29mdHdhcmUgTHRkYS4qPC9pPiBmcm9tIDxpPipKdWx5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kk9jdG9iZXIsIDIwMTIqPC9pPlxcbiAgICAtIEJyaWVmbHkgd29ya2VkIHdpdGggdGhlIGlPUyB0ZWFtIG9uIHRoZSBkZXZlbG9wbWVudCBvZiB0aGVpciBmaXJzdCBtb2JpbGUgdmVyc2lvbiBvZiB0aGVpciBtYWluIHByb2R1Y3QsIGEgbWVkaWNhbCBzb2Z0d2FyZVxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipBdG8gSW50ZXJhdGl2byo8L2k+IGZyb20gPGk+KkZlYnJ1YXJ5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kkp1bHksIDIwMTIqPC9pPlxcbiAgICAtIE1vc3Qgb2YgdGhlIHdvcmsgd2FzIHdpdGggUEhQIGFuZCBNeVNRTCwgYWxzbyB3b3JraW5nIHdpdGggSmF2YVNjcmlwdCBvbiB0aGUgY2xpZW50IHNpZGUuIFdvcmtlZCB3aXRoIE1TU1FMXFxuICAgICAgYW5kIE9yYWNsZSBkYXRhYmFzZXMgYXMgd2VsbFxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipNYXJpYSBGdW1hY8ynYSBDcmlhY8ynb8yDZXMqPC9pPiBmcm9tIDxpPipPY3RvYmVyLCAyMDEwKjwvaT4gdW50aWwgPGk+Kkp1bmUsIDIwMTEqPC9pPlxcbiAgICAtIEkgd29ya2VkIG1vc3RseSB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gbWFraW5nIHRoZSBmcm9udCBlbmQgd2l0aCBIVE1MIGFuZCBDU1MgYW5kIG1vc3QgYW5pbWF0aW9ucyBpbiBKYXZhU2NyaXB0LFxcbiAgICAgIGFsdGhvdWdoIEkgYWxzbyB3b3JrZWQgd2l0aCBhIGZldyBpbiBBUzMuIEJyaWVmbHkgd29ya2VkIHdpdGggTW9uZ29EQlxcblxcbiMjIEFkZGl0aW9uYWwgSW5mb3JtYXRpb25cXG4tLS1cXG5cXG4qIEV4cGVyaWVuY2UgdW5kZXIgTGludXggYW5kIE9TIFggZW52aXJvbm1lbnRcXG4qIFN0dWRlbnQgRXhjaGFuZ2U6IDYgbW9udGhzIG9mIHJlc2lkZW5jZSBpbiBJcmVsYW5kXFxuXFxuIyMgTGFuZ3VhZ2VzXFxuLS0tXFxuXFxuKiBQb3J0dWd1ZXNlIOKAkyBOYXRpdmUgU3BlYWtlclxcbiogRW5nbGlzaCDigJMgRmx1ZW50IExldmVsXFxuKiBTcGFuaXNoIOKAkyBJbnRlcm1lZGlhdGUgTGV2ZWxcXG5cXG4jIyBQcm9ncmFtbWluZyBsYW5ndWFnZXMgKG9yZGVyZWQgYnkga25vd2xlZGdlKVxcbi0tLVxcblxcbiogSmF2YVNjcmlwdFxcbiogT2JqZWN0aXZlwq1DXFxuKiBDL0MrK1xcbiogUnVieSBvbiBSYWlsc1xcbiogTm9kZUpTXFxuKiBQSFBcXG4qIEphdmFcXG4qIFB5dGhvblxcblxcbiMjIEFkZGl0aW9uYWwgc2tpbGxzXFxuLS0tXFxuXFxuKiBIVE1MNS9DU1MzXFxuKiBNVkNcXG4qIERlc2lnbiBQYXR0ZXJuc1xcbiogVEREL0JERFxcbiogR2l0XFxuKiBBbmFseXNpcyBhbmQgRGVzaWduIG9mIEFsZ29yaXRobXNcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInR5cGVcIjogXCJkXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH0sXG4gICAgXCJ1c3JcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI4VDAwOjM5OjI4LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yOFQwMDozOToyOC4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNDo0My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI0OjQzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJ3pzaC5qcy9jb21tYW5kLW1hbmFnZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBidWZmZXIgPSAnJztcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGtleSA9IGFyZ3MuYXJndW1lbnRzLnNoaWZ0KCk7XFxuICAgIHZhciBpbmRleDtcXG4gICAgaWYgKH4oaW5kZXggPSBrZXkuaW5kZXhPZignPScpKSkge1xcbiAgICAgIHZhciBjb21tYW5kO1xcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggJiYgaW5kZXggPT09IGtleS5sZW5ndGggLSAxKSB7XFxuICAgICAgICBjb21tYW5kID0gYXJncy5hcmd1bWVudHMuam9pbignICcpO1xcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICBjb21tYW5kID0ga2V5LnN1YnN0cihpbmRleCArIDEpO1xcbiAgICAgIH1cXG5cXG4gICAgICBrZXkgPSBrZXkuc3Vic3RyKDAsIGluZGV4KTtcXG5cXG4gICAgICBpZiAoY29tbWFuZCkge1xcbiAgICAgICAgQ29tbWFuZE1hbmFnZXIuYWxpYXMoa2V5LCBjb21tYW5kKTtcXG4gICAgICB9XFxuICAgIH1cXG4gIH0gZWxzZSB7XFxuICAgIHZhciBhbGlhc2VzID0gQ29tbWFuZE1hbmFnZXIuYWxpYXMoKTtcXG5cXG4gICAgZm9yICh2YXIgaSBpbiBhbGlhc2VzKSB7XFxuICAgICAgYnVmZmVyICs9IGkgKyAnPVxcXFwnJyArIGFsaWFzZXNbaV0gKyAnXFxcXCdcXFxcbic7XFxuICAgIH1cXG4gIH1cXG5cXG4gIHN0ZG91dC53cml0ZShidWZmZXIpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjYXQuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTozMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjMyLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnY2F0JywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignY2F0JywgcGF0aCwgJ0lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHN0ZG91dC53cml0ZShmaWxlLnJlYWQoKSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjQ0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHBhdGggPSBhcmdzLmFyZ3VtZW50c1swXSB8fCAnfic7XFxuICB2YXIgZGlyID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgaWYgKCFkaXIuZXhpc3RzKCkpIHtcXG4gICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdjZCcsIHBhdGgpKTtcXG4gIH0gZWxzZSBpZiAoZGlyLmlzRmlsZSgpKSB7XFxuICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignY2QnLCBwYXRoLCAnSXMgYSBmaWxlJykpO1xcbiAgfSBlbHNlIHtcXG4gICAgRlMuY3VycmVudFBhdGggPSBkaXIucGF0aDtcXG4gICAgRlMuY3VycmVudERpciA9IGRpci5zZWxmKCk7XFxuICB9XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImVjaG8uanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo1Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjU3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEFyZ3NQYXJzZXIgZnJvbSAnenNoLmpzL2FyZ3MtcGFyc2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB0cnkge1xcbiAgICBzdGRvdXQud3JpdGUoQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncy5yYXcpLmpvaW4oJyAnKSk7XFxuICB9IGNhdGNoIChlcnIpIHtcXG4gICAgc3RkZXJyLndyaXRlKCd6c2g6ICcgKyBlcnIubWVzc2FnZSk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImhlbHAuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yOFQwMDozOToyOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI4VDAwOjM5OjI4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJ3pzaC5qcy9jb21tYW5kLW1hbmFnZXInO1xcbmltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBzdGRvdXQud3JpdGUoJ3JlZ2lzdGVyZWQgY29tbWFuZHM6Jyk7XFxuICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoQ29tbWFuZE1hbmFnZXIuY29tbWFuZHMpLmpvaW4oJyAnKSk7XFxuXFxuICBzdGRvdXQud3JpdGUoJ1xcXFxuJyk7XFxuICBzdGRvdXQud3JpdGUoJ2V4ZWN1dGFibGVzIChvbiAvdXNyL2Jpbik6Jyk7XFxuICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoRmlsZS5vcGVuKCcvdXNyL2JpbicpLnJlYWQoKSkubWFwKGZ1bmN0aW9uKGZpbGUpIHtcXG4gICAgcmV0dXJuIGZpbGUucmVwbGFjZSgvXFxcXC5qcyQvLCAnJyk7XFxuICB9KS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdhbGlhc2VzOicpO1xcblxcbiAgY29uc3QgaXQgPSAoa2V5KSA9PiBgJHtrZXl9PVxcXCIke0NvbW1hbmRNYW5hZ2VyLmFsaWFzZXNba2V5XX1cXFwiYDtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5hbGlhc2VzKS5tYXAoaXQpLmpvaW4oJyAnKSk7XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MTYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoxNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBpZiAoIWFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICBhcmdzLmFyZ3VtZW50cy5wdXNoKCcuJyk7XFxuICB9XFxuXFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGRpciA9IEZpbGUub3BlbihhcmcpO1xcblxcbiAgICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbHMnLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2xzJywgYXJnLCAnSXMgYSBmaWxlJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHZhciBmaWxlcyA9IE9iamVjdC5rZXlzKGRpci5yZWFkKCkpO1xcblxcbiAgICAgIGlmICghYXJncy5vcHRpb25zLmEpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMuZmlsdGVyKGZ1bmN0aW9uIChmaWxlKSB7XFxuICAgICAgICAgIHJldHVybiBmaWxlWzBdICE9PSAnLic7XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcXG4gICAgICAgIHN0ZG91dC53cml0ZShhcmcgKyAnOicpO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAoYXJncy5vcHRpb25zLmwpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMubWFwKGZ1bmN0aW9uIChuYW1lKSB7XFxuICAgICAgICAgIHZhciBmaWxlID0gZGlyLm9wZW4obmFtZSk7XFxuICAgICAgICAgIHZhciB0eXBlID0gZmlsZS5pc0RpcigpID8gJ2QnIDogJy0nO1xcbiAgICAgICAgICB2YXIgcGVybXMgPSB0eXBlICsgJ3J3LXItLXItLSc7XFxuXFxuICAgICAgICAgIHJldHVybiBwZXJtcyArICcgZ3Vlc3QgZ3Vlc3QgJyArIGZpbGUubGVuZ3RoKCkgKyAnICcgKyBmaWxlLm10aW1lKCkgKyAnICcgKyBuYW1lO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIHN0ZG91dC53cml0ZShmaWxlcy5qb2luKGFyZ3Mub3B0aW9ucy5sID8gJ1xcXFxuJyA6ICcgJykpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm1rZGlyLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ21rZGlyJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbWtkaXInLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ0ZpbGUgZXhpc3RzJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuY3JlYXRlRm9sZGVyKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtdi5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIyOjQ5OjUwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjI6NDk6NTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHRhcmdldFBhdGggPSBhcmdzLmFyZ3VtZW50cy5wb3AoKTtcXG4gIHZhciBzb3VyY2VQYXRocyA9IGFyZ3MuYXJndW1lbnRzO1xcbiAgdmFyIHRhcmdldCA9IEZpbGUub3Blbih0YXJnZXRQYXRoKTtcXG5cXG4gIGlmICghdGFyZ2V0UGF0aCB8fFxcbiAgICAgICFzb3VyY2VQYXRocy5sZW5ndGggfHxcXG4gICAgICAgIChzb3VyY2VQYXRocy5sZW5ndGggPiAxICYmXFxuICAgICAgICAgKCF0YXJnZXQuZXhpc3RzKCkgfHwgdGFyZ2V0LmlzRmlsZSgpKVxcbiAgICAgICAgKVxcbiAgICAgKSB7XFxuICAgIHN0ZGVyci53cml0ZSgndXNhZ2U6IG12IHNvdXJjZSB0YXJnZXRcXFxcbiBcXFxcdCBtdiBzb3VyY2UgLi4uIGRpcmVjdG9yeScpO1xcbiAgfSBlbHNlIGlmICghdGFyZ2V0LnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdtdicsIHRhcmdldC5kaXJuYW1lKSk7XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYmFja3VwID0gdGFyZ2V0LnNlbGYoKTtcXG4gICAgdmFyIG9rID0gc291cmNlUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChzdWNjZXNzLCBzb3VyY2VQYXRoKSB7XFxuICAgICAgaWYgKHN1Y2Nlc3MpIHtcXG4gICAgICAgIHZhciBzb3VyY2UgPSBGaWxlLm9wZW4oc291cmNlUGF0aCk7XFxuXFxuICAgICAgICBpZiAoIXNvdXJjZS5leGlzdHMoKSkge1xcbiAgICAgICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212Jywgc291cmNlUGF0aHNbMF0pKTtcXG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLmlzRGlyKCkgJiYgdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbXYnLCAncmVuYW1lICcgKyBzb3VyY2VQYXRoc1swXSArICcgdG8gJyArIHRhcmdldFBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICBpZiAodGFyZ2V0LmlzRGlyKCkpIHtcXG4gICAgICAgICAgICB0YXJnZXQucmVhZCgpW3NvdXJjZS5maWxlbmFtZV0gPSBzb3VyY2Uuc2VsZigpO1xcbiAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5pc0ZpbGUoKSkge1xcbiAgICAgICAgICAgIHRhcmdldC53cml0ZShzb3VyY2UucmVhZCgpLCBmYWxzZSwgdHJ1ZSk7XFxuICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgY29uc29sZS5hc3NlcnQoIXRhcmdldC5leGlzdHMoKSk7XFxuICAgICAgICAgICAgdGFyZ2V0LmRpci5jb250ZW50W3RhcmdldC5maWxlbmFtZV0gPSBzb3VyY2Uuc2VsZigpO1xcbiAgICAgICAgICB9XFxuXFxuICAgICAgICAgIHNvdXJjZS5kZWxldGUoKTtcXG4gICAgICAgICAgcmV0dXJuIHRydWU7XFxuICAgICAgICB9XFxuICAgICAgfVxcblxcbiAgICAgIHJldHVybiBmYWxzZTtcXG4gICAgfSwgdHJ1ZSk7XFxuXFxuICAgIGlmIChvaykge1xcbiAgICAgIEZTLndyaXRlRlMoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0YXJnZXQuZGlyW3RhcmdldC5maWxlbmFtZV0gPSBiYWNrdXA7XFxuICAgIH1cXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHdkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjoyOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwd2QgPSBGUy5jdXJyZW50UGF0aDtcXG5cXG4gIGlmIChzdGRvdXQpIHtcXG4gICAgc3Rkb3V0LndyaXRlKHB3ZCk7XFxuICAgIG5leHQoKTtcXG4gIH0gZWxzZSB7XFxuICAgIHJldHVybiBwd2Q7XFxuICB9XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJtLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjozMy4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybScsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybScsIGFyZywgJ2lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybWRpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjM4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSB8fCAhZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm1kaXInLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybWRpcicsIGFyZywgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic291cmNlLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo0NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIi8qZXNsaW50IG5vLWV2YWw6IDAqL1xcbmltcG9ydCBDb25zb2xlIGZyb20gJ3pzaC5qcy9jb25zb2xlJztcXG5pbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihhcmdzLmFyZ3VtZW50c1swXSk7XFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZSgnc291cmNlOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0cnkge1xcbiAgICAgICAgdmFyIGNvbnNvbGUgPSBuZXcgQ29uc29sZShzdGRvdXQsIHN0ZGVycik7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcXG4gICAgICAgIHZhciByZXN1bHQgPSBKU09OLnN0cmluZ2lmeShldmFsKGZpbGUucmVhZCgpKSk7XFxuICAgICAgICBzdGRvdXQud3JpdGUoJzwtICcgKyByZXN1bHQpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm90IGVub3VnaCBhcmd1bWVudHMnKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwidG91Y2guanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjUzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgndG91Y2gnLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKXtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3RvdWNoJywgcGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLndyaXRlKCcnLCB0cnVlLCB0cnVlKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInVuYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjU4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJ3pzaC5qcy9jb21tYW5kLW1hbmFnZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBjbWQgPSBhcmdzLmFyZ3VtZW50c1swXTtcXG5cXG4gIGlmIChjbWQpIHtcXG4gICAgQ29tbWFuZE1hbmFnZXIudW5hbGlhcyhjbWQpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInR5cGVcIjogXCJkXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH1cbiAgfSxcbiAgXCJ0eXBlXCI6IFwiZFwiXG59IiwiaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuXG5jb25zdCBNT05USFMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbGUge1xuICBjb25zdHJ1Y3RvcihwYXRoKSB7XG4gICAgdGhpcy5wYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgICBwYXRoID0gdGhpcy5wYXRoLnNwbGl0KCcvJyk7XG4gICAgdGhpcy5maWxlbmFtZSA9IHBhdGgucG9wKCk7XG4gICAgdGhpcy5kaXJuYW1lID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgIHRoaXMuZGlyID0gRlMub3Blbih0aGlzLmRpcm5hbWUpO1xuICB9XG5cbiAgc3RhdGljIG9wZW4ocGF0aCkge1xuICAgIHJldHVybiBuZXcgRmlsZShwYXRoKTtcbiAgfVxuXG4gIHN0YXRpYyBnZXRUaW1lc3RhbXAgKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIH1cblxuICBwYXJlbnRFeGlzdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlyICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1ZhbGlkKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5kaXIgPT09ICdvYmplY3QnICYmIHRoaXMuZGlyLnR5cGUgPT09ICdkJztcbiAgfVxuXG4gIGV4aXN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHR5cGVvZiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdICE9PSAndW5kZWZpbmVkJyk7XG4gIH1cblxuICBpc0ZpbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiYgdGhpcy5maWxlbmFtZSAmJlxuICAgICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS50eXBlID09PSAnZic7XG4gIH1cblxuICBpc0RpcigpIHtcbiAgICByZXR1cm4gdGhpcy5leGlzdHMoKSAmJlxuICAgICAgKCF0aGlzLmZpbGVuYW1lIHx8IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2QnKTtcbiAgfVxuXG4gIGRlbGV0ZSgpIHtcbiAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV07XG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfVxuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy53cml0ZSgnJywgZmFsc2UsIHRydWUpO1xuICB9XG5cbiAgd3JpdGUoY29udGVudCwgYXBwZW5kLCBmb3JjZSkge1xuICAgIHZhciB0aW1lID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcblxuICAgIGlmICghdGhpcy5leGlzdHMoKSkge1xuICAgICAgaWYgKGZvcmNlICYmIHRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlRmlsZSh0aW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmaWxlOiAnICsgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLmlzRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB3cml0ZSB0byBkaXJlY3Rvcnk6ICVzJywgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICB2YXIgX2NvbnRlbnQgPSAnJztcbiAgICBpZiAoYXBwZW5kKSB7XG4gICAgICBfY29udGVudCArPSB0aGlzLnJlYWQoKTtcbiAgICB9XG5cbiAgICB0aGlzLmRpci5tdGltZSA9IHRpbWU7XG4gICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5tdGltZSA9IHRpbWU7XG4gICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5jb250ZW50ID0gX2NvbnRlbnQgKyBjb250ZW50O1xuICAgIEZTLndyaXRlRlMoKTtcbiAgfVxuXG4gIHJlYWQoKSB7XG4gICAgaWYgKCF0aGlzLmV4aXN0cygpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgJXMgZG9lc25cXCd0IGV4aXN0JywgdGhpcy5wYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmlsZW5hbWUgPyB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLmNvbnRlbnQgOiB0aGlzLmRpci5jb250ZW50O1xuICB9XG5cbiAgX2NyZWF0ZSh0eXBlLCBjb250ZW50LCB0aW1lc3RhbXApIHtcbiAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlICVzIGFscmVhZHkgZXhpc3RzJywgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRpbWVzdGFtcCkge1xuICAgICAgdGltZXN0YW1wID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcbiAgICB9XG5cbiAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdID0ge1xuICAgICAgY3RpbWU6IHRpbWVzdGFtcCxcbiAgICAgIG10aW1lOiB0aW1lc3RhbXAsXG4gICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgdHlwZTogdHlwZVxuICAgIH07XG5cbiAgICBGUy53cml0ZUZTKCk7XG4gIH1cblxuICBjcmVhdGVGb2xkZXIodGltZXN0YW1wKSB7XG4gICAgdGhpcy5fY3JlYXRlKCdkJywge30sIHRpbWVzdGFtcCk7XG4gIH1cblxuICBjcmVhdGVGaWxlKHRpbWVzdGFtcCkge1xuICAgIHRoaXMuX2NyZWF0ZSgnZicsICcnLCB0aW1lc3RhbXApO1xuICB9XG5cbiAgc2VsZigpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0gOiB0aGlzLmRpcjtcbiAgfVxuXG4gIG9wZW4oZmlsZSkge1xuICAgIHJldHVybiBGaWxlLm9wZW4odGhpcy5wYXRoICsgJy8nICsgZmlsZSk7XG4gIH1cblxuICBsZW5ndGgoKSB7XG4gICAgdmFyIGNvbnRlbnQgPSB0aGlzLnJlYWQoKTtcblxuICAgIGlmICh0aGlzLmlzRmlsZSgpKSB7XG4gICAgICByZXR1cm4gY29udGVudC5sZW5ndGg7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzRGlyKCkpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb250ZW50KS5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgfVxuXG4gIG10aW1lKCkge1xuICAgIHZhciB0ID0gbmV3IERhdGUodGhpcy5zZWxmKCkubXRpbWUpO1xuXG4gICAgdmFyIGRheUFuZE1vbnRoID0gTU9OVEhTW3QuZ2V0TW9udGgoKV0gKyAnICcgKyB0LmdldERheSgpO1xuICAgIGlmIChEYXRlLm5vdygpIC0gdC5nZXRUaW1lKCkgPiA2ICogMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwKSB7XG4gICAgICByZXR1cm4gZGF5QW5kTW9udGggKyAnICcgKyB0LmdldEZ1bGxZZWFyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0SG91cnMoKSArICc6JyArIHQuZ2V0TWludXRlcygpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCBMb2NhbFN0b3JhZ2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlJztcblxudmFyIEZTID0ge307XG52YXIgRklMRV9TWVNURU1fS0VZID0gJ2ZpbGVfc3lzdGVtJztcblxuRlMud3JpdGVGUyA9IGZ1bmN0aW9uICgpIHtcbiAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oRklMRV9TWVNURU1fS0VZLCBKU09OLnN0cmluZ2lmeShGUy5yb290KSk7XG59O1xuXG5cbkZTLnJvb3QgPSBKU09OLnBhcnNlKExvY2FsU3RvcmFnZS5nZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSkpO1xudmFyIGZpbGVTeXN0ZW0gPSByZXF1aXJlKCcuL2ZpbGUtc3lzdGVtLmpzb24nKTtcbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShvbGQsIG5uZXcpIHtcbiAgZm9yICh2YXIga2V5IGluIG5uZXcpIHtcbiAgICBvbGRba2V5XSA9IG5uZXdba2V5XTtcbiAgfVxufTtcblxuaWYgKCFGUy5yb290IHx8ICFGUy5yb290LmNvbnRlbnQpIHtcbiAgRlMucm9vdCA9IGZpbGVTeXN0ZW07XG59IGVsc2Uge1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAoZnVuY3Rpb24gcmVhZGRpcihvbGQsIG5uZXcpIHtcbiAgICBpZiAodHlwZW9mIG9sZC5jb250ZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5uZXcuY29udGVudCkge1xuICAgICAgICB2YXIgbiA9IG5uZXcuY29udGVudFtrZXldO1xuICAgICAgICB2YXIgbyA9IG9sZC5jb250ZW50W2tleV07XG5cbiAgICAgICAgaWYgKCFvLmNvbnRlbnQpIHtcbiAgICAgICAgICBvID0ge1xuICAgICAgICAgICAgY3RpbWU6IHRpbWUsXG4gICAgICAgICAgICBtdGltZTogdGltZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IG8uY29udGVudCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGVvZiBvID09PSAnc3RyaW5nJyA/ICdmJyA6ICdkJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoby50eXBlID09PSAnZicgJiYgby5tdGltZSA9PT0gby5jdGltZSkge1xuICAgICAgICAgIGNvcHkobywgbik7XG4gICAgICAgIH0gZWxzZSBpZiAoby50eXBlID09PSAnZCcpIHtcbiAgICAgICAgICByZWFkZGlyKG8sIG4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KShGUy5yb290LCBmaWxlU3lzdGVtKTtcblxuICBGUy53cml0ZUZTKCk7XG59XG5cbkZTLmN1cnJlbnRQYXRoID0gRlMuaG9tZSA9ICcvVXNlcnMvZ3Vlc3QnO1xuRlMuY3VycmVudERpciA9IEZTLnJvb3QuY29udGVudC5Vc2Vycy5jb250ZW50Lmd1ZXN0O1xuXG5GUy5kaXJuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpO1xufTtcblxuRlMuYmFzZW5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xufTtcblxuRlMudHJhbnNsYXRlUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBpbmRleDtcblxuICBwYXRoID0gcGF0aC5yZXBsYWNlKCd+JywgRlMuaG9tZSk7XG5cbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSAoRlMuY3VycmVudFBhdGggIT09ICcvJyA/IEZTLmN1cnJlbnRQYXRoICsgJy8nIDogJy8nKSArIHBhdGg7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4uJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXggLSAxLCAyKTtcbiAgfVxuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4nKSkpIHtcbiAgICBwYXRoLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBpZiAocGF0aFswXSA9PT0gJy4nKSB7XG4gICAgcGF0aC5zaGlmdCgpO1xuICB9XG5cbiAgaWYgKHBhdGgubGVuZ3RoIDwgMikge1xuICAgIHBhdGggPSBbLCAsIF07XG4gIH1cblxuICByZXR1cm4gcGF0aC5qb2luKCcvJykucmVwbGFjZSgvKFteL10rKVxcLyskLywgJyQxJyk7XG59O1xuXG5GUy5yZWFscGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG5cbiAgcmV0dXJuIEZTLmV4aXN0cyhwYXRoKSA/IHBhdGggOiBudWxsO1xufTtcblxuXG5GUy5vcGVuID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSBGUy50cmFuc2xhdGVQYXRoKHBhdGgpO1xuICB9XG5cbiAgcGF0aCA9IHBhdGguc3Vic3RyKDEpLnNwbGl0KCcvJykuZmlsdGVyKFN0cmluZyk7XG5cbiAgdmFyIGN3ZCA9IEZTLnJvb3Q7XG4gIHdoaWxlKHBhdGgubGVuZ3RoICYmIGN3ZC5jb250ZW50KSB7XG4gICAgY3dkID0gY3dkLmNvbnRlbnRbcGF0aC5zaGlmdCgpXTtcbiAgfVxuXG4gIHJldHVybiBjd2Q7XG59O1xuXG5GUy5leGlzdHMgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gISFGUy5vcGVuKHBhdGgpO1xufTtcblxuRlMuZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBbXS5qb2luLmNhbGwoYXJndW1lbnRzLCAnOiAnKTtcbn07XG5cbkZTLm5vdEZvdW5kID0gZnVuY3Rpb24gKGNtZCwgYXJnKSB7XG4gIHJldHVybiBGUy5lcnJvcihjbWQsIGFyZywgJ05vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnknKTtcbn07XG5cbkZTLmF1dG9jb21wbGV0ZSA9IGZ1bmN0aW9uIChfcGF0aCkge1xuICB2YXIgcGF0aCA9IHRoaXMudHJhbnNsYXRlUGF0aChfcGF0aCk7XG4gIHZhciBvcHRpb25zID0gW107XG5cbiAgaWYgKF9wYXRoLnNsaWNlKC0xKSA9PT0gJy8nKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICBpZiAocGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZpbGVuYW1lID0gX3BhdGguc3BsaXQoJy8nKS5wb3AoKTtcbiAgICB2YXIgb3BlblBhdGggPSBmaWxlbmFtZS5sZW5ndGggPiAxID8gcGF0aC5zbGljZSgwLCAtMSkgOiBwYXRoO1xuICAgIHZhciBkaXIgPSBGUy5vcGVuKG9wZW5QYXRoKTtcbiAgICB2YXIgZmlsZU5hbWUgPSAnJztcbiAgICB2YXIgcGFyZW50UGF0aCA9IHBhdGg7XG5cbiAgICBpZiAoIWRpcikge1xuICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICAgIGZpbGVOYW1lID0gcGF0aC5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcGFyZW50UGF0aCA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICAgIGRpciA9IEZTLm9wZW4ocGFyZW50UGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKGRpciAmJiB0eXBlb2YgZGlyLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gZGlyLmNvbnRlbnQpIHtcbiAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgZmlsZU5hbWUubGVuZ3RoKS50b0xvd2VyQ2FzZSgpID09PSBmaWxlTmFtZSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGlyLmNvbnRlbnRba2V5XS5jb250ZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAga2V5ICs9ICcvJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvcHRpb25zLnB1c2goa2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgRlM7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGFpbmVyLCBzY3JvbGwpIHtcbiAgd2luZG93Lm9ucmVzaXplID0gc2Nyb2xsO1xuXG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuZnVsbC1zY3JlZW4nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICFkb2N1bWVudC5tb3pGdWxsU2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAgICFkb2N1bWVudC53ZWJraXRGdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAgICAgIWRvY3VtZW50Lm1zRnVsbHNjcmVlbkVsZW1lbnQgKSB7XG4gICAgICBpZiAoY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2YgbG9jYWxTdG9yYWdlID09PSAndW5kZWZpbmVkJyA/XG4gIHtcbiAgICBzZXRJdGVtOiBmdW5jdGlvbigpIHt9LFxuICAgIGdldEl0ZW06IGZ1bmN0aW9uKCkgeyByZXR1cm4gbnVsbDsgfVxuICB9XG46XG4gIGxvY2FsU3RvcmFnZTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLl9jYWxsYmFja3NbZXZlbnRdKSB7XG4gICAgICB0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gW107XG4gICAgfVxuXG4gICAgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XS5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIHdyaXRlKGRhdGEpIHtcbiAgICB0aGlzLmVtbWl0KCdkYXRhJywgZGF0YSk7XG4gIH1cblxuICBlbW1pdChldmVudCwgZGF0YSkge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICAgIGNhbGxiYWNrcyAmJiBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgYmluZEZ1bGxTY3JlZW4gZnJvbSAnLi9mdWxsLXNjcmVlbic7XG5pbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuaW1wb3J0IFJFUEwgZnJvbSAnLi9SRVBMJztcbmltcG9ydCBTdHJlYW0gZnJvbSAnLi9zdHJlYW0nO1xuXG4vKipcbiAqIE9ubHkgdXNlZCBieSBzb3VyY2UuanMgLSB1bnVzZWQgaW1wb3J0IHNvIGl0IGdldHMgaW50byB0aGUgYnVuZGxlXG4gKi9cbmltcG9ydCBDb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmNsYXNzIFpTSCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRhaW5lciwgc3RhdHVzYmFyLCBjcmVhdGVIVE1MKSB7XG4gICAgaWYgKGNyZWF0ZUhUTUwpIHtcbiAgICAgIHRoaXMuY3JlYXRlKGNvbnRhaW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgICAgdGhpcy5zdGF0dXNiYXIgPSBzdGF0dXNiYXI7XG4gICAgfVxuXG4gICAgdGhpcy5jcmVhdGVTdHJlYW1zKCk7XG5cbiAgICB0aGlzLnJvb3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lcjtcbiAgICB0aGlzLlJFUEwgPSBuZXcgUkVQTCh0aGlzKTtcbiAgICB0aGlzLkZTID0gRlM7XG4gICAgdGhpcy5pbml0aWFsaXplSW5wdXQoKTtcbiAgICB0aGlzLnByb21wdCgpO1xuXG4gICAgYmluZEZ1bGxTY3JlZW4odGhpcy5jb250YWluZXIucGFyZW50RWxlbWVudCwgdGhpcy5zY3JvbGwuYmluZCh0aGlzKSk7XG5cbiAgICBDb21tYW5kTWFuYWdlci5yZWdpc3RlcignY2xlYXInLCB0aGlzLmNsZWFyLmJpbmQodGhpcykpO1xuICB9XG5cbiAgY3JlYXRlU3RyZWFtcygpIHtcbiAgICB0aGlzLnN0ZGluID0gbmV3IFN0cmVhbSgpO1xuICAgIHRoaXMuc3RkZXJyID0gbmV3IFN0cmVhbSgpO1xuICAgIHRoaXMuc3Rkb3V0ID0gbmV3IFN0cmVhbSgpO1xuXG4gICAgdGhpcy5zdGRlcnIub24oJ2RhdGEnLCAoZCkgPT4gdGhpcy5vdXRwdXQoZCwgJ3N0ZGVycicpKTtcbiAgICB0aGlzLnN0ZG91dC5vbignZGF0YScsIChkKSA9PiB0aGlzLm91dHB1dChkLCAnc3Rkb3V0JykpO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgIHRoaXMuc3RkaW4ud3JpdGUoZXZlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgcHdkKCkge1xuICAgIHJldHVybiBGUy5jdXJyZW50UGF0aC5yZXBsYWNlKEZTLmhvbWUsICd+Jyk7XG4gIH1cblxuICAkUFMxKCkge1xuICAgIHJldHVybiBgXG4gICAgICA8c3BhbiBjbGFzcz1cIndob1wiPmd1ZXN0PC9zcGFuPlxuICAgICAgb25cbiAgICAgIDxzcGFuIGNsYXNzPVwid2hlcmVcIj4gJHt0aGlzLnB3ZCgpfSA8L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cImJyYW5jaFwiPsKxbWFzdGVyPC9zcGFuPiZndDtcbiAgICBgO1xuICB9XG5cbiAgcHJvbXB0KCkge1xuICAgIHZhciByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB2YXIgY29kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblxuICAgIHNwYW4uY2xhc3NOYW1lID0gJ3BzMSc7XG4gICAgY29kZS5jbGFzc05hbWUgPSAnY29kZSc7XG5cbiAgICBzcGFuLmlubmVySFRNTCA9IHRoaXMuJFBTMSgpO1xuXG4gICAgcm93LmFwcGVuZENoaWxkKHNwYW4pO1xuICAgIHJvdy5hcHBlbmRDaGlsZChjb2RlKTtcblxuICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG4gICAgdGhpcy5SRVBMLnVzZShjb2RlKTtcbiAgICB0aGlzLnN0YXR1cyh0aGlzLnB3ZCgpKTtcbiAgICB0aGlzLnNjcm9sbCgpO1xuICAgIHJvdy5hcHBlbmRDaGlsZCh0aGlzLmlucHV0KTtcbiAgICB0aGlzLmlucHV0LmZvY3VzKCk7XG4gIH1cblxuICBzdGF0dXModGV4dCkge1xuICAgIGlmICh0aGlzLnN0YXR1c2Jhcikge1xuICAgICAgdGhpcy5zdGF0dXNiYXIuaW5uZXJIVE1MID0gdGV4dDtcbiAgICB9XG4gIH1cblxuICBpbml0aWFsaXplSW5wdXQoKSB7XG4gICAgdmFyIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC5jbGFzc05hbWUgPSAnZmFrZS1pbnB1dCc7XG4gICAgdGhpcy5yb290Q29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChpbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkge1xuICAgICAgICBpbnB1dC5ibHVyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgY3JlYXRlKGNvbnRhaW5lcikge1xuICAgIGlmICh0eXBlb2YgY29udGFpbmVyID09PSAnc3RyaW5nJykge1xuICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29udGFpbmVyKTtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cInRlcm1pbmFsXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnV0dG9uc1wiPlxuICAgICAgICAgICAgPGEgY2xhc3M9XCJjbG9zZVwiIGhyZWY9XCIjXCI+PC9hPlxuICAgICAgICAgICAgPGEgY2xhc3M9XCJtaW5pbWl6ZVwiIGhyZWY9XCIjXCI+PC9hPlxuICAgICAgICAgICAgPGEgY2xhc3M9XCJtYXhpbWl6ZVwiIGhyZWY9XCIjXCI+PC9hPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aXRsZVwiPjwvZGl2PlxuICAgICAgICAgIDxhIGNsYXNzPVwiZnVsbC1zY3JlZW5cIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0dXMtYmFyXCI+PC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbiAgICB0aGlzLnN0YXR1c2JhciA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuc3RhdHVzLWJhcicpO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIHZhciBjb2RlcyA9IHRoaXMuY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NvZGUnKTtcbiAgICBpZiAoIWNvZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy5wcm9tcHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5SRVBMLnVzZShjb2Rlc1tjb2Rlcy5sZW5ndGggLSAxXSwgWlNIKTtcbiAgICB9XG4gIH1cblxuICBvdXRwdXQodGV4dCwgY2xhc3NOYW1lKSB7XG4gICAgdmFyIG91dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG91dC5jbGFzc05hbWUgPSAnY29kZSAnICsgW2NsYXNzTmFtZV07XG4gICAgb3V0LmlubmVySFRNTCA9IHRleHQ7XG5cbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChvdXQpO1xuICAgIHRoaXMuc2Nyb2xsKCk7XG4gIH1cblxuICBzY3JvbGwoKSB7XG4gICAgdmFyIGMgPSB0aGlzLnJvb3RDb250YWluZXI7XG4gICAgc2V0VGltZW91dCgoKSA9PiBjLnNjcm9sbFRvcCA9IGMuc2Nyb2xsSGVpZ2h0LCAwKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgIHRoaXMucHJvbXB0KCk7XG4gIH1cblxufVxuXG53aW5kb3cuWlNIID0gWlNIO1xuZXhwb3J0IGRlZmF1bHQgWlNIO1xuIl19
