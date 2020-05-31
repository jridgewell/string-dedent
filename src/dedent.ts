type Tag<A extends any[], R, T> = (
  this: T,
  strings: TemplateStringsArray,
  ...substitutions: A
) => R;

const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
const newline = /(\n|\r\n?|\u2028|\u2029)/g;
const leadingWhitespace = /^\s*/;

function dedent(str: string): string;
function dedent(str: TemplateStringsArray, ...substitutions: unknown[]): string;
function dedent<A extends any[], R, T>(tag: Tag<A, R, T>): Tag<A, R, T>;
function dedent<A extends any[], R, T>(
  arg: string | TemplateStringsArray | Tag<A, R, T>,
): string | Tag<A, R, T> {
  if (typeof arg === 'string') {
    return process([arg])[0];
  }

  if (typeof arg === 'function') {
    return function (
      this: T,
      strings: TemplateStringsArray,
      ...substitutions: any[]
    ): R {
      // tslint:disable-next-line no-unsafe-any
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
    s = s + arguments[i] + getCooked(strings, i);
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
  const splits = strings.slice().map((quasi) => {
    return quasi === undefined ? quasi : quasi.split(newline);
  });

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
      // Do not count the line if it's all whitespace and directly before a
      // newline (or the very last line), not an expression.
      if (
        matched.length === line.length &&
        (j + 1 < lines.length || i + 1 === splits.length)
      ) {
        lines[j] = '';
        continue;
      }
      if (common === undefined) {
        common = matched;
      } else {
        common = commonStart(common, matched);
      }
    }
  }

  // Strip the first line if it's all whitespace
  const firstSplit = splits[0];
  // It only counts if this line was directly before a newline, not an
  // expression
  if (firstSplit && firstSplit.length > 1) {
    if (firstSplit[0] === '') firstSplit[1] = '';
  }

  // Strip the last line if it's all whitespace
  const lastSplit = splits[splits.length - 1];
  // It only counts if this line was directly after a newline, not an expression
  if (lastSplit && lastSplit.length > 1) {
    const lastIndex = lastSplit.length - 1;
    if (lastSplit[lastIndex] === '') lastSplit[lastIndex - 1] = '';
  }

  const min = common ? common.length : 0;
  return splits.map((lines, i) => {
    if (lines === undefined) return lines;

    let quasi = lines[0];
    // Only the first split's first line is actually the start of a line.
    // Every other split's first line continues the same line as the expression.
    if (i === 0) quasi = quasi.slice(min);

    for (let i = 1; i < lines.length; i += 2) {
      quasi = quasi + lines[i] + lines[i + 1].slice(min);
    }
    return quasi;
  });
}

function commonStart(a: string, b: string): string {
  const length = Math.min(a.length, b.length);
  let i = 0;
  for (; i < length; i++) {
    if (a[i] !== b[i]) break;
  }
  return a.slice(0, i);
}

export default dedent;
