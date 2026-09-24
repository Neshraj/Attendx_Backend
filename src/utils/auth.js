import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      organizationId: user.organizationId?.toString() || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function setAuthCookie(res, token) {
  const production = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearAuthCookie(res) {
  const production = process.env.NODE_ENV === 'production';
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/'
  });
}
