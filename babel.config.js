module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: {
          // NOTE: Exports of package.json is not works well on RN expect to enable unstable_enablePackageExports
          // so we need to use alias to import the package
          '@modelcontextprotocol/sdk': '@modelcontextprotocol/sdk/dist/esm',
        },
      },
    ],
  ],
};
