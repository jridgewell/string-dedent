// TODO: Test type of args
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
function deduct<A extends any[], R, T>(tag: Tag<A , R, T>): Tag<A, R, T>;
function deduct<A extends any[], R, T>(
  arg: string | TemplateStringsArray | Tag<A, R, T>,
): string | Tag<A, R, T> {
  if (typeof arg === 'string') {
    return process([arg])[0]!;
  }

  if (typeof arg === 'function') {
    return function(
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

function process(
  strings: readonly (string | undefined)[],
): readonly (string | undefined)[] {
  const splits = strings.slice().map((s) => {
    return s === undefined ? s : s.split(newline);
  });

  let min = Infinity;
  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    if (split === undefined) continue;

    // If we're at the first template quasi, then the 0 index starts the line.
    // If not, then the 0 index is on the same line after the expression.
    const start = i === 0 ? 0 : 2;
    const splitLength = split.length;

    // Every odd index is the newline char, so we'll skip and only process evens
    for (let j = start; j < split.length; j += 2) {
      const s = split[j];
      const leading = leadingWhitespace.exec(s)!;

      const { length } = leading[0];
      // Do not count the line if it's all whitespace (and directly before a
      // newline, not an expression)
      if (length === s.length && j + 1 < splitLength) continue;
      if (length < min) min = length;
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

  return splits.map((split, i) => {
    if (split === undefined) return split;

    let s = split[0];
    // Only the first split's first line is actually the start of a line.
    // Every other split's first line continues the same line as the expression.
    if (i === 0) s = s.slice(min);

    for (let i = 1; i < split.length; i += 2) {
      s = s + split[i] + split[i + 1].slice(min);
    }

    return s;
  });
}

export default deduct;
