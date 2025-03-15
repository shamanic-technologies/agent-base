/**
 * Passport Configuration
 * 
 * Sets up Passport.js strategies for authentication
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

// Setup JWT strategy for protected routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract JWT from the auth-token cookie
        (req) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['auth-token'];
          }
          return token;
        },
        // Also check Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.jwt.secret,
    },
    (jwtPayload, done) => {
      // If the token is valid, the user will be available in req.user
      return done(null, jwtPayload);
    }
  )
);

// Setup Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: `${config.authServiceUrl}/oauth/google/callback`,
      scope: ['profile', 'email'],
    },
    (accessToken, refreshToken, profile, done) => {
      // Create user profile from Google data
      const user: UserProfile = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        picture: profile.photos?.[0]?.value,
        provider: 'google',
      };
      
      return done(null, user);
    }
  )
);

// Serialize user to session (store minimal info)
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj: Express.User, done) => {
  done(null, obj);
});

/**
 * Generate a JWT token for the user
 */
export const generateToken = (userData: UserProfile): string => {
  // @ts-ignore - Ignoring TypeScript errors for JWT sign
  return jwt.sign(userData, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): UserProfile | null => {
  try {
    // @ts-ignore - Ignoring TypeScript errors for JWT verify
    return jwt.verify(token, config.jwt.secret) as UserProfile;
  } catch (error) {
    return null;
  }
};

export default passport; 