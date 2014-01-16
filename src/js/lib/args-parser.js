var ArgsParser = {};

ArgsParser.parse = function (args) {
  args = ([args] + '').trim();

  var out =  {
    arguments: [],
    options: {},
    raw: args
  };

  var _args = [];
  var word = '';
  var string = false;
  var i, l;

  for (i = 0, l = args.length; i < l; i++) {
    var char = args[i];
    if (char === '"' || char === "'") {
      if (string) {
        if (char === string) {
          _args.push(word);
          word = '';
          string = null;
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
    throw 'unterminated string';
  } else {
    _args.push(word);
  }

  args = _args;

  function addOption(option, value) {
    out.options[option] = typeof(value) === 'string' ? value : true;
  }

  for (i = 0, l = args.length; i < l; i++) {
    var arg = args[i];

    if (!arg)  {
      continue;
    }

    if (arg.substr(0, 2) === '--') {
      addOption(arg.substr(2), args[++i]);
    } else if (arg[0] === '-') {
      [].forEach.call(arg.substr(1), addOption);
    } else {
      out.arguments.push(arg);
    }
  }

  return out;
};

module.exports = ArgsParser;
