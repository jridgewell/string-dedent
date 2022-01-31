type Tag<A extends unknown[], R, T> = (
  this: T,
  strings: TemplateStringsArray,
  ...substitutions: A
) => R;

const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
const newline = /(\n|\r\n?|\u2028|\u2029)/g;
const leadingWhitespace = /^\s*/;
const nonWhitespace = /\S/;
const slice = Array.prototype.slice;

function dedent(str: string): string;
function dedent(str: TemplateStringsArray, ...substitutions: unknown[]): string;
function dedent<A extends unknown[], R, T>(tag: Tag<A, R, T>): Tag<A, R, T>;
function dedent<A extends unknown[], R, T>(
  arg: string | TemplateStringsArray | Tag<A, R, T>,
): string | Tag<A, R, T> {
  if (typeof arg === 'string') {
    return process([arg])[0];
  }

  if (typeof arg === 'function') {
    return function () {
      const args = slice.call(arguments);
      args[0] = processTemplateStringsArray(args[0]);
      return (arg as any).apply(this, args);
    } as Tag<A, R, T>;
  }

  const strings = processTemplateStringsArray(arg);
  // TODO: This is just `String.cooked`: https://tc39.es/proposal-string-cooked/
  let s = getCooked(strings, 0);
  for (let i = 1; i < strings.length; i++) {
    s += arguments[i] + getCooked(strings, i);
  }
  return s;
}

function getCooked(strings: readonly (string | undefined)[], index: number): string {
  const str = strings[index];
  if (str === undefined) throw new TypeError(`invalid cooked string at index ${index}`);
  return str;
}

function processTemplateStringsArray(strings: TemplateStringsArray): TemplateStringsArray {
  const cached = cache.get(strings);
  if (cached) return cached;

  const dedented = process(strings) as TemplateStringsArray;
  cache.set(strings, dedented);

  Object.defineProperty(dedented, 'raw', {
    value: Object.freeze(process(strings.raw)),
  });
  Object.freeze(dedented);

  return dedented;
}

function process(strings: readonly string[]): readonly string[];
function process(strings: readonly (string | undefined)[]): readonly (string | undefined)[] {
  const splitQuasis = strings.map((quasi) => quasi?.split(newline));

  let common;
  for (let i = 0; i < splitQuasis.length; i++) {
    const lines = splitQuasis[i];
    if (lines === undefined) continue;

    // The first split is the static text starting at the opening line until the first template
    // expression (or the end of the template if there are no expressions).
    const firstSplit = i === 0;

    // The last split is all the static text after the final template expression until the closing
    // line. If there are no template expressions, then the first split is also the last split.
    const lastSplit = i + 1 === splitQuasis.length;

    // The opening line must be empty (it's very likely it is) and it must not contain a template
    // expression. The opening line and its trailing newline chare are removed.
    if (firstSplit) {
      // Length > 1 ensures there is a newline, and there is not template expression.
      if (lines.length === 1 || lines[0].length > 0) {
        throw new Error('invalid content on opening line');
      }
      // Clear the captured newline char.
      lines[1] = '';
    }

    // The closing line may only contain whitespace and must not contain a template expression. The
    // closing line and its preceding newline are removed.
    if (lastSplit) {
      // Length > 1 ensures there is a newline, and there is not template expression.
      if (lines.length === 1 || nonWhitespace.test(lines[lines.length - 1])) {
        throw new Error('invalid content on closing line');
      }
      // Clear the captured newline char, and the whitespace on the closing line.
      lines[lines.length - 2] = '';
      lines[lines.length - 1] = '';
    }

    // In the first spit, the index 0 is the opening line (which must be empty by now), and in all
    // other splitQuasis, its the content trailing the template expression (and so can't be part of
    // leading whitespace).
    // Every odd index is the captured newline char, so we'll skip and only process evens.
    for (let j = 2; j < lines.length; j += 2) {
      const line = lines[j];

      // If we are on the last line of this split, and we are not processing the last split (which
      // is after all template expressions), then this line contains a template expression.
      const lineContainsTemplateExpression = j + 1 === lines.length && !lastSplit;

      const leading = leadingWhitespace.exec(line)!;

      // Empty lines do not affect the common indentation, and whitespace only lines are emptied
      // (and also don't affect the comon indentation).
      if (!lineContainsTemplateExpression && leading[0].length === line.length) {
        lines[j] = '';
        continue;
      }

      common = commonStart(leading[0], common);
    }
  }

  const min = common ? common.length : 0;
  return splitQuasis.map((lines) => {
    if (lines === undefined) return lines;

    let quasi = lines[0];
    for (let i = 1; i < lines.length; i += 2) {
      quasi += lines[i] + lines[i + 1].slice(min);
    }
    return quasi;
  });
}

function commonStart(a: string, b: string | undefined): string {
  if (b === undefined || a === b) return a;
  let i = 0;
  for (const len = Math.min(a.length, b.length); i < len; i++) {
    if (a[i] !== b[i]) break;
  }
  return a.slice(0, i);
}

export default dedent;
