import pool from '../db/pool.js';
import { signResetToken, verifyResetToken } from '../services/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';

const SALT_ROUNDS = 12;

export const forgotPassword = async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'No account found with that username.' });
    }

    const user = result.rows[0];

    if (!user.email) {
      return res.json({ message: 'This account has no email on file and cannot be recovered. Please create a new account.' });
    }

    const token = signResetToken(user.id, user.password_hash);
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink);

    return res.json({ message: 'A password reset link has been sent to your email.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req, res){
    const { token, newPassword } = req.body

    try {
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Step 1: decode without verifying
        const decoded = jwt.decode(token);

        if (!decoded) {
            return res.status(400).json({ error: 'Invalid reset link.' });
        }

        // Step 2: fetch current password_hash so we can verify the pwh fingerprint
        const result = await pool.query(` 
            SELECT id, password_hash FROM users WHERE id = $1`
        ,[decoded.userId]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid reset link.' });
        }

        const user = result.rows[0];

        // Step 3: full verification — signature, expiry, purpose, pwh fingerprint
        verifyResetToken(token, user.password_hash);

        // Step 4: hash the new password and update
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await pool.query(`
            UPDATE users SET password_hash = $1 WHERE id = $2`,
        [newHash, user.id]);

        return res.json({ message: 'Password reset successfully. Please log in with your new password.' });

    } catch (err) {
        // jwt.verify inside verifyResetToken throws on expiry, bad signature, wrong purpose, or used token
        if (
        err.name === 'TokenExpiredError' ||
        err.name === 'JsonWebTokenError' ||
        err.message === 'Invalid token purpose' ||
        err.message === 'Token already used or password already changed'
        ) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

