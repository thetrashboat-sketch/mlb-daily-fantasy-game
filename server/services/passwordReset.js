import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const RESET_TOKEN_EXPIRY = '20m';

function hashPasswordForToken(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export function signResetToken(userId, passwordHash) {
  return jwt.sign(
    { 
        userId, 
        purpose: 'password-reset',
        pwh: hashPasswordForToken(passwordHash),
    },
    process.env.RESET_TOKEN_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );
}

export function verifyResetToken(token, currentPasswordHash) {
  const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);

  if (decoded.purpose !== 'password-reset') {
    throw new Error('Invalid token purpose');
  }

  if (decoded.pwh !== hashPasswordForToken(currentPasswordHash)) {
    throw new Error('Token already used or password already changed');
  }

  return decoded;
}