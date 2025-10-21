export const authTemplates = {
  jwt: {
    middleware: `import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(user: { id: number; email: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}`,

    routes: `import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from './middleware/auth';
import { prisma } from './db';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: { email, password_hash, name, email_verified: false },
    });

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;`,
  },

  oauth: {
    github: `import express from 'express';
import { generateToken } from './middleware/auth';
import { prisma } from './db';

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI!;

router.get('/github', (req, res) => {
  const authUrl = \`https://github.com/login/oauth/authorize?client_id=\${GITHUB_CLIENT_ID}&redirect_uri=\${GITHUB_REDIRECT_URI}&scope=user:email\`;
  res.redirect(authUrl);
});

router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const { access_token } = await tokenResponse.json();

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': \`Bearer \${access_token}\` },
    });
    const githubUser = await userResponse.json();

    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { 'Authorization': \`Bearer \${access_token}\` },
    });
    const emails = await emailResponse.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email;

    let user = await prisma.users.findUnique({ where: { email: primaryEmail } });
    
    if (!user) {
      user = await prisma.users.create({
        data: {
          email: primaryEmail,
          name: githubUser.name || githubUser.login,
          password_hash: '',
          email_verified: true,
        },
      });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.redirect(\`/auth/success?token=\${token}\`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

export default router;`,

    google: `import express from 'express';
import { generateToken } from './middleware/auth';
import { prisma } from './db';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

router.get('/google', (req, res) => {
  const authUrl = \`https://accounts.google.com/o/oauth2/v2/auth?client_id=\${GOOGLE_CLIENT_ID}&redirect_uri=\${GOOGLE_REDIRECT_URI}&response_type=code&scope=openid email profile\`;
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    const { access_token } = await tokenResponse.json();

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': \`Bearer \${access_token}\` },
    });
    const googleUser = await userResponse.json();

    let user = await prisma.users.findUnique({ where: { email: googleUser.email } });
    
    if (!user) {
      user = await prisma.users.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          password_hash: '',
          email_verified: true,
        },
      });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.redirect(\`/auth/success?token=\${token}\`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

export default router;`,
  },
};
