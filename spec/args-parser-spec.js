var expect = require('chai').expect;
var ArgsParser = require('../src/js/lib/args-parser.js');

describe('args-parser', function () {
  var arg = 'foo bar baz';

  it('should never return a null value', function () {
    var ret = ArgsParser.parse(null);
    expect(ret).to.be.not.equal(null);
    expect(ret.arguments).to.be.not.equal(null);
    expect(ret.options).to.be.not.equal(null);
    expect(ret.raw).to.be.not.equal(null);
  });

  it('should always return a raw copy', function () {
    expect(ArgsParser.parse(arg).raw).to.be.equal(arg);
  });

  it('should get files', function () {
    expect(ArgsParser.parse(arg).arguments).to.be.deep.equal(['foo', 'bar', 'baz']);
  });

  it('should parse one single dashed options', function () {
    expect(
      ArgsParser.parse('-t').options.t
    ).to.be.equal(true);

  });

  it('should parse multiple single dashed options', function () {
    var ret = ArgsParser.parse('-ab -c');
    expect(ret.options).to.be.deep.equal({
      a: true,
      b: true,
      c: true
    });
  });

  it('should parse single double dashed options', function () {
    expect(ArgsParser.parse('--foo').options.foo).to.be.equal(true);
  });

  it('should parse double dashed option with value', function () {
    expect(ArgsParser.parse('--foo bar').options.foo).to.be.equal('bar');
  });

  it('should accept strings', function () {
    expect(ArgsParser.parse('--foo "bar baz"').options.foo).to.be.equal('bar baz');
  });

  it('should throw on unclosed strings', function () {
    expect(function () {
      ArgsParser.parse('--foo "bar baz');
    }).to.throw();
  });
});
