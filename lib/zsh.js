import bindFullScreen from './full-screen';
import CommandManager from './command-manager';
import FS from './fs';
import REPL from './REPL';
import Stream from './stream';

/**
 * Only used by source.js - unused import so it gets into the bundle
 */
import Console from './console';

class ZSH {
  constructor(container, statusbar, createHTML) {
    if (createHTML) {
      this.create(container);
    } else {
      this.container = container;
      this.statusbar = statusbar;
    }

    this.createStreams();

    this.rootContainer = this.container;
    this.REPL = new REPL(this);
    this.FS = FS;
    this.initializeInput();
    this.prompt();

    bindFullScreen(this.container.parentElement, this.scroll.bind(this));

    CommandManager.register('clear', this.clear.bind(this));
  }

  createStreams() {
    this.stdin = new Stream();
    this.stderr = new Stream();
    this.stdout = new Stream();

    this.stderr.on('data', (d) => this.output(d, 'stderr'));
    this.stdout.on('data', (d) => this.output(d, 'stdout'));

    window.addEventListener('keydown', (event) => {
      this.stdin.write(event);
    });
  }

  pwd() {
    return FS.currentPath.replace(FS.home, '~');
  }

  $PS1() {
    return `
      <span class="who">guest</span>
      on
      <span class="where"> ${this.pwd()} </span>
      <span class="branch">±master</span>&gt;
    `;
  }

  prompt() {
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

  status(text) {
    if (this.statusbar) {
      this.statusbar.innerHTML = text;
    }
  }

  initializeInput() {
    var input = document.createElement('input');
    input.className = 'fake-input';
    this.rootContainer.addEventListener('click', (e) => {
      e.preventDefault();
      if (input === document.activeElement) {
        input.blur();
      } else {
        input.focus();
      }
    });

    this.input = input;
  }

  create(container) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }

    container.innerHTML = `
      <div class="terminal">
        <div class="bar">
          <div class="buttons">
            <a class="close" href="#"></a>
            <a class="minimize" href="#"></a>
            <a class="maximize" href="#"></a>
          </div>
          <div class="title"></div>
          <a class="full-screen" href="#"></a>
        </div>
        <div class="content"></div>
        <div class="status-bar"></div>
      </div>
    `;

    this.container = container.querySelector('.content');
    this.statusbar = container.querySelector('.status-bar');
  }

  update() {
    var codes = this.container.getElementsByClassName('code');
    if (!codes.length) {
      this.prompt();
    } else {
      this.REPL.use(codes[codes.length - 1], ZSH);
    }
  }

  output(text, className) {
    var out = document.createElement('div');
    out.className = 'code ' + [className];
    out.innerHTML = text;

    this.container.appendChild(out);
    this.scroll();
  }

  scroll() {
    var c = this.rootContainer;
    setTimeout(() => c.scrollTop = c.scrollHeight, 0);
  }

  clear() {
    this.container.innerHTML = '';
    this.prompt();
  }

}

window.ZSH = ZSH;
export default ZSH;
