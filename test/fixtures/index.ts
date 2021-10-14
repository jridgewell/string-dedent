import dd from '../../src/dedent';
import * as path from 'path';
import * as fs from 'fs';
import vm from 'vm';

const { OVERWRITE, GREP } = process.env;

function showWhitespace(contents: string, newline = true): string {
  contents = contents.replace(/ /g, '·').replace(/\t/g, '-');
  return newline ? contents.replace(/^/gm, '^') : contents;
}
function hideWhitespace(contents: string): string {
  return contents.replace(/·/g, ' ').replace(/-/g, '\t');
}
function trailingNewline(contents: string): string {
  return contents.replace(/\n?$/, '\n');
}

function readFile(path: string): string | undefined {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}
function writeFile(path: string, contents: string): void {
  fs.writeFileSync(path, contents);
  console.log(`updated ${path}`);
}
function removeFile(path: string): void {
  try {
    fs.unlinkSync(path);
  } catch {
    // swallow.
  }
}

function isDirectory(path: string): boolean {
  return !path.includes('.');
}
function isTestDirectory(root: string, name: string): boolean {
  return isDirectory(name) && fs.existsSync(path.join(root, name, 'input.js'));
}

function runTest(root: string, name: string): void {
  const t = GREP && !name.includes(GREP) ? it.skip : it;
  t(name, () => {
    const inputPath = path.join(root, name, 'input.js');
    const outputPath = path.join(root, name, 'output.txt');
    const errorPath = path.join(root, name, 'error.txt');
    const input = readFile(inputPath)!;
    const expectedOutput = readFile(outputPath);
    const expectedError =
      expectedOutput === undefined ? readFile(errorPath) : undefined;

    let output: string | undefined;
    let actualError: string | undefined;
    try {
      const script = new vm.Script(hideWhitespace(input));
      output = showWhitespace(script.runInNewContext({ dd }));
    } catch (e) {
      actualError = (e as Error).toString();
    }

    if (/[ \t]/.test(input) || !input.endsWith('\n')) {
      writeFile(inputPath, trailingNewline(showWhitespace(input, false)));
    }
    if (expectedOutput !== undefined && !expectedOutput.endsWith('\n')) {
      writeFile(outputPath, `${expectedOutput}\n`);
    }

    if (expectedError === undefined && expectedOutput === undefined) {
      if (output === undefined) {
        writeFile(errorPath, actualError!);
      } else {
        writeFile(outputPath, output);
      }
      return;
    }

    try {
      const actual = output ?? actualError;
      const expected =
        output === undefined
          ? expectedError
          : expectedOutput?.replace(/\n$/, '');
      expect(actual).toBe(expected);
    } catch (e) {
      if (!OVERWRITE) throw e;
      if (output === undefined) {
        removeFile(outputPath);
        writeFile(errorPath, actualError!);
      } else {
        removeFile(errorPath);
        writeFile(outputPath, `${output}\n`);
      }
    }
  });
}

function runTests(root: string, directory: string): void {
  describe(directory, () => {
    const r = path.join(root, directory);
    const files = fs.readdirSync(r);

    for (const f of files) {
      if (isTestDirectory(r, f)) {
        runTest(r, f);
      } else if (isDirectory(f)) {
        runTests(r, f);
      }
    }
  });
}

function runFixtures(): void {
  const root = path.join(process.cwd(), 'test', 'fixtures');
  const fixtures = fs.readdirSync(root);
  for (const f of fixtures) {
    if (isDirectory(f)) runTests(root, f);
  }
}

runFixtures();
