import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';


const plugins = [
  resolve(),
  babel({
    "plugins": [
        '@babel/plugin-proposal-optional-chaining'
    ],
    "presets": [[ "@babel/preset-env" ]]
  })
];

export default [
  {
    input: 'src/pluggable.js',
    output: {
      name: 'pluggable',
      sourcemap: true,
      file: 'dist/pluggable-with-lodash.js',
      format: 'umd'
    },
    plugins
  }
];
