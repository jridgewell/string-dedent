import typescript from '@rollup/plugin-typescript';

const pkg = require('./package.json');

function common(esm) {
  return {
    input: 'src/dedent.ts',
    output: esm
      ? { format: 'es', dir: 'dist', entryFileNames: '[name].mjs', sourcemap: true }
      : { format: 'umd', name: 'dedent', dir: 'dist', entryFileNames: '[name].umd.js', sourcemap: true },
    plugins: [
      // Compile TypeScript files
      typescript(esm ? {} : { target: 'ES5' }),
    ],
    watch: {
      include: 'src/**',
    },
  };
}

export default [common(false), common(true)];
