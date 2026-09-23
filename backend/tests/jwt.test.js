// Unit tests for JWT utilities (no database or network required)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

const {
  generateTokenPair,
  verifyToken,
  extractTokenFromHeader,
  decodeToken,
} = require('../src/utils/jwt');

describe('jwt utils', () => {
  const user = { _id: 'abc123', email: 'test@example.com', roles: ['user'] };

  test('generateTokenPair returns an access and refresh token', () => {
    const { accessToken, refreshToken } = generateTokenPair(user);
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
    expect(accessToken).not.toBe(refreshToken);
  });

  test('verifyToken decodes a valid access token with the expected claims', () => {
    const { accessToken } = generateTokenPair(user);
    const decoded = verifyToken(accessToken, 'access');
    expect(decoded.id).toBe(user._id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.type).toBe('access');
  });

  test('verifyToken rejects a token used as the wrong type', () => {
    const { accessToken } = generateTokenPair(user);
    expect(() => verifyToken(accessToken, 'refresh')).toThrow();
  });

  test('verifyToken rejects a tampered/invalid token', () => {
    expect(() => verifyToken('not.a.valid.token', 'access')).toThrow();
  });

  test('extractTokenFromHeader parses a Bearer header and rejects bad input', () => {
    expect(extractTokenFromHeader('Bearer xyz')).toBe('xyz');
    expect(extractTokenFromHeader('Basic xyz')).toBeNull();
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  test('decodeToken returns the payload without verification', () => {
    const { accessToken } = generateTokenPair(user);
    const decoded = decodeToken(accessToken);
    expect(decoded.email).toBe(user.email);
  });
});
