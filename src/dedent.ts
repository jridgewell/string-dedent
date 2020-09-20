type Tag<A extends unknown[], R, T> = (
  this: T,
  strings: TemplateStringsArray,
  ...substitutions: A
) => R;

const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
const newline = /(\n|\r\n?|\u2028|\u2029)/g;
const leadingWhitespace = /^\s*/;

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
    return function (
      this: T,
      strings: TemplateStringsArray,
      ...substitutions: A
    ): R {
      // tslint:disable-next-line no-unsafe-any no-any
      return (arg as any).call(
        this,
        processTemplateStringsArray(strings),
        ...substitutions,
      );
    };
  }

  const strings = processTemplateStringsArray(arg);
  let s = getCooked(strings, 0);
  for (let i = 1; i < strings.length; i++) {
    s += arguments[i] + getCooked(strings, i);
  }
  return s;
}

function getCooked(
  strings: readonly (string | undefined)[],
  index: number,
): string {
  const str = strings[index];
  if (str === undefined) {
    throw new TypeError(`invalid cooked string at index ${index}`);
  }
  return str;
}

function processTemplateStringsArray(
  strings: TemplateStringsArray,
): TemplateStringsArray {
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
function process(
  strings: readonly (string | undefined)[],
): readonly (string | undefined)[] {
  const splits = strings.map((quasi) => quasi?.split(newline));

  let common;
  for (let i = 0; i < splits.length; i++) {
    const lines = splits[i];
    if (lines === undefined) continue;

    // If we're at the first template quasi, then the 0 index starts the line.
    // If not, then the 0 index is on the same line after the expression.
    const start = i === 0 ? 0 : 2;

    // Every odd index is the newline char, so we'll skip and only process evens
    for (let j = start; j < lines.length; j += 2) {
      const line = lines[j];
      const leading = leadingWhitespace.exec(line)!;
      const matched = leading[0];

      const lastSplitLine = j + 1 === lines.length;
      const lastSplit = i + 1 === splits.length;
      if (
        matched.length === line.length &&
        // We trim the very first line (provided it doesn't include an expression),
        // and the very last line (provided it's on a new line following any expression).
        (j === 0 ? !lastSplitLine : lastSplitLine && lastSplit)
      ) {
        lines[j] = '';
        lines[j + (j === 0 ? 1 : -1)] = '';
      } else if (line.length > 0 || (lastSplitLine && !lastSplit)) {
        // A line counts torwards the common whitespace if it's non-empty,
        // or if it's directly before an expression.
        common = commonStart(matched, common);
      }
    }
  }

  const min = common ? common.length : 0;
  return splits.map((lines, i) => {
    if (lines === undefined) return lines;

    let quasi = lines[0];
    // Only the first split's first line is actually the start of a line.
    // Every other split's first line continues the same line as the expression.
    if (i === 0) quasi = quasi.slice(min);

    for (let i = 1; i < lines.length; i += 2) {
      quasi += lines[i] + lines[i + 1].slice(min);
    }
    return quasi;
  });
}

function commonStart(a: string, b: string | undefined): string {
  if (b === undefined || a === b) return a;
  const length = Math.min(a.length, b.length);
  let i = 0;
  for (; i < length; i++) {
    if (a[i] !== b[i]) break;
  }
  return a.slice(0, i);
}

export default dedent;
