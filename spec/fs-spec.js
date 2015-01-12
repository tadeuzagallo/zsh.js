/* global describe,it */
'use strict';

var fs = require('../lib/fs.js');
var expect = require('chai').expect;

describe('file-system', function () {
  describe('open', function () {
    it('should list a directory', function () {
      expect(fs.open('/Users')).to.be.equal(fs.root.Users);
    });

    it('should open a file', function () {
      expect(fs.open('/Users/guest/about.md')).to.be.equal(fs.root.Users.guest['about.md']);
    });

    it('should return null for unexistant file', function () {
      expect(fs.open('~/foo.'));
    });
  });

  describe('translatePath', function () {
    it('should translate home', function () {
      expect(fs.translatePath('~')).to.be.equal(fs.home);
      expect(fs.translatePath('~/.')).to.be.equal(fs.home);
      expect(fs.translatePath('~/..')).to.be.equal('/Users');
    });

    it('should translate current path', function () {
      expect(fs.translatePath('.')).to.be.equal(fs.currentPath);
    });

    it('should translate parent path', function () {
      fs.currentPath = '/Users/guest';
      expect(fs.translatePath('..')).to.be.equal('/Users');
    });

    it('should not validate a path', function () {
      expect(fs.translatePath('./foo')).to.be.equal(fs.home + '/foo');
    });

    it('should translate to root', function () {
      expect(fs.translatePath('../..')).to.be.equal('/');
    });

    it('should not go further than root', function () {
      expect(fs.translatePath('../../../../..')).to.be.equal('/');
    });

    it('should trim trailling slashes', function () {
      expect(fs.translatePath('/Users/')).to.be.equal('/Users');
    });
  });

  describe('realpath', function () {
    it('should validate a path', function () {
      expect(fs.realpath('./foo')).to.be.equal(null);
    });

    it('root path should be valid', function () {
      expect(fs.realpath('../..')).to.be.equal('/');
    });
  });

  describe('dirname', function () {
    it('should return path dirname', function () {
      expect(fs.dirname('foo/bar/baz')).to.equal('foo/bar');
    });
  });

  describe('basename', function () {
    it('should return path basename', function () {
      expect(fs.basename('foo/bar/baz')).to.equal('baz');
    });
  });

  describe.only('autocomplete', function () {
    it('should return an empty set for non existing directories', function () {
      expect(fs.autocomplete('foo')).to.deep.equal([]);
    });

    it('should return all dir options for an empty string', function () {
      fs.currentPath = '~';
      expect(fs.autocomplete('')).to.deep.equal(Object.keys(fs.open('~').content));
    });

    it('should append a slash when the path is right', function () {
      fs.currentPath = '/';
      expect(fs.autocomplete('usr')).to.deep.equal(['usr/']);
    });

    it('should work with ~', function () {
      expect(fs.autocomplete('~/pro')).to.deep.equal(['projects.md']);
    });

    it('should work with /', function ()  {
      expect(fs.autocomplete('/usr/b')).to.deep.equal(['bin/']);
    });
  });
});
