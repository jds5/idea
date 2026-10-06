import test from 'node:test';
import assert from 'node:assert/strict';
import { webUrl } from '../app/links.js';

test('recognize complete HTTP(S) links, preserving query, fragments and encoded content', () => {
  assert.equal(webUrl('  https://example.com/path?a=1&b=%20#part  '), 'https://example.com/path?a=1&b=%20#part');
  assert.equal(webUrl('HTTP://example.com'), 'http://example.com/');
  assert.equal(webUrl('https://例子.测试/路径'), new URL('https://例子.测试/路径').href);
});

test('plain text, mixed content, malformed URLs and non-web schemes have no open action', () => {
  for (const value of ['hello', 'www.example.com', '/page', 'https://', 'https://example.com\nnotes', 'https://exam\tple.com', 'javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/a', 'chrome://settings', 'mailto:a@example.com', null]) {
    assert.equal(webUrl(value), null, String(value));
  }
});
