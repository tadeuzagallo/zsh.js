/* global console */
'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    gulp = require('gulp'),
    lr = require('tiny-lr'),

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
          entry: './lib/zsh.js'
        },
        fs: {
          all: 'lib/fs/**/*.js',
          entry: 'lib/file-system.json'
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
  gulp.src(['Gulpfile.js', path.js.spec.all, path.js.lib.all])
    .pipe(plumber())
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clean', function () {
  gulp.src([path.build])
    .pipe(plumber())
    .pipe(exec('rm -r <%= file.path %>'));
});

gulp.task('file-system', function () {
  var _fs = {},
    _ignore = [
      '\\.DS_Store',
      '.*\\.swp'
    ],
    root = 'lib';

  (function readdir(path, container, file)  {
    var files = fs.readdirSync(path);

    function readfile(file) {
      for (var i = 0, l = _ignore.length; i < l; i++) {
        var ignore = _ignore[i];
        if (file.match(new RegExp('^' + ignore + '$'))) {
          return;
        }
      }

      var stat = fs.lstatSync(path + '/' + file);

      var content;
      var type;
      if (stat.isSymbolicLink()) {
        type = 'l';
        content = fs.readlinkSync(path + '/' + file);
      } else if (stat.isDirectory()) {
        content = {};
        readdir(path + '/' + file, content);
        type = 'd';
      } else {
        content = fs.readFileSync(path + '/' + file).toString();
        type = 'f';
      }
      container[file] = {
        mtime: stat.mtime,
        ctime: stat.ctime,
        content: content,
        type: type
      };
    }

    if (file) {
      readfile(file);
    } else {
      files.forEach(readfile);
    }
  })(root, _fs, 'fs');

  fs.writeFileSync(path.js.fs.entry, JSON.stringify(_fs.fs, null, 2));
});

gulp.task('js', ['jshint', 'file-system'], function () {
  gulp.src(path.js.lib.entry, { read: false })
    .pipe(plumber())
    .pipe(browserify({ debug: !production }))
    .on('prebundle', function (bundle) {
      bundle.require('./fs', { expose: 'zsh.js/lib/fs' });
      bundle.require('./zsh', { expose: 'zsh.js' });
      bundle.require('./args-parser', { expose: 'zsh.js/lib/args-parser' });
      bundle.require('./command-manager', { expose: 'zsh.js/lib/command-manager' });
      bundle.require('./console', { expose: 'zsh.js/lib/console' });
      bundle.require('./file', { expose: 'zsh.js/lib/file' });
    })
    .pipe(rename('zsh.js'))
    .pipe(gulp.dest(path.build))
    .pipe(rename('zsh.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server));
});

gulp.task('css', function () {
  gulp.src(path.css.all)
    .pipe(plumber())
    .pipe(stylus({ urlFunc: ['inline-image'] }))
    .pipe(concat('zsh.css'))
    .pipe(gulp.dest(path.build))
    .pipe(rename('zsh.min.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server));
});

gulp.task('build', ['js', 'css']);

gulp.task('watch', ['build'], function () {
  server.listen(config.lrport, function (err) {
    if (err) {
      console.log(err);
    }
  });

  gulp.watch(path.css.all, ['css']);
  gulp.watch(path.js.lib.all, ['build']);
});

gulp.task('spec', ['js'], function () {
  gulp.src('spec/**/*-spec.js')
    .pipe(mocha());
});

gulp.task('spec-live', ['spec'], function () {
  gulp.watch('lib/**/*.js', ['js', 'spec']);
  gulp.watch('spec/**/*.js', ['spec']);
});

gulp.task('default', ['watch']);
