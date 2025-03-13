/**
 * HelloWorld Auth Service
 * 
 * A simple authentication service that issues and verifies JWT tokens.
 * Uses in-memory storage for demonstration purposes.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'helloworld_jwt_secret_key';
const TOKEN_EXPIRY = '24h';

// In-memory user database
const users: any[] = [
  {
    id: 'user-demo-001',
    username: 'demo',
    // hashed password for 'password123'
    passwordHash: '75778c563f95e3f48f86762710398bee9dbd9650d2a2971577a7167ade2e4372',
    createdAt: new Date().toISOString(),
    active: true
  }
];

// In-memory token database
const refreshTokens: any[] = [];

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'healthy' });
});

/**
 * Register a new user
 * 
 * Request body:
 * - username: username to register
 * - password: password for the account
 */
app.post('/auth/register', (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // Check if username already exists
    if (users.some(user => user.username === username)) {
      return res.status(409).json({
        success: false,
        error: 'Username already taken'
      });
    }
    
    // Create new user
    const id = `user-${uuidv4()}`;
    const passwordHash = hashPassword(password);
    
    const newUser = {
      id,
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      active: true
    };
    
    users.push(newUser);
    
    // Don't return the password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    return res.status(201).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

/**
 * Login a user
 * 
 * Request body:
 * - username: username to login
 * - password: password for the account
 */
app.post('/auth/login', (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // Find user
    const user = users.find(user => user.username === username);
    
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Verify password
    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    const refreshToken = uuidv4();
    
    // Store refresh token
    refreshTokens.push({
      token: refreshToken,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: TOKEN_EXPIRY,
        user: {
          id: user.id,
          username: user.username
        }
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

/**
 * Refresh an access token
 * 
 * Request body:
 * - refreshToken: Refresh token to use
 */
app.post('/auth/refresh', (req: express.Request, res: express.Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    // Find refresh token
    const storedToken = refreshTokens.find(token => 
      token.token === refreshToken && new Date(token.expiresAt) > new Date()
    );
    
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }
    
    // Find user
    const user = users.find(user => user.id === storedToken.userId);
    
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: TOKEN_EXPIRY
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

/**
 * Validate a token
 * 
 * Request body:
 * - token: JWT token to validate
 */
app.post('/auth/validate', (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Find user
    const user = users.find(user => user.id === decoded.sub);
    
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user inactive'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

/**
 * Get test credentials (for testing only)
 */
app.get('/auth/test-credentials', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    data: {
      username: 'demo',
      password: 'password123'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
}); 