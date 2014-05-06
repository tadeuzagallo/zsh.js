var _ = require('lodash'),
    fs = require('fs'),
    glob = require('glob'),
    gulp = require('gulp'),
    lr = require('tiny-lr'),
    Path = require('path'),

    browserify = require('gulp-browserify'),
    concat = require('gulp-concat'),
    exec = require('gulp-exec'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    minifyCss = require('gulp-minify-css'),
    mocha = require('gulp-mocha'),
    plumber = require('gulp-plumber'),
    refresh = require('gulp-livereload'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    stylus = require('gulp-stylus'),

    server = lr(),

    config = _.extend({
      port: 8080,
      lrport: 35729,
      env: 'development'
    }, gutil.env),

    path = {
      js: {
        bin: 'lib/fs/usr/bin/*',
        lib: {
          all: 'lib/**/*.js',
          entry: 'lib/terminal.js'
        },
        fs: {
          all: 'lib/fs/**/*.js',
          entry: 'lib/file-system.json'
        },
        commands: {
          all: 'lib/commands/**/*.js',
          entry: 'lib/commands.js'
        },
        spec: {
          all: 'spec/js/**/*.js'
        }
      },
      css: {
        all: 'assets/**/*.styl'
      },
      build: 'dist/'
    },

    production = config.env === 'production';

gulp.task('jshint', function () {
  'use strict';

  gulp.src(['Gulpfile.js', path.js.spec.all, path.js.lib.all])
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clean', function () {
  'use strict';
  gulp.src([path.build, path.js.bin])
    .pipe(plumber())
    .pipe(exec('rm -r <%= file.path %>'));
});

gulp.task('commands', ['clean'], function () {
  'use strict';
  var commands = fs.readdirSync('lib/commands')
    .filter(function (f) {
      return f[0] !== '.' && f.substr(-3) === '.js';
    }).map(function (f) {
      if (production) {
        exec('ln -fh ' +
          __dirname +
          '/lib/commands/' +
          f +
          ' lib/fs/usr/bin/' +
          f.slice(0, -3));
      }

      return 'require(\'./commands/' + f + '\');';
    });

  fs.writeFileSync(path.js.commands.entry, commands.join('\n'));
});

gulp.task('file-system', ['commands'], function () {
  'use strict';
  var _fs = {},
    _ignore = [
      '\\.DS_Store',
      '.*\\.swp'
    ],
    root = 'lib/fs';

  (function readdir(path, container)  {
    var files = fs.readdirSync(path);

    files.forEach(function (file)  {
      for (var i = 0, l = _ignore.length; i < l; i++) {
        var ignore = _ignore[i];
        if (file.match(new RegExp('^' + ignore + '$'))) {
          return;
        }
      }

      var stat = fs.statSync(path + '/' + file);

      if (stat.isDirectory()) {
        var f = {};
        readdir(path + '/' + file, f);
        container[file] = f;
      } else {
        container[file] = fs.readFileSync(path + '/' + file).toString();
      }
    });
  })(root, _fs);

  fs.writeFileSync(path.js.fs.entry, JSON.stringify(_fs, null, 2));
});

gulp.task('js', ['jshint', 'file-system'], function () {
  'use strict';
  gulp.src(path.js.lib.entry, { read: false })
    .pipe(plumber())
    .pipe(browserify({ debug: !production }))
    .on('prebundle', function (bundle) {
      bundle.require('./fs', { expose: 'zsh.js/lib/fs' });
      bundle.require('./terminal', { expose: 'zsh.js' });
      bundle.require('./args-parser', { expose: 'zsh.js/lib/args-parser' });
      bundle.require('./command-manager', { expose: 'zsh.js/lib/command-manager' });
      bundle.require('./console', { expose: 'zsh.js/lib/console' });
      bundle.require('./file', { expose: 'zsh.js/lib/file' });
      glob.sync(path.js.commands.all).forEach(function (command) {
        command = Path.basename(command, '.js');
        bundle.require('./commands/' + command, { expose: 'zsh.js/lib/commands/' + command });
      });
    })
    .pipe(rename('terminal.js'))
    .pipe(gulp.dest(path.build))
    .pipe(rename('terminal.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server));
});

gulp.task('css', function () {
  'use strict';
  gulp.src(path.css.all)
    .pipe(plumber())
    .pipe(stylus({ urlFunc: ['inline-image'] }))
    .pipe(concat('terminal.css'))
    .pipe(gulp.dest(path.build))
    .pipe(rename('terminal.min.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server));
});

gulp.task('build', ['js', 'css']);

gulp.task('watch', ['build'], function () {
  'use strict';
  server.listen(config.lrport, function (err) {
    if (err) {
      console.log(err);
    }
  });

  gulp.watch(path.css.all, ['css']);
  gulp.watch(path.js.lib.all, ['js']);
});

gulp.task('spec', ['js'], function () {
  'use strict';
  gulp.src('spec/**/*-spec.js')
    .pipe(mocha());
});

gulp.task('spec-live', ['spec'], function () {
  'use strict';
  gulp.watch('lib/**/*.js', ['js', 'spec']);
  gulp.watch('spec/**/*.js', ['spec']);
});

gulp.task('default', ['watch']);
