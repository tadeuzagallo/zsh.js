var fs = require('../src/js/lib/fs.js');

describe('file-system', function () {
  describe('open', function () {
    it('should list a directory', function () {
      expect(fs.open('/Users')).toEqual(fs.root.Users);
    });

    it('should open a file', function () {
      expect(fs.open('/Users/guest/about.md')).toEqual(fs.root.Users.guest['about.md']);
    });
  });
  describe('realpath', function () {
    it('should translate current path', function () {
      expect(fs.realpath('.')).toEqual(fs.currentPath);
    });

    it('should translate parent path', function () {
      fs.currentPath = '/Users/guest';
      expect(fs.realpath('..')).toEqual('/Users');
    });

    it('should validate a path', function () {
      expect(fs.realpath('./foo')).toBeNull();
    });
  });
});
