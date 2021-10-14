import dd from '../../src/dedent';

// type Tag<R> = (strings: TemplateStringsArray, ...substitutions: any[]) => R;

function cooked(strings: TemplateStringsArray, ...substitutions: any[]): string;
function cooked(strings: TemplateStringsArray): string {
  let s = strings[0];
  if (s === undefined) throw new Error('invalid cooked string');
  for (let i = 1; i < strings.length; i++) {
    const string = strings[i];
    if (string === undefined) throw new Error('invalid cooked string');
    s = s + arguments[i] + strings[i];
  }
  return s;
}

describe('actual usage testing', () => {
  it('called as function', () => {
    const actual = dd(`
      testing
      this
      foobar
    `);
    expect(actual).toBe('testing\nthis\nfoobar');
  });

  it('called as tagged template', () => {
    const actual = dd`
      testing
      this
      foobar
    `;
    expect(actual).toBe('testing\nthis\nfoobar');
  });

  describe('called as wrapped tagged template', () => {
    it('trims cooked', () => {
      const wrapped = dd(cooked);
      const actual = wrapped`
        testing
        this
        foobar
      `;
      expect(actual).toBe('testing\nthis\nfoobar');
    });

    it('trims raw', () => {
      const wrapped = dd(String.raw);
      const actual = wrapped`
        testing
        this
        foobar
      `;
      expect(actual).toBe('testing\nthis\nfoobar');
    });

    it('returns same strings instance', () => {
      const wrapped = dd((s) => s);
      function template() {
        return wrapped`
          testing
        `;
      }
      function other() {
        return wrapped`
          testing
        `;
      }

      expect(template()).toBe(template());
      expect(template()).not.toBe(other());
    });
  });
});
