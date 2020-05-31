type Tag<A extends any[], R, T> = (
  this: T,
  strings: TemplateStringsArray,
  ...substitutions: A
) => R;

const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
const newline = /(\n|\r\n?|\u2028|\u2029)/g;
const leadingWhitespace = /^\s*/;

function deduct(str: string): string;
function deduct(str: TemplateStringsArray, ...substitutions: unknown[]): string;
function deduct<A extends any[], R, T>(tag: Tag<A, R, T>): Tag<A, R, T>;
function deduct<A extends any[], R, T>(
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

function getCooked(strings: TemplateStringsArray, index: number): string {
  const string = strings[index];
  if (string === undefined) {
    throw new TypeError(`invalid cooked string at index ${index}`);
  }
  return string;
}

function processTemplateStringsArray(
  strings: TemplateStringsArray,
): TemplateStringsArray {
  const cached = cache.get(strings);
  if (cached) return cached;

  const deducted = process(strings) as TemplateStringsArray;
  cache.set(strings, deducted);

  Object.defineProperty(deducted, 'raw', {
    value: Object.freeze(process(strings.raw)),
  });
  Object.freeze(deducted);

  return deducted;
}

function process(strings: readonly string[]): readonly string[];
function process(
  strings: readonly (string | undefined)[],
): readonly (string | undefined)[] {
  const splits = strings.slice().map((quasi) => {
    return quasi === undefined ? quasi : quasi.split(newline);
  });

  let min = Infinity;
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

      const matchLength = leading[0].length;
      // Do not count the line if it's all whitespace and directly before a
      // newline (or the very last line), not an expression.
      if (
        matchLength === line.length &&
        (j + 1 < lines.length || i + 1 === splits.length)
      ) {
        continue;
      }
      if (matchLength < min) min = matchLength;
    }
  }

  // Strip the first line if it's all whitespace
  const firstSplit = splits[0];
  // It only counts if this line was directly before a newline, not an
  // expression
  if (firstSplit && firstSplit.length > 1) {
    const first = firstSplit[0];
    const leading = leadingWhitespace.exec(first)!;
    if (leading[0].length === first.length) {
      firstSplit[0] = '';
      firstSplit[1] = '';
    }
  }

  // Strip the last line if it's all whitespace
  const lastSplit = splits[splits.length - 1];
  // It only counts if this line was directly after a newline, not an expression
  if (lastSplit && lastSplit.length > 1) {
    const lastIndex = lastSplit.length - 1;
    const last = lastSplit[lastIndex];
    const leading = leadingWhitespace.exec(last)!;
    if (leading[0].length === last.length) {
      lastSplit[lastIndex - 1] = '';
      lastSplit[lastIndex] = '';
    }
  }

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

export default deduct;
