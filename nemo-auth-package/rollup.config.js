import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true,
      exports: 'named'
    }
  ],
  external: [
    'react',
    'react-dom',
    'next',
    'next/server',
    'next/navigation',
    '@prisma/client',
    'bcryptjs',
    'jsonwebtoken',
    'nodemailer',
    'react-hot-toast',
    'axios',
    'zod',
    'next-themes',
    '@radix-ui/react-tooltip',
    'lucide-react',
    'crypto',
    'path'
  ],
  plugins: [
    resolve({
      extensions: ['.js', '.jsx'],
      preferBuiltins: true
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['@babel/preset-react']
    }),
    terser()
  ]
};