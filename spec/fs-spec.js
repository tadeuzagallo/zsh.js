var fs = require('../src/js/lib/fs.js');
require('jasmine-only');

describe('file-system', function () {
  describe('open', function () {
    it('should list a directory', function () {
      expect(fs.open('/Users')).toEqual(fs.root.Users);
    });

    it('should open a file', function () {
      expect(fs.open('/Users/guest/about.md')).toEqual(fs.root.Users.guest['about.md']);
    });

    it('should return null for unexistant file', function () {
      expect(fs.open('~/foo.'));
    });
  });

  describe('translatePath', function () {
    it('should translate home', function () {
      expect(fs.translatePath('~')).toEqual(fs.home);
      expect(fs.translatePath('~/.')).toEqual(fs.home);
      expect(fs.translatePath('~/..')).toEqual('/Users');
    });

    it('should translate current path', function () {
      expect(fs.translatePath('.')).toEqual(fs.currentPath);
    });

    it('should translate parent path', function () {
      fs.currentPath = '/Users/guest';
      expect(fs.translatePath('..')).toEqual('/Users');
    });

    it('should not validate a path', function () {
      expect(fs.translatePath('./foo')).toEqual(fs.home + '/foo');
    });
    
    it('should translate to root', function () {
      expect(fs.translatePath('../..')).toEqual('/');
    });

    it('should not go further than root', function () {
      expect(fs.translatePath('../../../../..')).toEqual('/');
    });
  });

  describe('realpath', function () {
    it('should validate a path', function () {
      expect(fs.realpath('./foo')).toBeNull();
    });

    it('root path should be valid', function () {
      expect(fs.realpath('../..')).toEqual('/');
    });
  });
});
