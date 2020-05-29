import typescript from 'rollup-plugin-typescript';

const pkg = require('./package.json');

function common(esm) {
  return {
    // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
    external: [],
    input: 'src/deduct.ts',
    output: esm
      ? { file: pkg.module, format: 'es', sourcemap: true }
      : { file: pkg.main, name: 'overPromise', format: 'umd', sourcemap: true },
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
