import caraoke from '@caraoke/config/eslint';

export default [
  ...caraoke,
  {
    // App entry/config files and route components use default exports.
    rules: {},
  },
];
