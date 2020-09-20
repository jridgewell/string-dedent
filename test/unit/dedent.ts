import dd from '../../src/dedent';

type Tag<R> = (strings: TemplateStringsArray, ...substitutions: any[]) => R;

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

function identity(strings: TemplateStringsArray): TemplateStringsArray {
  return strings;
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

  it('called as wrapeed tagged template', () => {
    const wrapped = dd(cooked);
    const actual = wrapped`
      testing
      this
      foobar
    `;
    expect(actual).toBe('testing\nthis\nfoobar');
  });
});

describe('edge cases', () => {
  it('all empty', () => {
    const actual = dd``;
    expect(actual).toBe('');
  });

  it('all whitespace', () => {
    const actual = dd`    `;
    expect(actual).toBe('');
  });

  it('all newline', () => {
    const actual = dd`\n\n\n\n\n`;
    expect(actual).toBe('\n\n\n');
  });
});

it.each([
  // No line breaks
  [`test`, 'test'],
  [`    test`, 'test'],
  [`test   `, 'test   '],
  [`    test   `, 'test   '],
  // Leading/Trailing empty lines
  [`    \ntest`, 'test'],
  [`test\n   `, 'test'],
  [`    \ntest\n   `, 'test'],
  // Multiple leading/trailing empty lines
  [`    \n\ntest`, '\ntest'],
  [`    \n    \ntest`, '    \ntest'],
  [`test\n\n   `, 'test\n'],
  [`test\n   \n   `, 'test\n   '],
  // Trims minimal leading whitespace
  [`test\ntest`, 'test\ntest'],
  [`test\n test`, 'test\n test'],
  [`test\n  test`, 'test\n  test'],
  [` test\ntest`, ' test\ntest'],
  [` test\n test`, 'test\ntest'],
  [` test\n  test`, 'test\n test'],
  [`  test\ntest`, '  test\ntest'],
  [`  test\n test`, ' test\ntest'],
  [`  test\n  test`, 'test\ntest'],
  [`\n  test\n  test`, 'test\ntest'],
  [`  test\n  test\n`, 'test\ntest'],
  [`\n  test\n  test\n`, 'test\ntest'],
  // Minimal whitespace ignores empty lines
  [`test\n\ntest`, 'test\n\ntest'],
  [`test\n\n  test`, 'test\n\n  test'],
  [` test\n\ntest`, ' test\n\ntest'],
  [` test\n\n  test`, 'test\n\n test'],
  [`  test\n\ntest`, '  test\n\ntest'],
  [`  test\n\n  test`, 'test\n\ntest'],
  [`test\n  \ntest`, 'test\n  \ntest'],
  [`test\n  \n  test`, 'test\n  \n  test'],
  [` test\n  \ntest`, ' test\n  \ntest'],
  [` test\n  \n  test`, 'test\n \n test'],
  [`  test\n  \ntest`, '  test\n  \ntest'],
  [`  test\n  \n  test`, 'test\n\ntest'],
  // Trailing whitespace on line
  [`test   \ntest`, 'test   \ntest'],
  [`test\ntest   `, 'test\ntest   '],
  [`test   \ntest   `, 'test   \ntest   '],
  // Different leading whitespace chars
  ['  spaces\n \tspace tab', ' spaces\n\tspace tab'],
  ['     spaces\n \tspace tab', '    spaces\n\tspace tab'],
  ['  spaces\n\t\tspace tab', '  spaces\n\t\tspace tab'],
])(
  'called as function ({ index: %#, input: ```%s```, expected: ```%s``` })',
  (input: string, expected: string) => {
    expect(dd(input)).toBe(expected);
  },
);

describe('called as tagged template', () => {
  it('throws for invalid cooked strings', () => {
    expect(() => {
      // Eval is necessary to sidestep typescript's parser.
      eval('(dd) => dd`\\un`')(dd);
    }).toThrow('invalid cooked string');
  });

  it.each([
    // No substitutions
    // No line breaks
    [() => dd`test`, 'test'],
    [() => dd`    test`, 'test'],
    [() => dd`test   `, 'test   '],
    [() => dd`    test   `, 'test   '],
    // Leading/Trailing empty lines
    [() => dd`    \ntest`, 'test'],
    [() => dd`test\n   `, 'test'],
    [() => dd`    \ntest\n   `, 'test'],
    // Multiple leading/trailing empty lines
    [() => dd`    \n\ntest`, '\ntest'],
    [() => dd`    \n   \ntest`, '   \ntest'],
    [() => dd`test\n\n   `, 'test\n'],
    [() => dd`test\n   \n   `, 'test\n   '],
    // Trims minimal leading whitespace
    [() => dd`test\ntest`, 'test\ntest'],
    [() => dd`test\n test`, 'test\n test'],
    [() => dd`test\n  test`, 'test\n  test'],
    [() => dd` test\ntest`, ' test\ntest'],
    [() => dd` test\n test`, 'test\ntest'],
    [() => dd` test\n  test`, 'test\n test'],
    [() => dd`  test\ntest`, '  test\ntest'],
    [() => dd`  test\n test`, ' test\ntest'],
    [() => dd`  test\n  test`, 'test\ntest'],
    // Minimal whitespace ignores empty lines
    [() => dd`test\n\ntest`, 'test\n\ntest'],
    [() => dd`test\n\n  test`, 'test\n\n  test'],
    [() => dd` test\n\ntest`, ' test\n\ntest'],
    [() => dd` test\n\n  test`, 'test\n\n test'],
    [() => dd`  test\n\ntest`, '  test\n\ntest'],
    [() => dd`  test\n\n  test`, 'test\n\ntest'],
    [() => dd`test\n  \ntest`, 'test\n  \ntest'],
    [() => dd`test\n  \n  test`, 'test\n  \n  test'],
    [() => dd` test\n  \ntest`, ' test\n  \ntest'],
    [() => dd` test\n  \n  test`, 'test\n \n test'],
    [() => dd`  test\n  \ntest`, '  test\n  \ntest'],
    [() => dd`  test\n  \n  test`, 'test\n\ntest'],
    // Trailing whitespace on line
    [() => dd`test   \ntest`, 'test   \ntest'],
    [() => dd`test\ntest   `, 'test\ntest   '],
    [() => dd`test   \ntest   `, 'test   \ntest   '],

    // With substitutions
    // No line breaks
    [() => dd`${0}test`, '0test'],
    [() => dd`${0} test`, '0 test'],
    [() => dd`${0}  test`, '0  test'],
    [() => dd` ${0}test`, '0test'],
    [() => dd` ${0} test`, '0 test'],
    [() => dd` ${0}  test`, '0  test'],
    [() => dd`  ${0}test`, '0test'],
    [() => dd`  ${0} test`, '0 test'],
    [() => dd`  ${0}  test`, '0  test'],
    [() => dd`test${0}  `, 'test0  '],
    [() => dd`test ${0}  `, 'test 0  '],
    [() => dd`test  ${0}  `, 'test  0  '],
    // Leading/Trailing empty lines
    [() => dd`   \n${0}test`, '0test'],
    [() => dd`test${0}\n   `, 'test0'],
    [() => dd`    \n${0}test${0}\n   `, '0test0'],
    // Multiple leading/trailing empty lines
    [() => dd`    \n\n${0}test`, '\n0test'],
    [() => dd`    \n   \n${0}test`, '   \n0test'],
    [() => dd`test${0}\n\n   `, 'test0\n'],
    [() => dd`test${0}\n   \n   `, 'test0\n   '],
    // Expression on otherwise empty leading/trailing line
    [() => dd`${0}\n test`, '0\n test'],
    [() => dd` ${0}\n test`, '0\ntest'],
    [() => dd`  ${0}\n test`, ' 0\ntest'],
    [() => dd` test\n${0}`, ' test\n0'],
    [() => dd` test\n ${0}`, 'test\n0'],
    [() => dd` test\n  ${0}`, 'test\n 0'],
    // Expression on otherwise empty line affects minimal whitespace
    [() => dd`test\n${0}\ntest`, 'test\n0\ntest'],
    [() => dd`test\n${0}\n  test`, 'test\n0\n  test'],
    [() => dd` test\n${0}\ntest`, ' test\n0\ntest'],
    [() => dd` test\n${0}\n  test`, ' test\n0\n  test'],
    [() => dd`  test\n${0}\ntest`, '  test\n0\ntest'],
    [() => dd`  test\n${0}\n  test`, '  test\n0\n  test'],
    [() => dd`test\n ${0} \ntest`, 'test\n 0 \ntest'],
    [() => dd`test\n ${0} \n  test`, 'test\n 0 \n  test'],
    [() => dd` test\n ${0} \ntest`, ' test\n 0 \ntest'],
    [() => dd` test\n ${0} \n  test`, 'test\n0 \n test'],
    [() => dd`  test\n ${0} \ntest`, '  test\n 0 \ntest'],
    [() => dd`  test\n ${0} \n  test`, ' test\n0 \n test'],
    // Expression is not interpolated as part of whitespace
    [() => dd`${'   '}`, '   '],
    [() => dd`\n${'   '}`, '   '],
    [() => dd`${'   '}\n`, '   '],
    [() => dd`  test\n${'   '}`, '  test\n   '],
    [() => dd`  test\n ${'   '}`, ' test\n   '],
  ])(
    '({ index: %#, input: ```%s``` expected: ```%s``` })',
    (input: () => string, expected: string) => {
      expect(input()).toBe(expected);
    },
  );
});

describe('wraps tagged template (cooked)', () => {
  const wrapped = dd(cooked);

  it('passes cooked and raw stings to wrapped tag', () => {
    // Eval is necessary to sidestep typescript's parser.
    const actual = eval('(dd) => dd`\\un${0}123`')(identity);
    expect(actual).toEqual([undefined, '123']);
    expect(actual.raw).toEqual(['\\un', '123']);
  });

  it('caches template strings array', () => {
    const wrapped = dd(identity);
    const fn = (): TemplateStringsArray => wrapped`test`;
    expect(fn()).toBe(fn());
  });

  it('always creates distinct template strings array from input', () => {
    const fn = (wrapped: Tag<TemplateStringsArray>): TemplateStringsArray =>
      wrapped`test`;
    expect(fn(dd(identity))).not.toBe(fn(identity));
  });

  it('calls wrapped tag with this context', () => {
    const o = {
      dd: dd(function (this: unknown) {
        return this;
      }),
    };
    expect(o.dd`test`).toBe(o);
  });

  it('preserves call signature of wrapped tag', () => {
    const tag = (
      strings: TemplateStringsArray,
      a: number,
      b: string,
    ): string => {
      return a + b;
    };
    const wrapped = dd(tag);
    const strings = ((s: TemplateStringsArray, ...args: unknown[]) => s)`
      abc${0}def${'ghi'}jkl
    `;

    // Correct call signature
    wrapped(strings, 1, 'test');

    // @ts-expect-error
    wrapped(strings, 'test', 'test');
    // @ts-expect-error
    wrapped(strings, 1, 1);
    // @ts-expect-error
    wrapped(strings, 1, 'test', null);
    // @ts-expect-error
    const x: number = wrapped(strings, 1, 'test');
    ((x: number) => {})(x); // use x

    const contextWrapped = dd(function (
      this: {},
      strings: TemplateStringsArray,
    ): void {});
    // @ts-expect-error
    contextWrapped(strings);
  });

  it.each([
    // No substitutions
    // No line breaks
    [() => wrapped`test`, 'test'],
    [() => wrapped`    test`, 'test'],
    [() => wrapped`test   `, 'test   '],
    [() => wrapped`    test   `, 'test   '],
    // Leading/Trailing empty lines
    [() => wrapped`    \ntest`, 'test'],
    [() => wrapped`test\n   `, 'test'],
    [() => wrapped`    \ntest\n   `, 'test'],
    // Multiple leading/trailing empty lines
    [() => wrapped`    \n\ntest`, '\ntest'],
    [() => wrapped`    \n   \ntest`, '   \ntest'],
    [() => wrapped`test\n\n   `, 'test\n'],
    [() => wrapped`test\n   \n   `, 'test\n   '],
    // Trims minimal leading whitespace
    [() => wrapped`test\ntest`, 'test\ntest'],
    [() => wrapped`test\n test`, 'test\n test'],
    [() => wrapped`test\n  test`, 'test\n  test'],
    [() => wrapped` test\ntest`, ' test\ntest'],
    [() => wrapped` test\n test`, 'test\ntest'],
    [() => wrapped` test\n  test`, 'test\n test'],
    [() => wrapped`  test\ntest`, '  test\ntest'],
    [() => wrapped`  test\n test`, ' test\ntest'],
    [() => wrapped`  test\n  test`, 'test\ntest'],
    // Minimal whitespace ignores empty lines
    [() => wrapped`test\n\ntest`, 'test\n\ntest'],
    [() => wrapped`test\n\n  test`, 'test\n\n  test'],
    [() => wrapped` test\n\ntest`, ' test\n\ntest'],
    [() => wrapped` test\n\n  test`, 'test\n\n test'],
    [() => wrapped`  test\n\ntest`, '  test\n\ntest'],
    [() => wrapped`  test\n\n  test`, 'test\n\ntest'],
    [() => wrapped`test\n  \ntest`, 'test\n  \ntest'],
    [() => wrapped`test\n  \n  test`, 'test\n  \n  test'],
    [() => wrapped` test\n  \ntest`, ' test\n  \ntest'],
    [() => wrapped` test\n  \n  test`, 'test\n \n test'],
    [() => wrapped`  test\n  \ntest`, '  test\n  \ntest'],
    [() => wrapped`  test\n  \n  test`, 'test\n\ntest'],
    // Trailing whitespace on line
    [() => wrapped`test   \ntest`, 'test   \ntest'],
    [() => wrapped`test\ntest   `, 'test\ntest   '],
    [() => wrapped`test   \ntest   `, 'test   \ntest   '],

    // With substitutions
    // No line breaks
    [() => wrapped`${0}test`, '0test'],
    [() => wrapped`${0} test`, '0 test'],
    [() => wrapped`${0}  test`, '0  test'],
    [() => wrapped` ${0}test`, '0test'],
    [() => wrapped` ${0} test`, '0 test'],
    [() => wrapped` ${0}  test`, '0  test'],
    [() => wrapped`  ${0}test`, '0test'],
    [() => wrapped`  ${0} test`, '0 test'],
    [() => wrapped`  ${0}  test`, '0  test'],
    [() => wrapped`test${0}  `, 'test0  '],
    [() => wrapped`test ${0}  `, 'test 0  '],
    [() => wrapped`test  ${0}  `, 'test  0  '],
    // Leading/Trailing empty lines
    [() => wrapped`   \n${0}test`, '0test'],
    [() => wrapped`test${0}\n   `, 'test0'],
    [() => wrapped`    \n${0}test${0}\n   `, '0test0'],
    // Multiple leading/trailing empty lines
    [() => wrapped`    \n\n${0}test`, '\n0test'],
    [() => wrapped`    \n   \n${0}test`, '   \n0test'],
    [() => wrapped`test${0}\n\n   `, 'test0\n'],
    [() => wrapped`test${0}\n   \n   `, 'test0\n   '],
    // Expression on otherwise empty leading/trailing line
    [() => wrapped`${0}\n test`, '0\n test'],
    [() => wrapped` ${0}\n test`, '0\ntest'],
    [() => wrapped`  ${0}\n test`, ' 0\ntest'],
    [() => wrapped` test\n${0}`, ' test\n0'],
    [() => wrapped` test\n ${0}`, 'test\n0'],
    [() => wrapped` test\n  ${0}`, 'test\n 0'],
    // Expression on otherwise empty line affects minimal whitespace
    [() => wrapped`test\n${0}\ntest`, 'test\n0\ntest'],
    [() => wrapped`test\n${0}\n  test`, 'test\n0\n  test'],
    [() => wrapped` test\n${0}\ntest`, ' test\n0\ntest'],
    [() => wrapped` test\n${0}\n  test`, ' test\n0\n  test'],
    [() => wrapped`  test\n${0}\ntest`, '  test\n0\ntest'],
    [() => wrapped`  test\n${0}\n  test`, '  test\n0\n  test'],
    [() => wrapped`test\n ${0} \ntest`, 'test\n 0 \ntest'],
    [() => wrapped`test\n ${0} \n  test`, 'test\n 0 \n  test'],
    [() => wrapped` test\n ${0} \ntest`, ' test\n 0 \ntest'],
    [() => wrapped` test\n ${0} \n  test`, 'test\n0 \n test'],
    [() => wrapped`  test\n ${0} \ntest`, '  test\n 0 \ntest'],
    [() => wrapped`  test\n ${0} \n  test`, ' test\n0 \n test'],
    // Expression is not interpolated as part of whitespace
    [() => wrapped`${'   '}`, '   '],
    [() => wrapped`\n${'   '}`, '   '],
    [() => wrapped`${'   '}\n`, '   '],
    [() => wrapped`  test\n${'   '}`, '  test\n   '],
    [() => wrapped`  test\n ${'   '}`, ' test\n   '],
  ])(
    'called as tagged template ({ index: %#, input: ```%s``` expected: ```%s``` })',
    (input: () => string, expected: string) => {
      expect(input()).toBe(expected);
    },
  );
});

describe('wraps tagged template (raw)', () => {
  const wrapped = dd(String.raw);

  // Evaling is necessary to sidestep the raw escaping done by `\n` in a tagged
  // template. Eval allows us to pretend we'd written a literal linebreak there,
  // whithout making the code even uglier with new lines.
  it.each([
    // No substitutions
    // No line breaks
    [eval('(wrapped) => wrapped`test`'), 'test'],
    [eval('(wrapped) => wrapped`    test`'), 'test'],
    [eval('(wrapped) => wrapped`test   `'), 'test   '],
    [eval('(wrapped) => wrapped`    test   `'), 'test   '],
    // Leading/Trailing empty lines
    [eval('(wrapped) => wrapped`    \ntest`'), 'test'],
    [eval('(wrapped) => wrapped`test\n   `'), 'test'],
    [eval('(wrapped) => wrapped`    \ntest\n   `'), 'test'],
    // Multiple leading/trailing empty lines
    [eval('(wrapped) => wrapped`    \n\ntest`'), '\ntest'],
    [eval('(wrapped) => wrapped`    \n   \ntest`'), '   \ntest'],
    [eval('(wrapped) => wrapped`test\n\n   `'), 'test\n'],
    [eval('(wrapped) => wrapped`test\n   \n   `'), 'test\n   '],
    // Trims minimal leading whitespace
    [eval('(wrapped) => wrapped`test\ntest`'), 'test\ntest'],
    [eval('(wrapped) => wrapped`test\n test`'), 'test\n test'],
    [eval('(wrapped) => wrapped`test\n  test`'), 'test\n  test'],
    [eval('(wrapped) => wrapped` test\ntest`'), ' test\ntest'],
    [eval('(wrapped) => wrapped` test\n test`'), 'test\ntest'],
    [eval('(wrapped) => wrapped` test\n  test`'), 'test\n test'],
    [eval('(wrapped) => wrapped`  test\ntest`'), '  test\ntest'],
    [eval('(wrapped) => wrapped`  test\n test`'), ' test\ntest'],
    [eval('(wrapped) => wrapped`  test\n  test`'), 'test\ntest'],
    // Minimal whitespace ignores empty lines
    [eval('(wrapped) => wrapped`test\n\ntest`'), 'test\n\ntest'],
    [eval('(wrapped) => wrapped`test\n\n  test`'), 'test\n\n  test'],
    [eval('(wrapped) => wrapped` test\n\ntest`'), ' test\n\ntest'],
    [eval('(wrapped) => wrapped` test\n\n  test`'), 'test\n\n test'],
    [eval('(wrapped) => wrapped`  test\n\ntest`'), '  test\n\ntest'],
    [eval('(wrapped) => wrapped`  test\n\n  test`'), 'test\n\ntest'],
    [eval('(wrapped) => wrapped`test\n  \ntest`'), 'test\n  \ntest'],
    [eval('(wrapped) => wrapped`test\n  \n  test`'), 'test\n  \n  test'],
    [eval('(wrapped) => wrapped` test\n  \ntest`'), ' test\n  \ntest'],
    [eval('(wrapped) => wrapped` test\n  \n  test`'), 'test\n \n test'],
    [eval('(wrapped) => wrapped`  test\n  \ntest`'), '  test\n  \ntest'],
    [eval('(wrapped) => wrapped`  test\n  \n  test`'), 'test\n\ntest'],
    // Trailing whitespace on line
    [eval('(wrapped) => wrapped`test   \ntest`'), 'test   \ntest'],
    [eval('(wrapped) => wrapped`test\ntest   `'), 'test\ntest   '],
    [eval('(wrapped) => wrapped`test   \ntest   `'), 'test   \ntest   '],

    // With substitutions
    // No line breaks
    [eval('(wrapped) => wrapped`${0}test`'), '0test'],
    [eval('(wrapped) => wrapped`${0} test`'), '0 test'],
    [eval('(wrapped) => wrapped`${0}  test`'), '0  test'],
    [eval('(wrapped) => wrapped` ${0}test`'), '0test'],
    [eval('(wrapped) => wrapped` ${0} test`'), '0 test'],
    [eval('(wrapped) => wrapped` ${0}  test`'), '0  test'],
    [eval('(wrapped) => wrapped`  ${0}test`'), '0test'],
    [eval('(wrapped) => wrapped`  ${0} test`'), '0 test'],
    [eval('(wrapped) => wrapped`  ${0}  test`'), '0  test'],
    [eval('(wrapped) => wrapped`test${0}  `'), 'test0  '],
    [eval('(wrapped) => wrapped`test ${0}  `'), 'test 0  '],
    [eval('(wrapped) => wrapped`test  ${0}  `'), 'test  0  '],
    // Leading/Trailing empty lines
    [eval('(wrapped) => wrapped`   \n${0}test`'), '0test'],
    [eval('(wrapped) => wrapped`test${0}\n   `'), 'test0'],
    [eval('(wrapped) => wrapped`    \n${0}test${0}\n   `'), '0test0'],
    // Multiple leading/trailing empty lines
    [eval('(wrapped) => wrapped`    \n\n${0}test`'), '\n0test'],
    [eval('(wrapped) => wrapped`    \n   \n${0}test`'), '   \n0test'],
    [eval('(wrapped) => wrapped`test${0}\n\n   `'), 'test0\n'],
    [eval('(wrapped) => wrapped`test${0}\n   \n   `'), 'test0\n   '],
    // Expression on otherwise empty leading/trailing line
    [eval('(wrapped) => wrapped`${0}\n test`'), '0\n test'],
    [eval('(wrapped) => wrapped` ${0}\n test`'), '0\ntest'],
    [eval('(wrapped) => wrapped`  ${0}\n test`'), ' 0\ntest'],
    [eval('(wrapped) => wrapped` test\n${0}`'), ' test\n0'],
    [eval('(wrapped) => wrapped` test\n ${0}`'), 'test\n0'],
    [eval('(wrapped) => wrapped` test\n  ${0}`'), 'test\n 0'],
    // Expression on otherwise empty line affects minimal whitespace
    [eval('(wrapped) => wrapped`test\n${0}\ntest`'), 'test\n0\ntest'],
    [eval('(wrapped) => wrapped`test\n${0}\n  test`'), 'test\n0\n  test'],
    [eval('(wrapped) => wrapped` test\n${0}\ntest`'), ' test\n0\ntest'],
    [eval('(wrapped) => wrapped` test\n${0}\n  test`'), ' test\n0\n  test'],
    [eval('(wrapped) => wrapped`  test\n${0}\ntest`'), '  test\n0\ntest'],
    [eval('(wrapped) => wrapped`  test\n${0}\n  test`'), '  test\n0\n  test'],
    [eval('(wrapped) => wrapped`test\n ${0} \ntest`'), 'test\n 0 \ntest'],
    [eval('(wrapped) => wrapped`test\n ${0} \n  test`'), 'test\n 0 \n  test'],
    [eval('(wrapped) => wrapped` test\n ${0} \ntest`'), ' test\n 0 \ntest'],
    [eval('(wrapped) => wrapped` test\n ${0} \n  test`'), 'test\n0 \n test'],
    [eval('(wrapped) => wrapped`  test\n ${0} \ntest`'), '  test\n 0 \ntest'],
    [eval('(wrapped) => wrapped`  test\n ${0} \n  test`'), ' test\n0 \n test'],
    // Expression is not interpolated as part of whitespace
    [eval('(wrapped) => wrapped`${"   "}`'), '   '],
    [eval('(wrapped) => wrapped`\n${"   "}`'), '   '],
    [eval('(wrapped) => wrapped`${"   "}\n`'), '   '],
    [eval('(wrapped) => wrapped`  test\n${"   "}`'), '  test\n   '],
    [eval('(wrapped) => wrapped`  test\n ${"   "}`'), ' test\n   '],
  ])(
    '({ index: %#, input: ```%s``` expected: ```%s``` })',
    (input: (wrapped: Tag<string>) => string, expected: string) => {
      expect(input(wrapped)).toBe(expected);
    },
  );

  const fn = (strings: TemplateStringsArray, x: number, y: string): string => {
    return x + y;
  };
  const w = dd(fn);
  w`x: ${1}, y: ${'y'}`;

  it.each([
    [() => wrapped`   \n   test`, '\\n   test'],
    [() => wrapped`   test\n   test`, 'test\\n   test'],
    [() => wrapped`   test\n`, 'test\\n'],
    [() => wrapped`   test\n   `, 'test\\n   '],
  ])(
    'does not interpret escaped linebreaks as newlines',
    (input: () => string, expected: string) => {
      expect(input()).toBe(expected);
    },
  );
});
