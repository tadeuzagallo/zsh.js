'use strict';

import zsh from './zsh';

const map = Array.prototype.map;
const stringify = (args) =>
  map.call(
    args,
    (a) => JSON.stringify(a) || [a]+''
  ).join(' ');

export default class Console {
  constructor(stdout, stderr) {
    this.stdout = stdout;
    this.stderr = stderr;
  }

  log() {
    this.stdout.write(stringify(arguments));
  }

  error() {
    this.stderr.write(stringify(arguments));
  }

  clear() {
    zsh.clear();
  }
}
