var ArgsParser = require('../src/js/lib/args-parser.js');

describe('args-parser', function () {
  var arg = 'foo bar baz';

  it('should never return a null value', function () {
    var ret = ArgsParser.parse(null);
    expect(ret).not.toBeNull();
    expect(ret.arguments).not.toBeNull();
    expect(ret.options).not.toBeNull();
    expect(ret.raw).not.toBeNull();
  });

  it('should always return a raw copy', function () {
    expect(ArgsParser.parse(arg).raw).toEqual(arg);
  });

  it('should get files', function () {
    expect(
      ArgsParser.parse(arg).arguments
    ).toEqual(['foo', 'bar', 'baz']);
  });

  it('should parse one single dashed options', function () {
    expect(
      ArgsParser.parse('-t').options.t
    ).toBe(true);

  });

  it('should parse multiple single dashed options', function () {
    var ret = ArgsParser.parse('-ab -c');
    expect(ret.options).toEqual({
      a: true,
      b: true,
      c: true
    });
  });

  it('should parse single double dashed options', function () {
    expect(ArgsParser.parse('--foo').options.foo).toBe(true);
  });

  it('should parse double dashed option with value', function () {
    expect(ArgsParser.parse('--foo bar').options.foo).toBe('bar');
  });

  it('should accept strings', function () {
    expect(ArgsParser.parse('--foo "bar baz"').options.foo).toBe('bar baz');
  });

  it('should throw on unclosed strings', function () {
    expect(ArgsParser.parse('--foo "bar baz')).toThrow();
  });
});
