require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// jshint bitwise: false
'use strict';

var CommandManager = require('./command-manager');
var LocalStorage = require('./local-storage');
var FS = require('./fs');

var REPL_MODE_DEFAULT = 1;

/* TODO: Implement VI bindings
 * var REPL_MODE_VI = 1;
 * var ESC = 27;
 */

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

var REPL = window.REPL = {
  mode: REPL_MODE_DEFAULT,
  input: '',
  index: 0,
  listeners: {},
  lastKey: null,
};

REPL._history = ([LocalStorage.getItem(HISTORY_STORAGE_KEY)]+'').split(HISTORY_SEPARATOR).filter(String);
REPL.history = REPL._history.slice(0) || [];
REPL.historyIndex = REPL.history.length;

REPL.on = function(event, callback) {
  ((this.listeners[event] = this.listeners[event] || [])).push(callback);
};

REPL.caret = (function () {
  var caret = document.createElement('span');
  caret.className = 'caret';

  return caret;
}());

REPL.use = function (span, zsh) {
  if (this.span) {
    this.removeCaret();
  }

  this.span = span;
  this.zsh = zsh;

  window.onkeydown = this.parse;

  this.write();

  return this;
};

REPL.parse = function (event) {
  if (event.metaKey) {
    return;
  }

  event.preventDefault();

  switch (event.keyCode) {
    case LEFT:
      case RIGHT:
      REPL.moveCaret(event.keyCode);
    break;
    case UP:
      case DOWN:
      REPL.navigateHistory(event.keyCode);
    break;
    case TAB:
      REPL.autocomplete();
    break;
    case ENTER:
      REPL.submit();
    break;
    case BACKSPACE:
      REPL.backspace();
    break;
    default:
      if (event.ctrlKey) {
        REPL.action(event);
      } else {
        REPL.update(event);
      }
  }
};

REPL.moveCaret = function (direction) {
  if (direction === LEFT) {
    this.index = Math.max(this.index - 1, 0);
  } else {
    this.index = Math.min(this.index + 1, this.input.length + 1);
  }
  this.write();
};

REPL.autocomplete = function () {
  var options;
  var path = false;

  if (this.command() === this.input) {
    options = CommandManager.autocomplete(this.command());
  } else {
    path = this.input.split(' ').pop();
    options = FS.autocomplete(path);
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
  } else if (options.length){
    this.zsh.stdout.write(options.join(' '));
    this.zsh.prompt();
  }
};

REPL.navigateHistory = function (direction) {
  if (direction === UP) {
    this.historyIndex = Math.max(this.historyIndex - 1, 0);
  } else {
    this.historyIndex = Math.min(this.historyIndex + 1, this.history.length);
  }

  this.input = this.history[this.historyIndex] || '';
  this.index = this.input.length;
  this.write();
};

REPL.submit = function () {
  this.index = this.input.length;
  this.write();

  var input = this.input.trim();

  if (input && input !== this._history[this._history.length - 1]) {
    this._history[this._history.length] = input;
    LocalStorage.setItem(HISTORY_STORAGE_KEY, this._history.slice(-HISTORY_SIZE).join(HISTORY_SEPARATOR));
    this.history = this._history.slice(0);
  }

  if (input) {
    this.historyIndex = this.history.length;
  } else {
    this.historyIndex = this.history.length - 1;
  }

  this.clear();

  if (input) {
    CommandManager.parse(input,
                         this.zsh.stdin,
                         this.zsh.stdout,
                         this.zsh.stderr,
                         this.zsh.prompt);
  } else {
    this.zsh.prompt();
  }
};

REPL.trigger = function(evt, msg) {
  var callbacks = this.listeners[evt] || [];

  callbacks.forEach(function (callback) {
    callback(msg);
  });
};

REPL.removeCaret = function () {
  var caret = this.span.getElementsByClassName('caret');

  if (caret && caret[0]) {
    caret[0].remove();
  }
};

REPL.clear = function () {
  this.input = '';
  this.index = 0;
};

REPL.backspace = function () {
  if (this.index > 0) {
    this.input = this.input.substr(0, this.index - 1) + this.input.substr(this.index);
    this.index--;
    this.write();
  }
};

REPL.actualCharCode = function (event) {
  var options;
  var code = event.keyCode;

  code = {
    173: 189
  }[code] || code;

  if (code >= 65 && code <= 90) {
    if (!event.shiftKey) {
      code += 32;
    }
  } else if (code >= 48 && code <= 57) {
    if (event.shiftKey) {
      code = ')!@#$%^&*('.charCodeAt(code - 48);
    }
  } else if (code >= 186 && code <= 192){
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
};

REPL.action = function(event) {
  if (String.fromCharCode(event.keyCode) === 'C') {
    this.index = this.input.length;
    this.write();
    this.input = '';
    this.zsh.prompt();
  }
};

REPL.update = function(event) {
  var code = this.actualCharCode(event);

  if (!~code) {
    return;
  }

  var char = String.fromCharCode(code);

  this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
  this.index++;
  this.write();
};

REPL.command = function () {
  if (this.input !== this.__inputCommand) {
    this.__inputCommand = this.input;
    this.__command = this.input.split(' ').shift();
  }

  return this.__command;
};

REPL.commandArgsString = function () {
  if (this.input !== this.__inputCArgs) {
    this.__inputCArgs = this.input;
    this.__cargs = this.input.substr(this.command().length);
  }

  return this.__cargs;
};

REPL.write = function () {
  this.caret.innerHTML = this.input[this.index] || '';

  var span = document.createElement('span');
  var command = this.command();
  var input = this.commandArgsString();
  var self = this;

  var putCaret = function (str, index) {
    self.caret.innerText = str[index] || ' ';
    return str.substr(0, index) + self.caret.outerHTML + str.substr(index + 1);
  };

  span.className = CommandManager.isValid(command) ? 'valid' : 'invalid';

  if (this.index < command.length) {
    command = putCaret(command, this.index);
  } else {
    input = putCaret(input, this.index - command.length);
  }

  span.innerHTML = command;

  this.span.innerHTML = span.outerHTML + input;
};

module.exports = REPL;

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/lib/args-parser":[function(require,module,exports){
module.exports=require('3ed2tT');
},{}],"3ed2tT":[function(require,module,exports){
'use strict';

var ArgsParser = {};

ArgsParser.parseStrings = function(rawString) {
  var _args = [];
  var word = '';
  var string = false;
  var i, l;

  for (i = 0, l = rawString.length; i < l; i++) {
    var char = rawString[i];
    if (char === '"' || char === '\'') {
      if (string) {
        if (char === string) {
          if (rawString[i-1] === '\\') {
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

  var out =  {
    arguments: [],
    options: {},
    raw: args
  };

  args = ArgsParser.parseStrings(args);

  function addOption(option, value) {
    out.options[option] = typeof(value) === 'string' ? value : true;
  }

  for (var i = 0, l = args.length; i < l; i++) {
    var arg = args[i];

    if (!arg)  {
      continue;
    }

    if (arg.substr(0, 2) === '--') {
      var next = args[i+1];
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

module.exports = ArgsParser;

},{}],"8EyLTk":[function(require,module,exports){
// jshint evil: true, bitwise: false
'use strict';

var ArgsParser = require('./args-parser');
var FS = require('./fs');
var File = require('./file');
var Stream = require('./stream');

var path = File.open('/usr/bin');
var load = function (cmd) {
  var source = path.open(cmd + '.js');
  var fn;
  if (!source.isFile()) {
    fn = false;
  } else {
    fn = eval('(function () { ' + source.read() + '})')();
  }
  return fn;
};

var CommandManager = {
  commands: {},
  aliases: {},
};

CommandManager.isValid = function (cmd) {
  return !!(this.commands[cmd] || this.aliases[cmd] || load(cmd));
};

CommandManager.autocomplete = function (cmd) {
  var matches = [];
  cmd = cmd.toLowerCase();

  (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
    if (command.substr(0, cmd.length).toLowerCase() === cmd) {
      matches.push(command);
    }
  });

  return matches;
};
CommandManager.parse = function (cmd, stdin, stdout, stderr, next) {
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

  CommandManager.exec(command, args, stdin, stdout, stderr, next);
};

CommandManager.exec = function (cmd, args, stdin, stdout, stderr, next) {
  if (this.aliases[cmd]) {
    var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
    return this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
  }

  var fn;
  if (typeof this.commands[cmd] === 'function') {
    fn = this.commands[cmd];
  } else if ((fn = load(cmd))) {
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
};

CommandManager.register = function (cmd, fn) {
  this.commands[cmd] = fn;
};

CommandManager.alias = function (cmd, original) {
  if (arguments.length === 0) {
    return this.aliases;
  }
  this.aliases[cmd] = original;
};

CommandManager.unalias = function (cmd) {
  delete this.aliases[cmd];
};

CommandManager.get = function(cmd) {
  return this.commands[cmd];
};

module.exports = CommandManager;

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":16}],"zsh.js/lib/command-manager":[function(require,module,exports){
module.exports=require('8EyLTk');
},{}],"CjB+4o":[function(require,module,exports){
'use strict';

var zsh = require('./zsh');

var Console = (function () {
  function Console(stdout, stderr) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.external = typeof console === 'undefined' ? {} : console;
  }

  function stringify(args) {
    return [].map.call(args, function (a) {
      return JSON.stringify(a) || [a]+'';
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
  "mtime": "2014-03-02T12:31:10.000Z",
  "ctime": "2014-03-02T12:31:10.000Z",
  "content": {
    "Users": {
      "mtime": "2014-05-03T23:21:09.000Z",
      "ctime": "2014-05-03T23:21:09.000Z",
      "content": {
        "guest": {
          "mtime": "2014-07-11T21:50:34.000Z",
          "ctime": "2014-07-11T21:50:34.000Z",
          "content": {
            ".vimrc": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "",
              "type": "f"
            },
            ".zshrc": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "",
              "type": "f"
            },
            "about.md": {
              "mtime": "2014-07-11T21:50:34.000Z",
              "ctime": "2014-07-11T21:50:34.000Z",
              "content": "# tadeuzagallo.com\n\n* About me\n  I'm a Full Stack Developer, JS Passionate, Ruby Fan, C++ Something, Game Development Enthusiast,\n  Always willing to contribute to open source projects and trying to learn some more math.\n\n* About this website\n  I wanted more than just show my work, I wanted to show my work environment.\n  Since I do some mobile development as well  I also use (sadly) some IDEs, but always trying\n  to do as much as I can on this terminal, so I made a very similar copy (at least visually)\n  of it so people could get to see what I do and how I (usually) do.\n\n* Commands\n  If you want to know more about me, there are a few commands:\n    * about  (currently running)\n    * contact \n    * resume\n    * projects\n\n  If you need some help about the terminal, or want to know what functionalities are currrently implemented, type `help` any time.\n\nHope you have as much fun as I had doing it :)\n\nTadeu Zagallo\n      \n",
              "type": "f"
            },
            "contact.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "# All my contacts, feel free to reach me at any of these\n\n* <a href=\"mailto:tadeuzagallo@gmail.com\" alt=\"Email\">[Email](mailto:tadeuzagallo@gmail.com)</a>\n* <a href=\"https://github.com/tadeuzagallo\" alt=\"GitHub\" target=\"_blank\">[GitHub](https://github.com/tadeuzagallo)</a>\n* <a href=\"https://twitter.com/tadeuzagallo\" alt=\"Twitter\" target=\"_blank\">[Twitter](https://twitter.com/tadeuzagallo)</a>\n* <a href=\"https://facebook.com/tadeuzagallo\" alt=\"Facebook\" target=\"_blank\">[Facebook](https://facebook.com/tadeuzagallo)</a>\n* <a href=\"https://plus.google.com/+TadeuZagallo\" alt=\"Google +\" target=\"_blank\">[Google +](https://plus.google.com/+TadeuZagallo)</a>\n* <a href=\"http://www.linkedin.com/profile/view?id=160177159\" alt=\"Linkedin\" target=\"_blank\">[Linkedin](http://www.linkedin.com/profile/view?id=160177159)</a>\n* <a href=\"skype://tadeuzagallo\" alt=\"Linkedin\">[Skype](skype://tadeuzagallo)</a>\n",
              "type": "f"
            },
            "projects.md": {
              "mtime": "2014-12-27T02:45:05.000Z",
              "ctime": "2014-12-27T02:45:05.000Z",
              "content": "For now you can have a look at this one! :)\n(That's what I'm doing)\n",
              "type": "f"
            },
            "readme.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "foo bar baz\n",
              "type": "f"
            },
            "resume.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "# Tadeu Zagallo da Silva\n---\n\n## Profile\n--- \n  I am passionate for all kinds of development, love to learn new languages and paradigms, always ready for a good challenge.\n  I also like Math, Game development and when possible contribute to open source projects.\n\n## General Information\n---\n  * Email: tadeuzagallo@gmail.com\n  * Phone: +55 32 8863 3684\n  * Skype: tadeuzagallo\n  * Github: github.com/tadeuzagallo\n  * Location: Juiz de Fora/MG, Brazil\n\n## Educational Background\n---\n\n  * Web Development at Instituto Vianna Junior, 2010\n  * General English at The Carlyle Institute, 2011\n\n# Work Experience\n---\n\n  * <i>*iOS Developer*</i> at <i>*Qranio*</i> from <i>*December, 2013*</i> and <i>*currently employed*</i>\n    - Qranio is a startup that grew inside the company I work (eMiolo.com) and I was invited to lead the iOS development team\n      on a completely rewriten version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*Bonuz*</i> from <i>*February, 2013*</i> and <i>*currently employed*</i>\n    - I started developing the iOS app as a freelancer, after the app was published I was invited to maintain the Ruby on Rails\n      api and work on the Android version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*eMiolo.com*</i> from <i>*April, 2013*</i> and <i>*currently employed*</i>\n    - The company just worked with PHP, so I joined with the intention of bringing new technologies. Worked with Python, Ruby, iOS,\n      Android and HTML5 applications\n\n  * <i>*iOS Developer*</i> at <i>*ProDoctor Software Ltda.*</i> from <i>*July, 2012*</i> until <i>*October, 2012*</i>\n    - Briefly worked with the iOS team on the development of their first mobile version of their main product, a medical software\n\n  * <i>*Web Developer*</i> at <i>*Ato Interativo*</i> from <i>*February, 2012*</i> until <i>*July, 2012*</i>\n    - Most of the work was with PHP and MySQL, also working with JavaScript on the client side. Worked with MSSQL\n      and Oracle databases as well\n\n  * <i>*Web Developer*</i> at <i>*Maria Fumaça Criações*</i> from <i>*October, 2010*</i> until <i>*June, 2011*</i>\n    - I worked mostly with PHP and MySQL, also making the front end with HTML and CSS and most animations in JavaScript,\n      although I also worked with a few in AS3. Briefly worked with MongoDB\n\n## Additional Information\n---\n\n* Experience under Linux and OS X environment\n* Student Exchange: 6 months of residence in Ireland\n\n## Languages\n---\n\n* Portuguese – Native Speaker\n* English – Fluent Level\n* Spanish – Intermediate Level\n\n## Programming languages (ordered by knowledge)\n---\n\n* JavaScript\n* Objective­C\n* C/C++\n* Ruby on Rails\n* NodeJS\n* PHP\n* Java\n* Python\n\n## Additional skills\n---\n\n* HTML5/CSS3\n* MVC\n* Design Patterns\n* TDD/BDD\n* Git\n* Analysis and Design of Algorithms\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    },
    "tmp": {
      "mtime": "2014-03-02T12:31:10.000Z",
      "ctime": "2014-03-02T12:31:10.000Z",
      "content": {},
      "type": "d"
    },
    "usr": {
      "mtime": "2014-03-02T12:31:10.000Z",
      "ctime": "2014-03-02T12:31:10.000Z",
      "content": {
        "bin": {
          "mtime": "2015-01-12T02:22:24.000Z",
          "ctime": "2015-01-12T02:22:24.000Z",
          "content": {
            "alias.js": {
              "mtime": "2015-01-12T02:20:54.000Z",
              "ctime": "2015-01-12T02:20:54.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index+1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        ZSH.commandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = ZSH.commandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n};\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2015-01-12T02:20:58.000Z",
              "ctime": "2015-01-12T02:20:58.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = ZSH.file.open(path);\n\n    if (!file.exists()) {\n      stderr.write(ZSH.fs.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(ZSH.fs.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2015-01-12T02:21:01.000Z",
              "ctime": "2015-01-12T02:21:01.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = File.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(FS.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(FS.error('cd', path, 'Is a file'));\n  } else {\n    FS.currentPath = dir.path;\n    FS.currentDir = dir.self();\n  }\n\n  FS.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2015-01-12T02:21:04.000Z",
              "ctime": "2015-01-12T02:21:04.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ZSH.argsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n  \n  next();\n};\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2015-01-12T02:21:07.000Z",
              "ctime": "2015-01-12T02:21:07.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  stdout.write('commands:');\n  stdout.write(Object.keys(ZSH.commandManager.commands).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n  stdout.write(Object.keys(CommandManager.aliases).map(function (key)  {\n    return key + '=\"' + CommandManager.aliases[key] + '\"';\n  }).join(' '));\n\n  next();\n};\n",
              "type": "f"
            },
            "less.js": {
              "mtime": "2015-01-12T02:21:09.000Z",
              "ctime": "2015-01-12T02:21:09.000Z",
              "content": "",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2015-01-12T02:21:12.000Z",
              "ctime": "2015-01-12T02:21:12.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = ZSH.file.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(ZSH.fs.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(ZSH.fs.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2015-01-12T02:22:24.000Z",
              "ctime": "2015-01-12T02:22:24.000Z",
              "content": "return function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = ZSH.file.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(ZSH.fs.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(ZSH.fs.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(ZSH.fs.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2015-01-11T23:46:12.000Z",
              "ctime": "2015-01-11T23:46:12.000Z",
              "content": "'use strict';\n\nvar FS = require('zsh.js/lib/fs');\nvar File = require('zsh.js/lib/file');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var success = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (!target.isFile()) {\n            target.read()[source.filename] = source.self();\n          } else {\n            target.write(source.read(), false, true);\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (success) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2015-01-11T23:46:21.000Z",
              "ctime": "2015-01-11T23:46:21.000Z",
              "content": "'use strict';\n\nvar FS = require('zsh.js/lib/fs');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var _pwd = FS.currentPath;\n\n  if (stdout) {\n    stdout.write(_pwd);\n    next();\n  } else {\n    return _pwd;\n  }\n};\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2015-01-11T23:46:26.000Z",
              "ctime": "2015-01-11T23:46:26.000Z",
              "content": "'use strict';\n\nvar FS = require('zsh.js/lib/fs');\nvar File = require('zsh.js/lib/file');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2015-01-11T23:46:31.000Z",
              "ctime": "2015-01-11T23:46:31.000Z",
              "content": "'use strict';\n\nvar FS = require('zsh.js/lib/fs');\nvar File = require('zsh.js/lib/file');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(FS.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(FS.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2015-01-11T23:47:03.000Z",
              "ctime": "2015-01-11T23:47:03.000Z",
              "content": "// jshint evil: true\n'use strict';\n\nvar File = require('zsh.js/lib/file');\nvar Console = require('zsh.js/lib/console');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = File.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2015-01-11T23:47:09.000Z",
              "ctime": "2015-01-11T23:47:09.000Z",
              "content": "'use strict';\n\nvar FS = require('zsh.js/lib/fs');\nvar File = require('zsh.js/lib/file');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(FS.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  FS.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2015-01-11T23:47:15.000Z",
              "ctime": "2015-01-11T23:47:15.000Z",
              "content": "'use strict';\n\nvar CommandManager = require('zsh.js/lib/command-manager');\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    CommandManager.unalias(cmd);\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "vim.js": {
              "mtime": "2014-12-25T02:19:58.000Z",
              "ctime": "2014-12-25T02:19:58.000Z",
              "content": "",
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

var FS = require('./fs');

var File = (function () {
  function File(path) {
    path = FS.translatePath(path);
    this.path = path;

    path = path.split('/');

    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = FS.open(this.dirname);
  }

  File.open = function (path) {
    return new File(path);
  };

  File.getTimestamp = function () {
    return new Date().toISOString();
  };

  File.prototype.parentExists = function () {
    return this.dir !== undefined;
  };

  File.prototype.isValid = function () {
    return typeof this.dir === 'object' && this.dir.type === 'd';
  };

  File.prototype.exists = function () {
    return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
  };

  File.prototype.isFile = function () {
    return this.exists() && this.filename && this.dir.content[this.filename].type === 'f';
  };

  File.prototype.isDir = function () {
    return this.exists() && (!this.filename || this.dir.content[this.filename].type === 'd');
  };

  File.prototype.delete = function () {
    if (this.exists()) {
      delete this.dir.content[this.filename];
      FS.writeFS();
    }
  };

  File.prototype.clear = function () {
    this.write('', false, true);
  };

  File.prototype.write = function (content, append, force) {
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
      FS.writeFS();
    }
  };

  File.prototype.read = function () {
    return this.filename ? this.dir.content[this.filename].content : this.dir.content;
  };

  var _create = function (type, content) {
    return function (timestamp) {
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

      FS.writeFS();
    };
  };

  File.prototype.createFolder = _create('d', {});
  File.prototype.createFile = _create('f', '');

  File.prototype.self = function () {
    return this.filename ? this.dir : this.dir.content[this.filename];
  };

  File.prototype.open = function (file) {
    return File.open(this.path + '/' + file);
  };

  File.prototype.length = function () {
    var content = this.read();

    if (this.isFile()) {
      return content.length;
    } else if (this.isDir()) {
      return Object.keys(content).length;
    } else {
      return 0;
    }
  };

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  File.prototype.mtime = function () {
    var t = new Date(this.self().mtime);

    var dayAndMonth =  months[t.getMonth()] + ' ' + t.getDay();
    if (Date.now() - t.getTime() > 6 * 30 * 24 * 60* 60 * 1000) {
      return dayAndMonth + ' ' + t.getFullYear();
    } else {
      return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
    }
  };

  return File;
})();

module.exports = File;

},{"./fs":"dDj8kd"}],"zsh.js/lib/fs":[function(require,module,exports){
module.exports=require('dDj8kd');
},{}],"dDj8kd":[function(require,module,exports){
// jshint bitwise: false
'use strict';

var LocalStorage = require('./local-storage');

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.writeFS = function () {
  LocalStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};


FS.root = JSON.parse(LocalStorage.getItem(FILE_SYSTEM_KEY));
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

  while(~(index = path.indexOf('..'))) {
    path.splice(index-1, 2);
  }

  while(~(index = path.indexOf('.'))) {
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

FS.realpath = function(path) {
  path = FS.translatePath(path);

  return FS.exists(path) ? path : null;
};


FS.open = function (path) {
  if (path[0] !== '/') {
    path = FS.translatePath(path);
  }

  path = path.substr(1).split('/').filter(String);

  var cwd = FS.root;
  while(path.length && cwd.content) {
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

module.exports = FS;

},{"./file-system.json":8,"./local-storage":14}],13:[function(require,module,exports){
'use strict';

module.exports = function(container, scroll) {
  window.onresize = scroll;

  container.querySelector('.full-screen').onclick = function (e) {
    e.preventDefault();

    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
          !document.webkitFullscreenElement &&
            !document.msFullscreenElement ) {
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

module.exports = typeof localStorage === 'undefined' ?
  {
    setItem: function() {},
    getItem: function() { return null; }
  }
:
  localStorage;

},{}],15:[function(require,module,exports){
module.exports=require(1)
},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],16:[function(require,module,exports){
'use strict';

function Stream() {
  this._callbacks = {};
}

Stream.prototype.on = function (event, callback) {
  if (!this._callbacks[event]) {
    this._callbacks[event] = [];
  }

  this._callbacks[event].push(callback);
};

Stream.prototype.write = function (data) {
  this.emmit('data', data);
};

Stream.prototype.emmit = function (event, data) {
  var callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

module.exports = Stream;

},{}],"F2/ljt":[function(require,module,exports){
(function (global){
'use strict';

var CommandManager = require('./command-manager');
var REPL = require('./REPL');
var Stream = require('./stream');
var bindFullScreen = require('./full-screen');
var FS = require('./fs');

var ZSH = {
  argsParser: require('./args-parser'),
  commandManager: require('./command-manager'),
  console: require('./console'),
  file: require('./file'),
  fs: require('./fs'),
  localStorage: require('./local-storage'),
  repl: require('./repl'),
  stream: require('./stream')
};

var pwd = function () {
  return FS.currentPath.replace(FS.home, '~');
};

ZSH.$PS1 = function () {
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd() + '</span> '+
    '<span class="branch">±master</span>&gt;';
};

ZSH.prompt = function () {
  var row = document.createElement('div');

  var span = document.createElement('span');
  span.className = 'ps1';
  span.innerHTML = ZSH.$PS1();


  var code = document.createElement('span');
  code.className = 'code';

  row.appendChild(span);
  row.appendChild(code);

  ZSH.container.appendChild(row);

  REPL.use(code, ZSH);

  ZSH.status(pwd());

  ZSH.scroll();

  row.appendChild(ZSH.input);

  ZSH.input.focus();
};

ZSH.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

ZSH.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;
  this.initializeInput();
  this.prompt();
  bindFullScreen(this.container.parentElement, this.scroll);
};

ZSH.initializeInput = function () {
  var input = document.createElement('input');
  input.className = 'fake-input';
  window.addEventListener('click', function (e) {
    e.preventDefault();
    if (input === document.activeElement) {
      input.blur();
    } else {
      input.focus();
    }
  });

  this.input = input;
};

ZSH.create = function (container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  container.innerHTML =
    '<div class="terminal">' +
      '<div class="bar">' +
        '<div class="buttons">' +
          '<a class="close" href="#"></a>' +
          '<a class="minimize" href="#"></a>' +
          '<a class="maximize" href="#"></a>' +
        '</div>' +
        '<div class="title">' +
        '</div>' +
        '<a class="full-screen" href="#"></a>' +
      '</div>' +
      '<div class="content">' +
      '</div>' +
      '<div class="status-bar">' +
      '</div>' +
    '</div>';

  this.init(container.querySelector('.content'),
            container.querySelector('.status-bar'));
};

ZSH.update = function () {
  var codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1], ZSH);
  }
};

function output (_output, _class) {
  var out = document.createElement('div');
  out.className = 'code ' + [_class];
  out.innerHTML = _output;

  ZSH.container.appendChild(out);
  ZSH.scroll();
}

ZSH.stdout = new Stream();
ZSH.stdout.on('data', function (data) {
  output(data.toString(), 'stdout');
});

ZSH.stderr = new Stream();
ZSH.stderr.on('data', function (data) {
  output(data.toString(), 'stderr');
});

ZSH.scroll = function () {
  setTimeout(function () {
    ZSH.rootContainer.scrollTop = ZSH.rootContainer.scrollHeight;
  }, 0);
};

ZSH.clear = function () {
  ZSH.container.innerHTML = '';
  ZSH.prompt();
};

CommandManager.register('clear', ZSH.clear);

(typeof require === 'undefined' ? window : global).ZSH = ZSH;
module.exports = ZSH;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./REPL":1,"./args-parser":"3ed2tT","./command-manager":"8EyLTk","./console":"CjB+4o","./file":"bMs+/F","./fs":"dDj8kd","./full-screen":13,"./local-storage":14,"./repl":15,"./stream":16}],"zsh.js":[function(require,module,exports){
module.exports=require('F2/ljt');
},{}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9SRVBMLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2NvbW1hbmQtbWFuYWdlci5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9jb25zb2xlLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXUvd3d3L2pzL3pzaF9qcy9saWIvZmlsZS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9mcy5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9sb2NhbC1zdG9yYWdlLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL3N0cmVhbS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBqc2hpbnQgYml0d2lzZTogZmFsc2Vcbid1c2Ugc3RyaWN0JztcblxudmFyIENvbW1hbmRNYW5hZ2VyID0gcmVxdWlyZSgnLi9jb21tYW5kLW1hbmFnZXInKTtcbnZhciBMb2NhbFN0b3JhZ2UgPSByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2UnKTtcbnZhciBGUyA9IHJlcXVpcmUoJy4vZnMnKTtcblxudmFyIFJFUExfTU9ERV9ERUZBVUxUID0gMTtcblxuLyogVE9ETzogSW1wbGVtZW50IFZJIGJpbmRpbmdzXG4gKiB2YXIgUkVQTF9NT0RFX1ZJID0gMTtcbiAqIHZhciBFU0MgPSAyNztcbiAqL1xuXG52YXIgTEVGVCA9IDM3O1xudmFyIFVQID0gMzg7XG52YXIgUklHSFQgPSAzOTtcbnZhciBET1dOID0gNDA7XG5cbnZhciBUQUIgPSA5O1xudmFyIEVOVEVSID0gMTM7XG52YXIgQkFDS1NQQUNFID0gODtcbnZhciBTUEFDRSA9IDMyO1xuXG52YXIgSElTVE9SWV9TVE9SQUdFX0tFWSA9ICdURVJNSU5BTF9ISVNUT1JZJztcbnZhciBISVNUT1JZX1NJWkUgPSAxMDA7XG52YXIgSElTVE9SWV9TRVBBUkFUT1IgPSAnJSVISVNUT1JZX1NFUEFSQVRPUiUlJztcblxudmFyIFJFUEwgPSB3aW5kb3cuUkVQTCA9IHtcbiAgbW9kZTogUkVQTF9NT0RFX0RFRkFVTFQsXG4gIGlucHV0OiAnJyxcbiAgaW5kZXg6IDAsXG4gIGxpc3RlbmVyczoge30sXG4gIGxhc3RLZXk6IG51bGwsXG59O1xuXG5SRVBMLl9oaXN0b3J5ID0gKFtMb2NhbFN0b3JhZ2UuZ2V0SXRlbShISVNUT1JZX1NUT1JBR0VfS0VZKV0rJycpLnNwbGl0KEhJU1RPUllfU0VQQVJBVE9SKS5maWx0ZXIoU3RyaW5nKTtcblJFUEwuaGlzdG9yeSA9IFJFUEwuX2hpc3Rvcnkuc2xpY2UoMCkgfHwgW107XG5SRVBMLmhpc3RvcnlJbmRleCA9IFJFUEwuaGlzdG9yeS5sZW5ndGg7XG5cblJFUEwub24gPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spIHtcbiAgKCh0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pKS5wdXNoKGNhbGxiYWNrKTtcbn07XG5cblJFUEwuY2FyZXQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgY2FyZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIGNhcmV0LmNsYXNzTmFtZSA9ICdjYXJldCc7XG5cbiAgcmV0dXJuIGNhcmV0O1xufSgpKTtcblxuUkVQTC51c2UgPSBmdW5jdGlvbiAoc3BhbiwgenNoKSB7XG4gIGlmICh0aGlzLnNwYW4pIHtcbiAgICB0aGlzLnJlbW92ZUNhcmV0KCk7XG4gIH1cblxuICB0aGlzLnNwYW4gPSBzcGFuO1xuICB0aGlzLnpzaCA9IHpzaDtcblxuICB3aW5kb3cub25rZXlkb3duID0gdGhpcy5wYXJzZTtcblxuICB0aGlzLndyaXRlKCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SRVBMLnBhcnNlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGlmIChldmVudC5tZXRhS2V5KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICBjYXNlIExFRlQ6XG4gICAgICBjYXNlIFJJR0hUOlxuICAgICAgUkVQTC5tb3ZlQ2FyZXQoZXZlbnQua2V5Q29kZSk7XG4gICAgYnJlYWs7XG4gICAgY2FzZSBVUDpcbiAgICAgIGNhc2UgRE9XTjpcbiAgICAgIFJFUEwubmF2aWdhdGVIaXN0b3J5KGV2ZW50LmtleUNvZGUpO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgVEFCOlxuICAgICAgUkVQTC5hdXRvY29tcGxldGUoKTtcbiAgICBicmVhaztcbiAgICBjYXNlIEVOVEVSOlxuICAgICAgUkVQTC5zdWJtaXQoKTtcbiAgICBicmVhaztcbiAgICBjYXNlIEJBQ0tTUEFDRTpcbiAgICAgIFJFUEwuYmFja3NwYWNlKCk7XG4gICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmIChldmVudC5jdHJsS2V5KSB7XG4gICAgICAgIFJFUEwuYWN0aW9uKGV2ZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFJFUEwudXBkYXRlKGV2ZW50KTtcbiAgICAgIH1cbiAgfVxufTtcblxuUkVQTC5tb3ZlQ2FyZXQgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gIGlmIChkaXJlY3Rpb24gPT09IExFRlQpIHtcbiAgICB0aGlzLmluZGV4ID0gTWF0aC5tYXgodGhpcy5pbmRleCAtIDEsIDApO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuaW5kZXggPSBNYXRoLm1pbih0aGlzLmluZGV4ICsgMSwgdGhpcy5pbnB1dC5sZW5ndGggKyAxKTtcbiAgfVxuICB0aGlzLndyaXRlKCk7XG59O1xuXG5SRVBMLmF1dG9jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG9wdGlvbnM7XG4gIHZhciBwYXRoID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMuY29tbWFuZCgpID09PSB0aGlzLmlucHV0KSB7XG4gICAgb3B0aW9ucyA9IENvbW1hbmRNYW5hZ2VyLmF1dG9jb21wbGV0ZSh0aGlzLmNvbW1hbmQoKSk7XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5wb3AoKTtcbiAgICBvcHRpb25zID0gRlMuYXV0b2NvbXBsZXRlKHBhdGgpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgaWYgKHBhdGggIT09IGZhbHNlKSB7XG4gICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgcGF0aC5wb3AoKTtcbiAgICAgIHBhdGgucHVzaCgnJyk7XG5cbiAgICAgIHRoaXMuaW5wdXQgPSB0aGlzLmlucHV0LnJlcGxhY2UoLyBbXiBdKiQvLCAnICcgKyBwYXRoLmpvaW4oJy8nKSArIG9wdGlvbnMuc2hpZnQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5wdXQgPSBvcHRpb25zLnNoaWZ0KCkgKyAnICc7XG4gICAgfVxuXG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLmxlbmd0aCl7XG4gICAgdGhpcy56c2guc3Rkb3V0LndyaXRlKG9wdGlvbnMuam9pbignICcpKTtcbiAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgfVxufTtcblxuUkVQTC5uYXZpZ2F0ZUhpc3RvcnkgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gIGlmIChkaXJlY3Rpb24gPT09IFVQKSB7XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1heCh0aGlzLmhpc3RvcnlJbmRleCAtIDEsIDApO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gTWF0aC5taW4odGhpcy5oaXN0b3J5SW5kZXggKyAxLCB0aGlzLmhpc3RvcnkubGVuZ3RoKTtcbiAgfVxuXG4gIHRoaXMuaW5wdXQgPSB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdIHx8ICcnO1xuICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gIHRoaXMud3JpdGUoKTtcbn07XG5cblJFUEwuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gIHRoaXMud3JpdGUoKTtcblxuICB2YXIgaW5wdXQgPSB0aGlzLmlucHV0LnRyaW0oKTtcblxuICBpZiAoaW5wdXQgJiYgaW5wdXQgIT09IHRoaXMuX2hpc3RvcnlbdGhpcy5faGlzdG9yeS5sZW5ndGggLSAxXSkge1xuICAgIHRoaXMuX2hpc3RvcnlbdGhpcy5faGlzdG9yeS5sZW5ndGhdID0gaW5wdXQ7XG4gICAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oSElTVE9SWV9TVE9SQUdFX0tFWSwgdGhpcy5faGlzdG9yeS5zbGljZSgtSElTVE9SWV9TSVpFKS5qb2luKEhJU1RPUllfU0VQQVJBVE9SKSk7XG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5faGlzdG9yeS5zbGljZSgwKTtcbiAgfVxuXG4gIGlmIChpbnB1dCkge1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gdGhpcy5oaXN0b3J5Lmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGggLSAxO1xuICB9XG5cbiAgdGhpcy5jbGVhcigpO1xuXG4gIGlmIChpbnB1dCkge1xuICAgIENvbW1hbmRNYW5hZ2VyLnBhcnNlKGlucHV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuenNoLnN0ZGluLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuenNoLnN0ZG91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnpzaC5zdGRlcnIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy56c2gucHJvbXB0KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgfVxufTtcblxuUkVQTC50cmlnZ2VyID0gZnVuY3Rpb24oZXZ0LCBtc2cpIHtcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMubGlzdGVuZXJzW2V2dF0gfHwgW107XG5cbiAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sobXNnKTtcbiAgfSk7XG59O1xuXG5SRVBMLnJlbW92ZUNhcmV0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY2FyZXQgPSB0aGlzLnNwYW4uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FyZXQnKTtcblxuICBpZiAoY2FyZXQgJiYgY2FyZXRbMF0pIHtcbiAgICBjYXJldFswXS5yZW1vdmUoKTtcbiAgfVxufTtcblxuUkVQTC5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dCA9ICcnO1xuICB0aGlzLmluZGV4ID0gMDtcbn07XG5cblJFUEwuYmFja3NwYWNlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5pbmRleCA+IDApIHtcbiAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCAtIDEpICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgdGhpcy5pbmRleC0tO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxufTtcblxuUkVQTC5hY3R1YWxDaGFyQ29kZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICB2YXIgb3B0aW9ucztcbiAgdmFyIGNvZGUgPSBldmVudC5rZXlDb2RlO1xuXG4gIGNvZGUgPSB7XG4gICAgMTczOiAxODlcbiAgfVtjb2RlXSB8fCBjb2RlO1xuXG4gIGlmIChjb2RlID49IDY1ICYmIGNvZGUgPD0gOTApIHtcbiAgICBpZiAoIWV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb2RlICs9IDMyO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHtcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIGNvZGUgPSAnKSFAIyQlXiYqKCcuY2hhckNvZGVBdChjb2RlIC0gNDgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjb2RlID49IDE4NiAmJiBjb2RlIDw9IDE5Mil7XG4gICAgb3B0aW9ucyA9ICc7PSwtLi9gOis8Xz4/fic7XG5cbiAgICBjb2RlIC09IDE4NjtcblxuICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgfVxuXG4gICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgfSBlbHNlIGlmIChjb2RlID49IDIxOSAmJiBjb2RlIDw9IDIyMikge1xuICAgIG9wdGlvbnMgPSAnW1xcXFxdXFwne3x9XCInO1xuICAgIGNvZGUgLT0gMjE5O1xuXG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICB9XG5cbiAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICB9IGVsc2UgaWYgKGNvZGUgIT09IFNQQUNFKSB7XG4gICAgY29kZSA9IC0xO1xuICB9XG5cbiAgcmV0dXJuIGNvZGU7XG59O1xuXG5SRVBMLmFjdGlvbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpID09PSAnQycpIHtcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgdGhpcy53cml0ZSgpO1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgfVxufTtcblxuUkVQTC51cGRhdGUgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgY29kZSA9IHRoaXMuYWN0dWFsQ2hhckNvZGUoZXZlbnQpO1xuXG4gIGlmICghfmNvZGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG5cbiAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXgpICsgY2hhciArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICB0aGlzLmluZGV4Kys7XG4gIHRoaXMud3JpdGUoKTtcbn07XG5cblJFUEwuY29tbWFuZCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENvbW1hbmQpIHtcbiAgICB0aGlzLl9faW5wdXRDb21tYW5kID0gdGhpcy5pbnB1dDtcbiAgICB0aGlzLl9fY29tbWFuZCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5zaGlmdCgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX19jb21tYW5kO1xufTtcblxuUkVQTC5jb21tYW5kQXJnc1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENBcmdzKSB7XG4gICAgdGhpcy5fX2lucHV0Q0FyZ3MgPSB0aGlzLmlucHV0O1xuICAgIHRoaXMuX19jYXJncyA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuY29tbWFuZCgpLmxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fX2NhcmdzO1xufTtcblxuUkVQTC53cml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jYXJldC5pbm5lckhUTUwgPSB0aGlzLmlucHV0W3RoaXMuaW5kZXhdIHx8ICcnO1xuXG4gIHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICB2YXIgY29tbWFuZCA9IHRoaXMuY29tbWFuZCgpO1xuICB2YXIgaW5wdXQgPSB0aGlzLmNvbW1hbmRBcmdzU3RyaW5nKCk7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgcHV0Q2FyZXQgPSBmdW5jdGlvbiAoc3RyLCBpbmRleCkge1xuICAgIHNlbGYuY2FyZXQuaW5uZXJUZXh0ID0gc3RyW2luZGV4XSB8fCAnICc7XG4gICAgcmV0dXJuIHN0ci5zdWJzdHIoMCwgaW5kZXgpICsgc2VsZi5jYXJldC5vdXRlckhUTUwgKyBzdHIuc3Vic3RyKGluZGV4ICsgMSk7XG4gIH07XG5cbiAgc3Bhbi5jbGFzc05hbWUgPSBDb21tYW5kTWFuYWdlci5pc1ZhbGlkKGNvbW1hbmQpID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJztcblxuICBpZiAodGhpcy5pbmRleCA8IGNvbW1hbmQubGVuZ3RoKSB7XG4gICAgY29tbWFuZCA9IHB1dENhcmV0KGNvbW1hbmQsIHRoaXMuaW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIGlucHV0ID0gcHV0Q2FyZXQoaW5wdXQsIHRoaXMuaW5kZXggLSBjb21tYW5kLmxlbmd0aCk7XG4gIH1cblxuICBzcGFuLmlubmVySFRNTCA9IGNvbW1hbmQ7XG5cbiAgdGhpcy5zcGFuLmlubmVySFRNTCA9IHNwYW4ub3V0ZXJIVE1MICsgaW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJFUEw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBcmdzUGFyc2VyID0ge307XG5cbkFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzID0gZnVuY3Rpb24ocmF3U3RyaW5nKSB7XG4gIHZhciBfYXJncyA9IFtdO1xuICB2YXIgd29yZCA9ICcnO1xuICB2YXIgc3RyaW5nID0gZmFsc2U7XG4gIHZhciBpLCBsO1xuXG4gIGZvciAoaSA9IDAsIGwgPSByYXdTdHJpbmcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNoYXIgPSByYXdTdHJpbmdbaV07XG4gICAgaWYgKGNoYXIgPT09ICdcIicgfHwgY2hhciA9PT0gJ1xcJycpIHtcbiAgICAgIGlmIChzdHJpbmcpIHtcbiAgICAgICAgaWYgKGNoYXIgPT09IHN0cmluZykge1xuICAgICAgICAgIGlmIChyYXdTdHJpbmdbaS0xXSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICB3b3JkID0gd29yZC5zbGljZSgwLCAtMSkgKyBjaGFyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgICAgICAgd29yZCA9ICcnO1xuICAgICAgICAgICAgc3RyaW5nID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd29yZCArPSBjaGFyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJpbmcgPSBjaGFyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJyAnICYmICFzdHJpbmcpIHtcbiAgICAgIF9hcmdzLnB1c2god29yZCk7XG4gICAgICB3b3JkID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RyaW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bnRlcm1pbmF0ZWQgc3RyaW5nJyk7XG4gIH0gZWxzZSBpZiAod29yZCkge1xuICAgIF9hcmdzLnB1c2god29yZCk7XG4gIH1cblxuICByZXR1cm4gX2FyZ3M7XG59O1xuXG5BcmdzUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgYXJncyA9IChbYXJnc10gKyAnJykudHJpbSgpO1xuXG4gIHZhciBvdXQgPSAge1xuICAgIGFyZ3VtZW50czogW10sXG4gICAgb3B0aW9uczoge30sXG4gICAgcmF3OiBhcmdzXG4gIH07XG5cbiAgYXJncyA9IEFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzKGFyZ3MpO1xuXG4gIGZ1bmN0aW9uIGFkZE9wdGlvbihvcHRpb24sIHZhbHVlKSB7XG4gICAgb3V0Lm9wdGlvbnNbb3B0aW9uXSA9IHR5cGVvZih2YWx1ZSkgPT09ICdzdHJpbmcnID8gdmFsdWUgOiB0cnVlO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKCFhcmcpICB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN1YnN0cigwLCAyKSA9PT0gJy0tJykge1xuICAgICAgdmFyIG5leHQgPSBhcmdzW2krMV07XG4gICAgICBpZiAobmV4dCAmJiBuZXh0WzBdICE9PSAnLScpIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMiksIG5leHQpO1xuICAgICAgICBpKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRPcHRpb24oYXJnLnN1YnN0cigyKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmdbMF0gPT09ICctJykge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGFyZy5zdWJzdHIoMSksIGFkZE9wdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hcmd1bWVudHMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFyZ3NQYXJzZXI7XG4iLCIvLyBqc2hpbnQgZXZpbDogdHJ1ZSwgYml0d2lzZTogZmFsc2Vcbid1c2Ugc3RyaWN0JztcblxudmFyIEFyZ3NQYXJzZXIgPSByZXF1aXJlKCcuL2FyZ3MtcGFyc2VyJyk7XG52YXIgRlMgPSByZXF1aXJlKCcuL2ZzJyk7XG52YXIgRmlsZSA9IHJlcXVpcmUoJy4vZmlsZScpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJy4vc3RyZWFtJyk7XG5cbnZhciBwYXRoID0gRmlsZS5vcGVuKCcvdXNyL2JpbicpO1xudmFyIGxvYWQgPSBmdW5jdGlvbiAoY21kKSB7XG4gIHZhciBzb3VyY2UgPSBwYXRoLm9wZW4oY21kICsgJy5qcycpO1xuICB2YXIgZm47XG4gIGlmICghc291cmNlLmlzRmlsZSgpKSB7XG4gICAgZm4gPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBmbiA9IGV2YWwoJyhmdW5jdGlvbiAoKSB7ICcgKyBzb3VyY2UucmVhZCgpICsgJ30pJykoKTtcbiAgfVxuICByZXR1cm4gZm47XG59O1xuXG52YXIgQ29tbWFuZE1hbmFnZXIgPSB7XG4gIGNvbW1hbmRzOiB7fSxcbiAgYWxpYXNlczoge30sXG59O1xuXG5Db21tYW5kTWFuYWdlci5pc1ZhbGlkID0gZnVuY3Rpb24gKGNtZCkge1xuICByZXR1cm4gISEodGhpcy5jb21tYW5kc1tjbWRdIHx8IHRoaXMuYWxpYXNlc1tjbWRdIHx8IGxvYWQoY21kKSk7XG59O1xuXG5Db21tYW5kTWFuYWdlci5hdXRvY29tcGxldGUgPSBmdW5jdGlvbiAoY21kKSB7XG4gIHZhciBtYXRjaGVzID0gW107XG4gIGNtZCA9IGNtZC50b0xvd2VyQ2FzZSgpO1xuXG4gIChPYmplY3Qua2V5cyh0aGlzLmNvbW1hbmRzKS5jb25jYXQoT2JqZWN0LmtleXModGhpcy5hbGlhc2VzKSkpLmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICBpZiAoY29tbWFuZC5zdWJzdHIoMCwgY21kLmxlbmd0aCkudG9Mb3dlckNhc2UoKSA9PT0gY21kKSB7XG4gICAgICBtYXRjaGVzLnB1c2goY29tbWFuZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gbWF0Y2hlcztcbn07XG5Db21tYW5kTWFuYWdlci5wYXJzZSA9IGZ1bmN0aW9uIChjbWQsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xuICBpZiAofmNtZC5pbmRleE9mKCd8JykpIHtcbiAgICBjbWQgPSBjbWQuc3BsaXQoJ3wnKTtcbiAgICBjbWQuZm9yRWFjaChDb21tYW5kTWFuYWdlci5wYXJzZSk7XG4gIH1cblxuICBjbWQgPSBjbWQuc3BsaXQoJyAnKTtcbiAgdmFyIGNvbW1hbmQgPSBjbWQuc2hpZnQoKTtcbiAgdmFyIGFyZ3MgPSBjbWQuam9pbignICcpO1xuXG4gIHZhciBpbmRleDtcblxuICBpZiAofihpbmRleCA9IGFyZ3MuaW5kZXhPZignPicpKSkge1xuICAgIHZhciBwcmV2ID0gYXJnc1tpbmRleC0xXTtcbiAgICB2YXIgYXBwZW5kID0gYXJnc1tpbmRleCsxXSA9PT0gJz4nO1xuICAgIHZhciBpbml0ID0gaW5kZXg7XG5cbiAgICBpZiAofihbJzEnLCcyJywnJiddKS5pbmRleE9mKHByZXYpKSB7XG4gICAgICBpbml0LS07XG4gICAgfVxuXG4gICAgdmFyIF9hcmdzID0gYXJncy5zdWJzdHIoMCwgaW5pdCk7XG4gICAgYXJncyA9IGFyZ3Muc3Vic3RyKGluZGV4K2FwcGVuZCsxKS5zcGxpdCgnICcpLmZpbHRlcihTdHJpbmcpO1xuICAgIHZhciBwYXRoID0gYXJncy5zaGlmdCgpO1xuICAgIGFyZ3MgPSBfYXJncyArIGFyZ3Muam9pbignICcpO1xuXG4gICAgaWYgKCFwYXRoKSB7XG4gICAgICBzdGRvdXQud3JpdGUoJ3pzaDogcGFyc2UgZXJyb3IgbmVhciBgXFxcXG5cXCcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcblxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xuICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKSB7XG4gICAgICBzdGRvdXQud3JpdGUoJ3pzaDogbm90IGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xuICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IGlzIGEgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWFwcGVuZCkge1xuICAgICAgZmlsZS5jbGVhcigpO1xuICAgIH1cblxuICAgIHZhciBfc3Rkb3V0ID0gbmV3IFN0cmVhbSgpO1xuICAgIF9zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBmaWxlLndyaXRlKGRhdGEgKyAnXFxuJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpZiAocHJldiAhPT0gJzInKSB7XG4gICAgICBzdGRvdXQgPSBfc3Rkb3V0O1xuICAgIH1cblxuICAgIGlmIChwcmV2ID09PSAnMicgfHwgcHJldiA9PT0gJyYnKSB7XG4gICAgICBzdGRlcnIgPSBfc3Rkb3V0O1xuICAgIH1cblxuICAgIHZhciBfbmV4dCA9IG5leHQ7XG4gICAgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIEZTLndyaXRlRlMoKTtcbiAgICAgIF9uZXh0KCk7XG4gICAgfTtcbiAgfVxuXG4gIENvbW1hbmRNYW5hZ2VyLmV4ZWMoY29tbWFuZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbn07XG5cbkNvbW1hbmRNYW5hZ2VyLmV4ZWMgPSBmdW5jdGlvbiAoY21kLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgaWYgKHRoaXMuYWxpYXNlc1tjbWRdKSB7XG4gICAgdmFyIGxpbmUgPSAodGhpcy5hbGlhc2VzW2NtZF0gKyAnICcgKyBhcmdzKS50cmltKCkuc3BsaXQoJyAnKTtcbiAgICByZXR1cm4gdGhpcy5leGVjKGxpbmUuc2hpZnQoKSwgbGluZS5qb2luKCcgJyksIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gIH1cblxuICB2YXIgZm47XG4gIGlmICh0eXBlb2YgdGhpcy5jb21tYW5kc1tjbWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZm4gPSB0aGlzLmNvbW1hbmRzW2NtZF07XG4gIH0gZWxzZSBpZiAoKGZuID0gbG9hZChjbWQpKSkge1xuICB9IGVsc2Uge1xuICAgIHN0ZGVyci53cml0ZSgnenNoOiBjb21tYW5kIG5vdCBmb3VuZDogJyArIGNtZCk7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXJncyA9IEFyZ3NQYXJzZXIucGFyc2UoYXJncyk7XG4gICAgZm4uY2FsbCh1bmRlZmluZWQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHN0ZGVyci53cml0ZShlcnIuc3RhY2spO1xuICAgIG5leHQoKTtcbiAgfVxufTtcblxuQ29tbWFuZE1hbmFnZXIucmVnaXN0ZXIgPSBmdW5jdGlvbiAoY21kLCBmbikge1xuICB0aGlzLmNvbW1hbmRzW2NtZF0gPSBmbjtcbn07XG5cbkNvbW1hbmRNYW5hZ2VyLmFsaWFzID0gZnVuY3Rpb24gKGNtZCwgb3JpZ2luYWwpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdGhpcy5hbGlhc2VzO1xuICB9XG4gIHRoaXMuYWxpYXNlc1tjbWRdID0gb3JpZ2luYWw7XG59O1xuXG5Db21tYW5kTWFuYWdlci51bmFsaWFzID0gZnVuY3Rpb24gKGNtZCkge1xuICBkZWxldGUgdGhpcy5hbGlhc2VzW2NtZF07XG59O1xuXG5Db21tYW5kTWFuYWdlci5nZXQgPSBmdW5jdGlvbihjbWQpIHtcbiAgcmV0dXJuIHRoaXMuY29tbWFuZHNbY21kXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tbWFuZE1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB6c2ggPSByZXF1aXJlKCcuL3pzaCcpO1xuXG52YXIgQ29uc29sZSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIENvbnNvbGUoc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICB0aGlzLnN0ZG91dCA9IHN0ZG91dDtcbiAgICB0aGlzLnN0ZGVyciA9IHN0ZGVycjtcbiAgICB0aGlzLmV4dGVybmFsID0gdHlwZW9mIGNvbnNvbGUgPT09ICd1bmRlZmluZWQnID8ge30gOiBjb25zb2xlO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RyaW5naWZ5KGFyZ3MpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoYXJncywgZnVuY3Rpb24gKGEpIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhKSB8fCBbYV0rJyc7XG4gICAgfSkuam9pbignICcpO1xuICB9XG5cbiAgQ29uc29sZS5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3Rkb3V0LndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfTtcblxuICBDb25zb2xlLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnN0ZGVyci53cml0ZShzdHJpbmdpZnkoYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgQ29uc29sZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgenNoLmNsZWFyKCk7XG4gIH07XG5cbiAgcmV0dXJuIENvbnNvbGU7XG59KSgpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJtdGltZVwiOiBcIjIwMTQtMDMtMDJUMTI6MzE6MTAuMDAwWlwiLFxuICBcImN0aW1lXCI6IFwiMjAxNC0wMy0wMlQxMjozMToxMC4wMDBaXCIsXG4gIFwiY29udGVudFwiOiB7XG4gICAgXCJVc2Vyc1wiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImd1ZXN0XCI6IHtcbiAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNC0wNy0xMVQyMTo1MDozNC4wMDBaXCIsXG4gICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDctMTFUMjE6NTA6MzQuMDAwWlwiLFxuICAgICAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgICAgICBcIi52aW1yY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIuenNocmNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiYWJvdXQubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNC0wNy0xMVQyMTo1MDozNC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTA3LTExVDIxOjUwOjM0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyB0YWRldXphZ2FsbG8uY29tXFxuXFxuKiBBYm91dCBtZVxcbiAgSSdtIGEgRnVsbCBTdGFjayBEZXZlbG9wZXIsIEpTIFBhc3Npb25hdGUsIFJ1YnkgRmFuLCBDKysgU29tZXRoaW5nLCBHYW1lIERldmVsb3BtZW50IEVudGh1c2lhc3QsXFxuICBBbHdheXMgd2lsbGluZyB0byBjb250cmlidXRlIHRvIG9wZW4gc291cmNlIHByb2plY3RzIGFuZCB0cnlpbmcgdG8gbGVhcm4gc29tZSBtb3JlIG1hdGguXFxuXFxuKiBBYm91dCB0aGlzIHdlYnNpdGVcXG4gIEkgd2FudGVkIG1vcmUgdGhhbiBqdXN0IHNob3cgbXkgd29yaywgSSB3YW50ZWQgdG8gc2hvdyBteSB3b3JrIGVudmlyb25tZW50LlxcbiAgU2luY2UgSSBkbyBzb21lIG1vYmlsZSBkZXZlbG9wbWVudCBhcyB3ZWxsICBJIGFsc28gdXNlIChzYWRseSkgc29tZSBJREVzLCBidXQgYWx3YXlzIHRyeWluZ1xcbiAgdG8gZG8gYXMgbXVjaCBhcyBJIGNhbiBvbiB0aGlzIHRlcm1pbmFsLCBzbyBJIG1hZGUgYSB2ZXJ5IHNpbWlsYXIgY29weSAoYXQgbGVhc3QgdmlzdWFsbHkpXFxuICBvZiBpdCBzbyBwZW9wbGUgY291bGQgZ2V0IHRvIHNlZSB3aGF0IEkgZG8gYW5kIGhvdyBJICh1c3VhbGx5KSBkby5cXG5cXG4qIENvbW1hbmRzXFxuICBJZiB5b3Ugd2FudCB0byBrbm93IG1vcmUgYWJvdXQgbWUsIHRoZXJlIGFyZSBhIGZldyBjb21tYW5kczpcXG4gICAgKiBhYm91dCAgKGN1cnJlbnRseSBydW5uaW5nKVxcbiAgICAqIGNvbnRhY3QgXFxuICAgICogcmVzdW1lXFxuICAgICogcHJvamVjdHNcXG5cXG4gIElmIHlvdSBuZWVkIHNvbWUgaGVscCBhYm91dCB0aGUgdGVybWluYWwsIG9yIHdhbnQgdG8ga25vdyB3aGF0IGZ1bmN0aW9uYWxpdGllcyBhcmUgY3VycnJlbnRseSBpbXBsZW1lbnRlZCwgdHlwZSBgaGVscGAgYW55IHRpbWUuXFxuXFxuSG9wZSB5b3UgaGF2ZSBhcyBtdWNoIGZ1biBhcyBJIGhhZCBkb2luZyBpdCA6KVxcblxcblRhZGV1IFphZ2FsbG9cXG4gICAgICBcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjb250YWN0Lm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgQWxsIG15IGNvbnRhY3RzLCBmZWVsIGZyZWUgdG8gcmVhY2ggbWUgYXQgYW55IG9mIHRoZXNlXFxuXFxuKiA8YSBocmVmPVxcXCJtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcXCIgYWx0PVxcXCJFbWFpbFxcXCI+W0VtYWlsXShtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbSk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2dpdGh1Yi5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkdpdEh1YlxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltHaXRIdWJdKGh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly90d2l0dGVyLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiVHdpdHRlclxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltUd2l0dGVyXShodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2ZhY2Vib29rLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiRmFjZWJvb2tcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bRmFjZWJvb2tdKGh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvXFxcIiBhbHQ9XFxcIkdvb2dsZSArXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dvb2dsZSArXShodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTlcXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bTGlua2VkaW5dKGh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTkpPC9hPlxcbiogPGEgaHJlZj1cXFwic2t5cGU6Ly90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiPltTa3lwZV0oc2t5cGU6Ly90YWRldXphZ2FsbG8pPC9hPlxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInByb2plY3RzLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMTItMjdUMDI6NDU6MDUuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0xMi0yN1QwMjo0NTowNS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIkZvciBub3cgeW91IGNhbiBoYXZlIGEgbG9vayBhdCB0aGlzIG9uZSEgOilcXG4oVGhhdCdzIHdoYXQgSSdtIGRvaW5nKVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlYWRtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJmb28gYmFyIGJhelxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlc3VtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIFRhZGV1IFphZ2FsbG8gZGEgU2lsdmFcXG4tLS1cXG5cXG4jIyBQcm9maWxlXFxuLS0tIFxcbiAgSSBhbSBwYXNzaW9uYXRlIGZvciBhbGwga2luZHMgb2YgZGV2ZWxvcG1lbnQsIGxvdmUgdG8gbGVhcm4gbmV3IGxhbmd1YWdlcyBhbmQgcGFyYWRpZ21zLCBhbHdheXMgcmVhZHkgZm9yIGEgZ29vZCBjaGFsbGVuZ2UuXFxuICBJIGFsc28gbGlrZSBNYXRoLCBHYW1lIGRldmVsb3BtZW50IGFuZCB3aGVuIHBvc3NpYmxlIGNvbnRyaWJ1dGUgdG8gb3BlbiBzb3VyY2UgcHJvamVjdHMuXFxuXFxuIyMgR2VuZXJhbCBJbmZvcm1hdGlvblxcbi0tLVxcbiAgKiBFbWFpbDogdGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcbiAgKiBQaG9uZTogKzU1IDMyIDg4NjMgMzY4NFxcbiAgKiBTa3lwZTogdGFkZXV6YWdhbGxvXFxuICAqIEdpdGh1YjogZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXG4gICogTG9jYXRpb246IEp1aXogZGUgRm9yYS9NRywgQnJhemlsXFxuXFxuIyMgRWR1Y2F0aW9uYWwgQmFja2dyb3VuZFxcbi0tLVxcblxcbiAgKiBXZWIgRGV2ZWxvcG1lbnQgYXQgSW5zdGl0dXRvIFZpYW5uYSBKdW5pb3IsIDIwMTBcXG4gICogR2VuZXJhbCBFbmdsaXNoIGF0IFRoZSBDYXJseWxlIEluc3RpdHV0ZSwgMjAxMVxcblxcbiMgV29yayBFeHBlcmllbmNlXFxuLS0tXFxuXFxuICAqIDxpPippT1MgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KlFyYW5pbyo8L2k+IGZyb20gPGk+KkRlY2VtYmVyLCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIFFyYW5pbyBpcyBhIHN0YXJ0dXAgdGhhdCBncmV3IGluc2lkZSB0aGUgY29tcGFueSBJIHdvcmsgKGVNaW9sby5jb20pIGFuZCBJIHdhcyBpbnZpdGVkIHRvIGxlYWQgdGhlIGlPUyBkZXZlbG9wbWVudCB0ZWFtXFxuICAgICAgb24gYSBjb21wbGV0ZWx5IHJld3JpdGVuIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KkJvbnV6KjwvaT4gZnJvbSA8aT4qRmVicnVhcnksIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gSSBzdGFydGVkIGRldmVsb3BpbmcgdGhlIGlPUyBhcHAgYXMgYSBmcmVlbGFuY2VyLCBhZnRlciB0aGUgYXBwIHdhcyBwdWJsaXNoZWQgSSB3YXMgaW52aXRlZCB0byBtYWludGFpbiB0aGUgUnVieSBvbiBSYWlsc1xcbiAgICAgIGFwaSBhbmQgd29yayBvbiB0aGUgQW5kcm9pZCB2ZXJzaW9uIG9mIHRoZSBhcHBcXG5cXG4gICogPGk+KldlYiBhbmQgTW9iaWxlIERldmVsb3Blcio8L2k+IGF0IDxpPiplTWlvbG8uY29tKjwvaT4gZnJvbSA8aT4qQXByaWwsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gVGhlIGNvbXBhbnkganVzdCB3b3JrZWQgd2l0aCBQSFAsIHNvIEkgam9pbmVkIHdpdGggdGhlIGludGVudGlvbiBvZiBicmluZ2luZyBuZXcgdGVjaG5vbG9naWVzLiBXb3JrZWQgd2l0aCBQeXRob24sIFJ1YnksIGlPUyxcXG4gICAgICBBbmRyb2lkIGFuZCBIVE1MNSBhcHBsaWNhdGlvbnNcXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUHJvRG9jdG9yIFNvZnR3YXJlIEx0ZGEuKjwvaT4gZnJvbSA8aT4qSnVseSwgMjAxMio8L2k+IHVudGlsIDxpPipPY3RvYmVyLCAyMDEyKjwvaT5cXG4gICAgLSBCcmllZmx5IHdvcmtlZCB3aXRoIHRoZSBpT1MgdGVhbSBvbiB0aGUgZGV2ZWxvcG1lbnQgb2YgdGhlaXIgZmlyc3QgbW9iaWxlIHZlcnNpb24gb2YgdGhlaXIgbWFpbiBwcm9kdWN0LCBhIG1lZGljYWwgc29mdHdhcmVcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQXRvIEludGVyYXRpdm8qPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMio8L2k+IHVudGlsIDxpPipKdWx5LCAyMDEyKjwvaT5cXG4gICAgLSBNb3N0IG9mIHRoZSB3b3JrIHdhcyB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gd29ya2luZyB3aXRoIEphdmFTY3JpcHQgb24gdGhlIGNsaWVudCBzaWRlLiBXb3JrZWQgd2l0aCBNU1NRTFxcbiAgICAgIGFuZCBPcmFjbGUgZGF0YWJhc2VzIGFzIHdlbGxcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qTWFyaWEgRnVtYWPMp2EgQ3JpYWPMp2/Mg2VzKjwvaT4gZnJvbSA8aT4qT2N0b2JlciwgMjAxMCo8L2k+IHVudGlsIDxpPipKdW5lLCAyMDExKjwvaT5cXG4gICAgLSBJIHdvcmtlZCBtb3N0bHkgd2l0aCBQSFAgYW5kIE15U1FMLCBhbHNvIG1ha2luZyB0aGUgZnJvbnQgZW5kIHdpdGggSFRNTCBhbmQgQ1NTIGFuZCBtb3N0IGFuaW1hdGlvbnMgaW4gSmF2YVNjcmlwdCxcXG4gICAgICBhbHRob3VnaCBJIGFsc28gd29ya2VkIHdpdGggYSBmZXcgaW4gQVMzLiBCcmllZmx5IHdvcmtlZCB3aXRoIE1vbmdvREJcXG5cXG4jIyBBZGRpdGlvbmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuXFxuKiBFeHBlcmllbmNlIHVuZGVyIExpbnV4IGFuZCBPUyBYIGVudmlyb25tZW50XFxuKiBTdHVkZW50IEV4Y2hhbmdlOiA2IG1vbnRocyBvZiByZXNpZGVuY2UgaW4gSXJlbGFuZFxcblxcbiMjIExhbmd1YWdlc1xcbi0tLVxcblxcbiogUG9ydHVndWVzZSDigJMgTmF0aXZlIFNwZWFrZXJcXG4qIEVuZ2xpc2gg4oCTIEZsdWVudCBMZXZlbFxcbiogU3BhbmlzaCDigJMgSW50ZXJtZWRpYXRlIExldmVsXFxuXFxuIyMgUHJvZ3JhbW1pbmcgbGFuZ3VhZ2VzIChvcmRlcmVkIGJ5IGtub3dsZWRnZSlcXG4tLS1cXG5cXG4qIEphdmFTY3JpcHRcXG4qIE9iamVjdGl2ZcKtQ1xcbiogQy9DKytcXG4qIFJ1Ynkgb24gUmFpbHNcXG4qIE5vZGVKU1xcbiogUEhQXFxuKiBKYXZhXFxuKiBQeXRob25cXG5cXG4jIyBBZGRpdGlvbmFsIHNraWxsc1xcbi0tLVxcblxcbiogSFRNTDUvQ1NTM1xcbiogTVZDXFxuKiBEZXNpZ24gUGF0dGVybnNcXG4qIFRERC9CRERcXG4qIEdpdFxcbiogQW5hbHlzaXMgYW5kIERlc2lnbiBvZiBBbGdvcml0aG1zXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9LFxuICAgIFwidG1wXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE0LTAzLTAyVDEyOjMxOjEwLjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTAzLTAyVDEyOjMxOjEwLjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7fSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH0sXG4gICAgXCJ1c3JcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDMtMDJUMTI6MzE6MTAuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDMtMDJUMTI6MzE6MTAuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjIyOjI0LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMjoyNC4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMDo1NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjIwOjU0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwicmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBidWZmZXIgPSAnJztcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGtleSA9IGFyZ3MuYXJndW1lbnRzLnNoaWZ0KCk7XFxuICAgIHZhciBpbmRleDtcXG4gICAgaWYgKH4oaW5kZXggPSBrZXkuaW5kZXhPZignPScpKSkge1xcbiAgICAgIHZhciBjb21tYW5kO1xcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggJiYgaW5kZXggPT09IGtleS5sZW5ndGggLSAxKSB7XFxuICAgICAgICBjb21tYW5kID0gYXJncy5hcmd1bWVudHMuam9pbignICcpO1xcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICBjb21tYW5kID0ga2V5LnN1YnN0cihpbmRleCsxKTtcXG4gICAgICB9XFxuXFxuICAgICAga2V5ID0ga2V5LnN1YnN0cigwLCBpbmRleCk7XFxuXFxuICAgICAgaWYgKGNvbW1hbmQpIHtcXG4gICAgICAgIFpTSC5jb21tYW5kTWFuYWdlci5hbGlhcyhrZXksIGNvbW1hbmQpO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgdmFyIGFsaWFzZXMgPSBaU0guY29tbWFuZE1hbmFnZXIuYWxpYXMoKTtcXG5cXG4gICAgZm9yICh2YXIgaSBpbiBhbGlhc2VzKSB7XFxuICAgICAgYnVmZmVyICs9IGkgKyAnPVxcXFwnJyArIGFsaWFzZXNbaV0gKyAnXFxcXCdcXFxcbic7XFxuICAgIH1cXG4gIH1cXG5cXG4gIHN0ZG91dC53cml0ZShidWZmZXIpO1xcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2F0LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjA6NTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMDo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcInJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gWlNILmZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5ub3RGb3VuZCgnY2F0JywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMuZXJyb3IoJ2NhdCcsIHBhdGgsICdJcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZS5yZWFkKCkpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjE6MDEuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMTowMS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcInJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcGF0aCA9IGFyZ3MuYXJndW1lbnRzWzBdIHx8ICd+JztcXG4gIHZhciBkaXIgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2NkJywgcGF0aCkpO1xcbiAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdjZCcsIHBhdGgsICdJcyBhIGZpbGUnKSk7XFxuICB9IGVsc2Uge1xcbiAgICBGUy5jdXJyZW50UGF0aCA9IGRpci5wYXRoO1xcbiAgICBGUy5jdXJyZW50RGlyID0gZGlyLnNlbGYoKTtcXG4gIH1cXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImVjaG8uanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMTowNC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjIxOjA0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwicmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHRyeSB7XFxuICAgIHN0ZG91dC53cml0ZShaU0guYXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncy5yYXcpLmpvaW4oJyAnKSk7XFxuICB9IGNhdGNoIChlcnIpIHtcXG4gICAgc3RkZXJyLndyaXRlKCd6c2g6ICcgKyBlcnIubWVzc2FnZSk7XFxuICB9XFxuICBcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImhlbHAuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMTowNy4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjIxOjA3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwicmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHN0ZG91dC53cml0ZSgnY29tbWFuZHM6Jyk7XFxuICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoWlNILmNvbW1hbmRNYW5hZ2VyLmNvbW1hbmRzKS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdhbGlhc2VzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKENvbW1hbmRNYW5hZ2VyLmFsaWFzZXMpLm1hcChmdW5jdGlvbiAoa2V5KSAge1xcbiAgICByZXR1cm4ga2V5ICsgJz1cXFwiJyArIENvbW1hbmRNYW5hZ2VyLmFsaWFzZXNba2V5XSArICdcXFwiJztcXG4gIH0pLmpvaW4oJyAnKSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJsZXNzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjE6MTIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMToxMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcInJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBpZiAoIWFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICBhcmdzLmFyZ3VtZW50cy5wdXNoKCcuJyk7XFxuICB9XFxuXFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGRpciA9IFpTSC5maWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFkaXIuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLm5vdEZvdW5kKCdscycsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMuZXJyb3IoJ2xzJywgYXJnLCAnSXMgYSBmaWxlJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHZhciBmaWxlcyA9IE9iamVjdC5rZXlzKGRpci5yZWFkKCkpO1xcblxcbiAgICAgIGlmICghYXJncy5vcHRpb25zLmEpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMuZmlsdGVyKGZ1bmN0aW9uIChmaWxlKSB7XFxuICAgICAgICAgIHJldHVybiBmaWxlWzBdICE9PSAnLic7XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcXG4gICAgICAgIHN0ZG91dC53cml0ZShhcmcgKyAnOicpO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAoYXJncy5vcHRpb25zLmwpIHtcXG4gICAgICAgIGZpbGVzID0gZmlsZXMubWFwKGZ1bmN0aW9uIChuYW1lKSB7XFxuICAgICAgICAgIHZhciBmaWxlID0gZGlyLm9wZW4obmFtZSk7XFxuICAgICAgICAgIHZhciB0eXBlID0gZmlsZS5pc0RpcigpID8gJ2QnIDogJy0nO1xcbiAgICAgICAgICB2YXIgcGVybXMgPSB0eXBlICsgJ3J3LXItLXItLSc7XFxuXFxuICAgICAgICAgIHJldHVybiBwZXJtcyArICcgZ3Vlc3QgZ3Vlc3QgJyArIGZpbGUubGVuZ3RoKCkgKyAnICcgKyBmaWxlLm10aW1lKCkgKyAnICcgKyBuYW1lO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIHN0ZG91dC53cml0ZShmaWxlcy5qb2luKGFyZ3Mub3B0aW9ucy5sID8gJ1xcXFxuJyA6ICcgJykpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm1rZGlyLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjI6MjQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMjoyNC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcInJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gWlNILmZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5ub3RGb3VuZCgnbWtkaXInLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5lcnJvcignbWtkaXInLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdta2RpcicsIHBhdGgsICdGaWxlIGV4aXN0cycpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmNyZWF0ZUZvbGRlcigpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIFpTSC5mcy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtdi5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTExVDIzOjQ2OjEyLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTFUMjM6NDY6MTIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxudmFyIEZTID0gcmVxdWlyZSgnenNoLmpzL2xpYi9mcycpO1xcbnZhciBGaWxlID0gcmVxdWlyZSgnenNoLmpzL2xpYi9maWxlJyk7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciB0YXJnZXRQYXRoID0gYXJncy5hcmd1bWVudHMucG9wKCk7XFxuICB2YXIgc291cmNlUGF0aHMgPSBhcmdzLmFyZ3VtZW50cztcXG4gIHZhciB0YXJnZXQgPSBGaWxlLm9wZW4odGFyZ2V0UGF0aCk7XFxuXFxuICBpZiAoIXRhcmdldFBhdGggfHxcXG4gICAgICAhc291cmNlUGF0aHMubGVuZ3RoIHx8XFxuICAgICAgICAoc291cmNlUGF0aHMubGVuZ3RoID4gMSAmJlxcbiAgICAgICAgICghdGFyZ2V0LmV4aXN0cygpIHx8IHRhcmdldC5pc0ZpbGUoKSlcXG4gICAgICAgIClcXG4gICAgICkge1xcbiAgICBzdGRlcnIud3JpdGUoJ3VzYWdlOiBtdiBzb3VyY2UgdGFyZ2V0XFxcXG4gXFxcXHQgbXYgc291cmNlIC4uLiBkaXJlY3RvcnknKTtcXG4gIH0gZWxzZSBpZiAoIXRhcmdldC5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbXYnLCB0YXJnZXQuZGlybmFtZSkpO1xcbiAgfSBlbHNlIHtcXG4gICAgdmFyIGJhY2t1cCA9IHRhcmdldC5zZWxmKCk7XFxuICAgIHZhciBzdWNjZXNzID0gc291cmNlUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChzdWNjZXNzLCBzb3VyY2VQYXRoKSB7XFxuICAgICAgaWYgKHN1Y2Nlc3MpIHtcXG4gICAgICAgIHZhciBzb3VyY2UgPSBGaWxlLm9wZW4oc291cmNlUGF0aCk7XFxuXFxuICAgICAgICBpZiAoIXNvdXJjZS5leGlzdHMoKSkge1xcbiAgICAgICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212Jywgc291cmNlUGF0aHNbMF0pKTtcXG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLmlzRGlyKCkgJiYgdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbXYnLCAncmVuYW1lICcgKyBzb3VyY2VQYXRoc1swXSArICcgdG8gJyArIHRhcmdldFBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICBpZiAoIXRhcmdldC5pc0ZpbGUoKSkge1xcbiAgICAgICAgICAgIHRhcmdldC5yZWFkKClbc291cmNlLmZpbGVuYW1lXSA9IHNvdXJjZS5zZWxmKCk7XFxuICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgdGFyZ2V0LndyaXRlKHNvdXJjZS5yZWFkKCksIGZhbHNlLCB0cnVlKTtcXG4gICAgICAgICAgfVxcblxcbiAgICAgICAgICBzb3VyY2UuZGVsZXRlKCk7XFxuICAgICAgICAgIHJldHVybiB0cnVlO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG5cXG4gICAgICByZXR1cm4gZmFsc2U7XFxuICAgIH0sIHRydWUpO1xcblxcbiAgICBpZiAoc3VjY2Vzcykge1xcbiAgICAgIEZTLndyaXRlRlMoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0YXJnZXQuZGlyW3RhcmdldC5maWxlbmFtZV0gPSBiYWNrdXA7XFxuICAgIH1cXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInB3ZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTExVDIzOjQ2OjIxLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTFUMjM6NDY6MjEuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxudmFyIEZTID0gcmVxdWlyZSgnenNoLmpzL2xpYi9mcycpO1xcblxcbnJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgX3B3ZCA9IEZTLmN1cnJlbnRQYXRoO1xcblxcbiAgaWYgKHN0ZG91dCkge1xcbiAgICBzdGRvdXQud3JpdGUoX3B3ZCk7XFxuICAgIG5leHQoKTtcXG4gIH0gZWxzZSB7XFxuICAgIHJldHVybiBfcHdkO1xcbiAgfVxcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm0uanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMVQyMzo0NjoyNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTExVDIzOjQ2OjI2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiJ3VzZSBzdHJpY3QnO1xcblxcbnZhciBGUyA9IHJlcXVpcmUoJ3pzaC5qcy9saWIvZnMnKTtcXG52YXIgRmlsZSA9IHJlcXVpcmUoJ3pzaC5qcy9saWIvZmlsZScpO1xcblxcbnJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybScsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybScsIGFyZywgJ2lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm1kaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMVQyMzo0NjozMS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTExVDIzOjQ2OjMxLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiJ3VzZSBzdHJpY3QnO1xcblxcbnZhciBGUyA9IHJlcXVpcmUoJ3pzaC5qcy9saWIvZnMnKTtcXG52YXIgRmlsZSA9IHJlcXVpcmUoJ3pzaC5qcy9saWIvZmlsZScpO1xcblxcbnJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpIHx8ICFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybWRpcicsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3JtZGlyJywgYXJnLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic291cmNlLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTFUMjM6NDc6MDMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMVQyMzo0NzowMy4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIi8vIGpzaGludCBldmlsOiB0cnVlXFxuJ3VzZSBzdHJpY3QnO1xcblxcbnZhciBGaWxlID0gcmVxdWlyZSgnenNoLmpzL2xpYi9maWxlJyk7XFxudmFyIENvbnNvbGUgPSByZXF1aXJlKCd6c2guanMvbGliL2NvbnNvbGUnKTtcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKGFyZ3MuYXJndW1lbnRzLmxlbmd0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihhcmdzLmFyZ3VtZW50c1swXSk7XFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZSgnc291cmNlOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0cnkge1xcbiAgICAgICAgdmFyIGNvbnNvbGUgPSBuZXcgQ29uc29sZShzdGRvdXQsIHN0ZGVycik7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcXG4gICAgICAgIHZhciByZXN1bHQgPSBKU09OLnN0cmluZ2lmeShldmFsKGZpbGUucmVhZCgpKSk7XFxuICAgICAgICBzdGRvdXQud3JpdGUoJzwtICcgKyByZXN1bHQpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm90IGVub3VnaCBhcmd1bWVudHMnKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRvdWNoLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTFUMjM6NDc6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMVQyMzo0NzowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG52YXIgRlMgPSByZXF1aXJlKCd6c2guanMvbGliL2ZzJyk7XFxudmFyIEZpbGUgPSByZXF1aXJlKCd6c2guanMvbGliL2ZpbGUnKTtcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCd0b3VjaCcsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpe1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigndG91Y2gnLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUud3JpdGUoJycsIHRydWUsIHRydWUpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInVuYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMVQyMzo0NzoxNS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTExVDIzOjQ3OjE1LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiJ3VzZSBzdHJpY3QnO1xcblxcbnZhciBDb21tYW5kTWFuYWdlciA9IHJlcXVpcmUoJ3pzaC5qcy9saWIvY29tbWFuZC1tYW5hZ2VyJyk7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBjbWQgPSBhcmdzLmFyZ3VtZW50c1swXTtcXG5cXG4gIGlmIChjbWQpIHtcXG4gICAgQ29tbWFuZE1hbmFnZXIudW5hbGlhcyhjbWQpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwidmltLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMTItMjVUMDI6MTk6NTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0xMi0yNVQwMjoxOTo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfVxuICB9LFxuICBcInR5cGVcIjogXCJkXCJcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGUyA9IHJlcXVpcmUoJy4vZnMnKTtcblxudmFyIEZpbGUgPSAoZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBGaWxlKHBhdGgpIHtcbiAgICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuXG4gICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcblxuICAgIHRoaXMuZmlsZW5hbWUgPSBwYXRoLnBvcCgpO1xuICAgIHRoaXMuZGlybmFtZSA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICB0aGlzLmRpciA9IEZTLm9wZW4odGhpcy5kaXJuYW1lKTtcbiAgfVxuXG4gIEZpbGUub3BlbiA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKHBhdGgpO1xuICB9O1xuXG4gIEZpbGUuZ2V0VGltZXN0YW1wID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUucGFyZW50RXhpc3RzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmRpciAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLmRpciA9PT0gJ29iamVjdCcgJiYgdGhpcy5kaXIudHlwZSA9PT0gJ2QnO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLmV4aXN0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHR5cGVvZiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdICE9PSAndW5kZWZpbmVkJyk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUuaXNGaWxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmIHRoaXMuZmlsZW5hbWUgJiYgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS50eXBlID09PSAnZic7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUuaXNEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2QnKTtcbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLndyaXRlKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoY29udGVudCwgYXBwZW5kLCBmb3JjZSkge1xuICAgIHZhciB0aW1lID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcblxuICAgIGlmICghdGhpcy5leGlzdHMoKSkge1xuICAgICAgaWYgKGZvcmNlICYmIHRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlRmlsZSh0aW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmaWxlOiAnICsgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLmlzRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB3cml0ZSB0byBkaXJlY3Rvcnk6ICVzJywgdGhpcy5wYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIF9jb250ZW50ID0gJyc7XG4gICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgIF9jb250ZW50ICs9IHRoaXMucmVhZCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRpci5tdGltZSA9IHRpbWU7XG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLm10aW1lID0gdGltZTtcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA9IF9jb250ZW50ICsgY29udGVudDtcbiAgICAgIEZTLndyaXRlRlMoKTtcbiAgICB9XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA6IHRoaXMuZGlyLmNvbnRlbnQ7XG4gIH07XG5cbiAgdmFyIF9jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSwgY29udGVudCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGltZXN0YW1wKSB7XG4gICAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgJXMgYWxyZWFkeSBleGlzdHMnLCB0aGlzLnBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRpbWVzdGFtcCkge1xuICAgICAgICB0aW1lc3RhbXAgPSBGaWxlLmdldFRpbWVzdGFtcCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdID0ge1xuICAgICAgICBjdGltZTogdGltZXN0YW1wLFxuICAgICAgICBtdGltZTogdGltZXN0YW1wLFxuICAgICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICB9O1xuXG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfTtcbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5jcmVhdGVGb2xkZXIgPSBfY3JlYXRlKCdkJywge30pO1xuICBGaWxlLnByb3RvdHlwZS5jcmVhdGVGaWxlID0gX2NyZWF0ZSgnZicsICcnKTtcblxuICBGaWxlLnByb3RvdHlwZS5zZWxmID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIgOiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgIHJldHVybiBGaWxlLm9wZW4odGhpcy5wYXRoICsgJy8nICsgZmlsZSk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250ZW50ID0gdGhpcy5yZWFkKCk7XG5cbiAgICBpZiAodGhpcy5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0RpcigpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29udGVudCkubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXTtcbiAgRmlsZS5wcm90b3R5cGUubXRpbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHQgPSBuZXcgRGF0ZSh0aGlzLnNlbGYoKS5tdGltZSk7XG5cbiAgICB2YXIgZGF5QW5kTW9udGggPSAgbW9udGhzW3QuZ2V0TW9udGgoKV0gKyAnICcgKyB0LmdldERheSgpO1xuICAgIGlmIChEYXRlLm5vdygpIC0gdC5nZXRUaW1lKCkgPiA2ICogMzAgKiAyNCAqIDYwKiA2MCAqIDEwMDApIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0RnVsbFllYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRIb3VycygpICsgJzonICsgdC5nZXRNaW51dGVzKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBGaWxlO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlO1xuIiwiLy8ganNoaW50IGJpdHdpc2U6IGZhbHNlXG4ndXNlIHN0cmljdCc7XG5cbnZhciBMb2NhbFN0b3JhZ2UgPSByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2UnKTtcblxudmFyIEZTID0ge307XG52YXIgRklMRV9TWVNURU1fS0VZID0gJ2ZpbGVfc3lzdGVtJztcblxuRlMud3JpdGVGUyA9IGZ1bmN0aW9uICgpIHtcbiAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oRklMRV9TWVNURU1fS0VZLCBKU09OLnN0cmluZ2lmeShGUy5yb290KSk7XG59O1xuXG5cbkZTLnJvb3QgPSBKU09OLnBhcnNlKExvY2FsU3RvcmFnZS5nZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSkpO1xudmFyIGZpbGVTeXN0ZW0gPSByZXF1aXJlKCcuL2ZpbGUtc3lzdGVtLmpzb24nKTtcbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShvbGQsIG5uZXcpIHtcbiAgZm9yICh2YXIga2V5IGluIG5uZXcpIHtcbiAgICBvbGRba2V5XSA9IG5uZXdba2V5XTtcbiAgfVxufTtcblxuaWYgKCFGUy5yb290IHx8ICFGUy5yb290LmNvbnRlbnQpIHtcbiAgRlMucm9vdCA9IGZpbGVTeXN0ZW07XG59IGVsc2Uge1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAoZnVuY3Rpb24gcmVhZGRpcihvbGQsIG5uZXcpIHtcbiAgICBpZiAodHlwZW9mIG9sZC5jb250ZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5uZXcuY29udGVudCkge1xuICAgICAgICB2YXIgbiA9IG5uZXcuY29udGVudFtrZXldO1xuICAgICAgICB2YXIgbyA9IG9sZC5jb250ZW50W2tleV07XG5cbiAgICAgICAgaWYgKCFvLmNvbnRlbnQpIHtcbiAgICAgICAgICBvID0ge1xuICAgICAgICAgICAgY3RpbWU6IHRpbWUsXG4gICAgICAgICAgICBtdGltZTogdGltZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IG8uY29udGVudCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGVvZiBvID09PSAnc3RyaW5nJyA/ICdmJyA6ICdkJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoby50eXBlID09PSAnZicgJiYgby5tdGltZSA9PT0gby5jdGltZSkge1xuICAgICAgICAgIGNvcHkobywgbik7XG4gICAgICAgIH0gZWxzZSBpZiAoby50eXBlID09PSAnZCcpIHtcbiAgICAgICAgICByZWFkZGlyKG8sIG4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KShGUy5yb290LCBmaWxlU3lzdGVtKTtcblxuICBGUy53cml0ZUZTKCk7XG59XG5cbkZTLmN1cnJlbnRQYXRoID0gRlMuaG9tZSA9ICcvVXNlcnMvZ3Vlc3QnO1xuRlMuY3VycmVudERpciA9IEZTLnJvb3QuY29udGVudC5Vc2Vycy5jb250ZW50Lmd1ZXN0O1xuXG5GUy5kaXJuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpO1xufTtcblxuRlMuYmFzZW5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xufTtcblxuRlMudHJhbnNsYXRlUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBpbmRleDtcblxuICBwYXRoID0gcGF0aC5yZXBsYWNlKCd+JywgRlMuaG9tZSk7XG5cbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSAoRlMuY3VycmVudFBhdGggIT09ICcvJyA/IEZTLmN1cnJlbnRQYXRoICsgJy8nIDogJy8nKSArIHBhdGg7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4uJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgtMSwgMik7XG4gIH1cblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgaWYgKHBhdGhbMF0gPT09ICcuJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIGlmIChwYXRoLmxlbmd0aCA8IDIpIHtcbiAgICBwYXRoID0gWywsXTtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4oJy8nKS5yZXBsYWNlKC8oW14vXSspXFwvKyQvLCAnJDEnKTtcbn07XG5cbkZTLnJlYWxwYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcblxuICByZXR1cm4gRlMuZXhpc3RzKHBhdGgpID8gcGF0aCA6IG51bGw7XG59O1xuXG5cbkZTLm9wZW4gPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zdWJzdHIoMSkuc3BsaXQoJy8nKS5maWx0ZXIoU3RyaW5nKTtcblxuICB2YXIgY3dkID0gRlMucm9vdDtcbiAgd2hpbGUocGF0aC5sZW5ndGggJiYgY3dkLmNvbnRlbnQpIHtcbiAgICBjd2QgPSBjd2QuY29udGVudFtwYXRoLnNoaWZ0KCldO1xuICB9XG5cbiAgcmV0dXJuIGN3ZDtcbn07XG5cbkZTLmV4aXN0cyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAhIUZTLm9wZW4ocGF0aCk7XG59O1xuXG5GUy5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFtdLmpvaW4uY2FsbChhcmd1bWVudHMsICc6ICcpO1xufTtcblxuRlMubm90Rm91bmQgPSBmdW5jdGlvbiAoY21kLCBhcmcpIHtcbiAgcmV0dXJuIEZTLmVycm9yKGNtZCwgYXJnLCAnTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeScpO1xufTtcblxuRlMuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKF9wYXRoKSB7XG4gIHZhciBwYXRoID0gdGhpcy50cmFuc2xhdGVQYXRoKF9wYXRoKTtcbiAgdmFyIG9wdGlvbnMgPSBbXTtcblxuICBpZiAoX3BhdGguc2xpY2UoLTEpID09PSAnLycpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIGlmIChwYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZmlsZW5hbWUgPSBfcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIHZhciBvcGVuUGF0aCA9IGZpbGVuYW1lLmxlbmd0aCA+IDEgPyBwYXRoLnNsaWNlKDAsIC0xKSA6IHBhdGg7XG4gICAgdmFyIGRpciA9IEZTLm9wZW4ob3BlblBhdGgpO1xuICAgIHZhciBmaWxlTmFtZSA9ICcnO1xuICAgIHZhciBwYXJlbnRQYXRoID0gcGF0aDtcblxuICAgIGlmICghZGlyKSB7XG4gICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgZmlsZU5hbWUgPSBwYXRoLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBwYXJlbnRQYXRoID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgICAgZGlyID0gRlMub3BlbihwYXJlbnRQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoZGlyICYmIHR5cGVvZiBkaXIuY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBkaXIuY29udGVudCkge1xuICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCBmaWxlTmFtZS5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGZpbGVOYW1lKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkaXIuY29udGVudFtrZXldLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBrZXkgKz0gJy8nO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9wdGlvbnMucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZTO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgc2Nyb2xsKSB7XG4gIHdpbmRvdy5vbnJlc2l6ZSA9IHNjcm9sbDtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmZ1bGwtc2NyZWVuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50ICkge1xuICAgICAgaWYgKGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcgP1xuICB7XG4gICAgc2V0SXRlbTogZnVuY3Rpb24oKSB7fSxcbiAgICBnZXRJdGVtOiBmdW5jdGlvbigpIHsgcmV0dXJuIG51bGw7IH1cbiAgfVxuOlxuICBsb2NhbFN0b3JhZ2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFN0cmVhbSgpIHtcbiAgdGhpcy5fY2FsbGJhY2tzID0ge307XG59XG5cblN0cmVhbS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gIGlmICghdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSkge1xuICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSBbXTtcbiAgfVxuXG4gIHRoaXMuX2NhbGxiYWNrc1tldmVudF0ucHVzaChjYWxsYmFjayk7XG59O1xuXG5TdHJlYW0ucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgdGhpcy5lbW1pdCgnZGF0YScsIGRhdGEpO1xufTtcblxuU3RyZWFtLnByb3RvdHlwZS5lbW1pdCA9IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb21tYW5kTWFuYWdlciA9IHJlcXVpcmUoJy4vY29tbWFuZC1tYW5hZ2VyJyk7XG52YXIgUkVQTCA9IHJlcXVpcmUoJy4vUkVQTCcpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJy4vc3RyZWFtJyk7XG52YXIgYmluZEZ1bGxTY3JlZW4gPSByZXF1aXJlKCcuL2Z1bGwtc2NyZWVuJyk7XG52YXIgRlMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbnZhciBaU0ggPSB7XG4gIGFyZ3NQYXJzZXI6IHJlcXVpcmUoJy4vYXJncy1wYXJzZXInKSxcbiAgY29tbWFuZE1hbmFnZXI6IHJlcXVpcmUoJy4vY29tbWFuZC1tYW5hZ2VyJyksXG4gIGNvbnNvbGU6IHJlcXVpcmUoJy4vY29uc29sZScpLFxuICBmaWxlOiByZXF1aXJlKCcuL2ZpbGUnKSxcbiAgZnM6IHJlcXVpcmUoJy4vZnMnKSxcbiAgbG9jYWxTdG9yYWdlOiByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2UnKSxcbiAgcmVwbDogcmVxdWlyZSgnLi9yZXBsJyksXG4gIHN0cmVhbTogcmVxdWlyZSgnLi9zdHJlYW0nKVxufTtcblxudmFyIHB3ZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIEZTLmN1cnJlbnRQYXRoLnJlcGxhY2UoRlMuaG9tZSwgJ34nKTtcbn07XG5cblpTSC4kUFMxID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJzxzcGFuIGNsYXNzPVwid2hvXCI+Z3Vlc3Q8L3NwYW4+ICcgK1xuICAgICdvbiAnICtcbiAgICAnPHNwYW4gY2xhc3M9XCJ3aGVyZVwiPicgKyBwd2QoKSArICc8L3NwYW4+ICcrXG4gICAgJzxzcGFuIGNsYXNzPVwiYnJhbmNoXCI+wrFtYXN0ZXI8L3NwYW4+Jmd0Oyc7XG59O1xuXG5aU0gucHJvbXB0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIHNwYW4uY2xhc3NOYW1lID0gJ3BzMSc7XG4gIHNwYW4uaW5uZXJIVE1MID0gWlNILiRQUzEoKTtcblxuXG4gIHZhciBjb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICBjb2RlLmNsYXNzTmFtZSA9ICdjb2RlJztcblxuICByb3cuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gIHJvdy5hcHBlbmRDaGlsZChjb2RlKTtcblxuICBaU0guY29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG5cbiAgUkVQTC51c2UoY29kZSwgWlNIKTtcblxuICBaU0guc3RhdHVzKHB3ZCgpKTtcblxuICBaU0guc2Nyb2xsKCk7XG5cbiAgcm93LmFwcGVuZENoaWxkKFpTSC5pbnB1dCk7XG5cbiAgWlNILmlucHV0LmZvY3VzKCk7XG59O1xuXG5aU0guc3RhdHVzID0gZnVuY3Rpb24odGV4dCkge1xuICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICB0aGlzLnN0YXR1c2Jhci5pbm5lclRleHQgPSB0ZXh0O1xuICB9XG59O1xuXG5aU0guaW5pdCA9IGZ1bmN0aW9uIChjb250YWluZXIsIHN0YXR1c2Jhcikge1xuICB0aGlzLnJvb3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgdGhpcy5zdGF0dXNiYXIgPSBzdGF0dXNiYXI7XG4gIHRoaXMuaW5pdGlhbGl6ZUlucHV0KCk7XG4gIHRoaXMucHJvbXB0KCk7XG4gIGJpbmRGdWxsU2NyZWVuKHRoaXMuY29udGFpbmVyLnBhcmVudEVsZW1lbnQsIHRoaXMuc2Nyb2xsKTtcbn07XG5cblpTSC5pbml0aWFsaXplSW5wdXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGlucHV0LmNsYXNzTmFtZSA9ICdmYWtlLWlucHV0JztcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKGlucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB7XG4gICAgICBpbnB1dC5ibHVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgfVxuICB9KTtcblxuICB0aGlzLmlucHV0ID0gaW5wdXQ7XG59O1xuXG5aU0guY3JlYXRlID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xuICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb250YWluZXIpO1xuICB9XG5cbiAgY29udGFpbmVyLmlubmVySFRNTCA9XG4gICAgJzxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPicgK1xuICAgICAgJzxkaXYgY2xhc3M9XCJiYXJcIj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJidXR0b25zXCI+JyArXG4gICAgICAgICAgJzxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT4nICtcbiAgICAgICAgICAnPGEgY2xhc3M9XCJtaW5pbWl6ZVwiIGhyZWY9XCIjXCI+PC9hPicgK1xuICAgICAgICAgICc8YSBjbGFzcz1cIm1heGltaXplXCIgaHJlZj1cIiNcIj48L2E+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0aXRsZVwiPicgK1xuICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+JyArXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nICtcbiAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPicgK1xuICAgICAgJzwvZGl2PicgK1xuICAgICc8L2Rpdj4nO1xuXG4gIHRoaXMuaW5pdChjb250YWluZXIucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKSxcbiAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuc3RhdHVzLWJhcicpKTtcbn07XG5cblpTSC51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjb2RlcyA9IHRoaXMuY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NvZGUnKTtcblxuICBpZiAoIWNvZGVzLmxlbmd0aCkge1xuICAgIHRoaXMucHJvbXB0KCk7XG4gIH0gZWxzZSB7XG4gICAgUkVQTC51c2UoY29kZXNbY29kZXMubGVuZ3RoIC0gMV0sIFpTSCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG91dHB1dCAoX291dHB1dCwgX2NsYXNzKSB7XG4gIHZhciBvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgb3V0LmNsYXNzTmFtZSA9ICdjb2RlICcgKyBbX2NsYXNzXTtcbiAgb3V0LmlubmVySFRNTCA9IF9vdXRwdXQ7XG5cbiAgWlNILmNvbnRhaW5lci5hcHBlbmRDaGlsZChvdXQpO1xuICBaU0guc2Nyb2xsKCk7XG59XG5cblpTSC5zdGRvdXQgPSBuZXcgU3RyZWFtKCk7XG5aU0guc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgb3V0cHV0KGRhdGEudG9TdHJpbmcoKSwgJ3N0ZG91dCcpO1xufSk7XG5cblpTSC5zdGRlcnIgPSBuZXcgU3RyZWFtKCk7XG5aU0guc3RkZXJyLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgb3V0cHV0KGRhdGEudG9TdHJpbmcoKSwgJ3N0ZGVycicpO1xufSk7XG5cblpTSC5zY3JvbGwgPSBmdW5jdGlvbiAoKSB7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIFpTSC5yb290Q29udGFpbmVyLnNjcm9sbFRvcCA9IFpTSC5yb290Q29udGFpbmVyLnNjcm9sbEhlaWdodDtcbiAgfSwgMCk7XG59O1xuXG5aU0guY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gIFpTSC5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gIFpTSC5wcm9tcHQoKTtcbn07XG5cbkNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyKCdjbGVhcicsIFpTSC5jbGVhcik7XG5cbih0eXBlb2YgcmVxdWlyZSA9PT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBnbG9iYWwpLlpTSCA9IFpTSDtcbm1vZHVsZS5leHBvcnRzID0gWlNIO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
