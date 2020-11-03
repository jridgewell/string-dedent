type Tag<A extends unknown[], R, T> = (
  this: T,
  strings: TemplateStringsArray,
  ...substitutions: A
) => R;

const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
const newline = /(\n|\r\n?|\u2028|\u2029)/g;
const leadingWhitespace = /^\s*/;
const nonWhitespace = /\S/;

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

    // First split is the static text starting at the opening line until the
    // first `${}` template expression.
    const firstSplit = i === 0;

    // Last split is all the static text after the final `${}` until the closing
    // line.
    const lastSplit = i + 1 === splits.length;

    // If we're at the first split, then the 0 index is the start of a line. If
    // not, then the 0 index is on the same line after a `${}` so we can skip it when
    // calculating the common indentation.
    const start = firstSplit ? 0 : 2;

    // The opening line (and its ending newline) is removed if it does not
    // contain a `${}` and only contains whitespace.
    if (firstSplit && lines.length > 1 && !nonWhitespace.test(lines[0])) {
      lines[0] = '';
      lines[1] = '';
    }
    // The closing line (and its beginning newline) is removed if it does not
    // contain a `${}` and only contains whitespace.
    if (
      lastSplit &&
      lines.length > 1 &&
      !nonWhitespace.test(lines[lines.length - 1])
    ) {
      lines[lines.length - 1] = '';
      lines[lines.length - 2] = '';
    }

    // Every odd index is the newline char, so we'll skip and only process evens
    for (let j = start; j < lines.length; j += 2) {
      const line = lines[j];
      const leading = leadingWhitespace.exec(line)!;
      const matched = leading[0];

      // If we are on the last line of this split, and we are not processing the last split (which
      // is after all template expressions), then this line contains a `${}`.
      const lineContainsTemplateExpression = j + 1 === lines.length && !lastSplit;

      // If there is only whitespace on this line, then it doesn't contribute to indentation,
      // unless this line contains a `${}` expression.
      if (matched.length === line.length && !lineContainsTemplateExpression) {
        continue;
      }

      // This line contains significant characters, so it is used in the common calculation.
      if (common === undefined) {
        common = matched;
      } else {
        const length = calculateCommonLength(matched, common);
        common = common.slice(0, length);
      }
    }
  }

  const remove = common || '';
  return splits.map((lines, i) => {
    if (lines === undefined) return lines;

    let quasi = lines[0];

    // Only the first split's first line is actually the start of a line.
    // Every other split's first line continues the same line as the expression.
    if (i === 0) quasi = quasi.slice(calculateCommonLength(quasi, remove));

    for (let i = 1; i < lines.length; i += 2) {
      const next = lines[i + 1];
      quasi += lines[i] + next.slice(calculateCommonLength(next, remove));
    }

    return quasi;
  });
}

function calculateCommonLength(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let i = 0;
  for (; i < length; i++) {
    if (a[i] !== b[i]) break;
  }
  return i;
}

export default dedent;
