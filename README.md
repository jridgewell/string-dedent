# string-dedent

> De-indents (dedents) passed in strings

Removes the leading whitespace from each line, allowing you to break the
string into multiple lines with indentation. If lines have an uneven amount
of indentation, then only the common whitespace is removed.

The opening and closing lines (which contain the ``` ` ``` marks) must be on their own line. The
opening line must be empty, and the closing line may contain whitespace. The opening and closing
line will be removed from the output, so that only the content in between remains.

```js
const dedent = require('string-dedent');

function example() {
  console.log('Outputs:');
  console.log(dedent`
    This line will appear without any indentation.
      * This list will appear with 2 spaces more than previous line.
      * As will this line.

    Empty lines (like the one above) will not affect the common indentation.
  `);
}
example();
```

```text
Outputs:
This line will appear without any indentation.
  * This list will appear with 2 spaces more than previous line.
  * As will this line.

Empty lines (like the one above) will not affect the common indentation.
```

## Installation

```sh
npm install string-dedent
```

## Usage

The most common way to dedent is to use it as a tagged template literal. It
supports expression interpolation, where the expressions will not affect the
dedenting:

```js
const exp = 'expressions';
const threeSpaces = '   ';
console.log('Outputs:');
console.log(dedent`
  This supports ${exp} as you would expect.

  Only whitespace that appears here inside the tagged template literal
  will be dedented.
  ${threeSpaces}<- expression whitespace will not be removed
`);

/*
Outputs:
This supports expressions as you would expect.

Only whitespace that appears here inside the tagged template literal
will be dedented.
   <- expression whitespace will not be removed
*/
```

If you need to use a tagged template literal like `html`, you can wrap the tag with `dedent`:

```js
// Regular html usage:
const html = require('lit-html');
render(container, html`
  <div>The leading whitespace before this div tag will create a Text node in the output...</div>
`);

// Wrapped html usage:
const html = dedent(require('lit-html'));
render(container, html`
  <div>Leading whitespace before this div tag will not make it to HTML</div>
`);
```

Additionally, you may also call it like a function. This allows you to
interpolate expressions into your string, and have the full string dedented.

```js
const threeSpaces = '   ';
const str = `
  Used as a function
${threeSpaces}<- expression whitespace will be removed
`;
console.log('Outputs:');
console.log(dedent(str));

/*
Outputs:
Used as a function
 <- expression whitespace will be removed
*/
```
