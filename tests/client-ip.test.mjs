import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp } from '../lib/client-ip.ts';

test('request IP parsing accepts one address and rejects malformed headers', () => {
  for (const [headers, expected] of [
    [{}, null],
    [{ 'x-real-ip': ' 192.0.2.1 ', 'x-forwarded-for': '192.0.2.2' }, '192.0.2.1'],
    [{ 'x-forwarded-for': '2001:db8::1, 192.0.2.2' }, '2001:db8::1'],
    [{ 'x-real-ip': 'invalid', 'x-forwarded-for': '192.0.2.2, invalid' }, '192.0.2.2'],
    [{ 'x-forwarded-for': 'invalid, 192.0.2.2' }, null],
    [{ 'x-real-ip': '192.0.2.1/24' }, null],
    [{ 'x-forwarded-for': 'unknown' }, null],
    [{ 'x-real-ip': '192.0.2.1:80' }, null],
  ]) assert.equal(getClientIp(new Headers(headers)), expected);
});
