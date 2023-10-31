# jest-environment-linkedom

`jest-environment-linkedom` is jest test environment based on `linkedom`.

## Goal

The goal of this plugin is to provide as fast browser like runtime for jest as possible. Unlike `jsdom` this plugin does not try to provide standards compliant HTML implementation. Instead this plugin focuses on low memory footprint, fast runtime execution and comprehensive mocked HTML APIs where testing can take place by mocking the required methods.

## Getting started

```
npm install --save-dev jest-environment-linkedom
```

jest.config

```js
export default {
  testEnvironment: "linkedom",
}
```


## Versioning

This package tries to match the major version with jest major version.
Always install the same major version of jest and this plugin.
First supported Jest version is 29
