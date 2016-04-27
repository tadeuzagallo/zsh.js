import CommandManager from 'zsh.js/command-manager';
import File from 'zsh.js/file';

export default function (args, stdin, stdout, stderr, next) {
  stdout.write('registered commands:');
  if (CommandManager.commands) {
    stdout.write(Object.keys(CommandManager.commands).join(' '));
  }

  stdout.write('\n');
  stdout.write('executables (on /usr/bin):');
  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {
    return file.replace(/\.js$/, '');
  }).join(' '));

  stdout.write('\n');

  stdout.write('aliases:');

  if (CommandManager.aliases) {
    const it = (key) => `${key}="${CommandManager.aliases[key]}"`;
    stdout.write(Object.keys(CommandManager.aliases).map(it).join(' '));
  }

  next();
}
