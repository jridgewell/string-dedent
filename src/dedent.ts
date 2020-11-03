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

    // Last split signifies that we are processing the final static text portion of the template
    // literal (everything after the final `${}` expression).
    const lastSplit = i + 1 === splits.length;

    // Every odd index is the newline char, so we'll skip and only process evens
    for (let j = start; j < lines.length; j += 2) {
      const line = lines[j];
      const leading = leadingWhitespace.exec(line)!;
      const matched = leading[0];

      // Last split line signifies we are processing the line that contains a `${}` template
      // expression (or the closing line, if this is also the last split).
      const lastSplitLine = j + 1 === lines.length;

      // If we are on the last line of this split, and we are not processing the last split (which
      // is after all template expressions), then this line contains a `${}`.
      const lineContainsTemplateExpression = lastSplitLine && !lastSplit;

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

  const remove = common ?? '';
  const openingSplit = splits[0]!;
  const closingSplit = splits[splits.length - 1]!;

  // If the opening line is whitespace-only and does not contain a `${}`, then
  // we remove the newline character that ends it.
  if (openingSplit.length > 2) {
    let openingLine = openingSplit[0];
    if (leadingWhitespace.exec(openingLine)![0] === openingLine) {
      openingSplit[0] = '';
      openingSplit[1] = '';
    }
  }
  // If the closing line is whitespace-only and does not follow a `${}`, then we
  // remove the newline character that started it.
  if (closingSplit.length > 2) {
    let closingLine = closingSplit[closingSplit.length - 1];
    if (leadingWhitespace.exec(closingLine)![0] === closingLine) {
      closingSplit[closingSplit.length - 2] = '';
      closingSplit[closingSplit.length - 1] = '';
    }
  }

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
