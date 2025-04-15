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
import { OAuthProvider, ProviderUser, PlatformJWTPayload } from '@agent-base/types';

// Setup JWT strategy for protected routes
passport.use(
  // Use a stronger type assertion through unknown first
  (new JwtStrategy(
    {
      // Only use Bearer token authentication
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    },
    (jwtPayload, done) => {
      // If the token is valid, the user will be available in req.user
      return done(null, jwtPayload);
    }
  ) as unknown) as passport.Strategy
);

// Setup Google OAuth strategy
passport.use(
  // Use a stronger type assertion through unknown first
  (new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.redirectUri,
      scope: ['profile', 'email'],
    },
    (accessToken, refreshToken, profile, done) => {
      // Create user profile from Google data
      const providerUser: ProviderUser = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        picture: profile.photos?.[0]?.value,
        provider: OAuthProvider.GOOGLE,
      };
      
      return done(null, providerUser);
    }
  ) as unknown) as passport.Strategy
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
export const generateToken = (userData: PlatformJWTPayload): string => {
  // Use 'any' cast on options as temporary workaround for linter error
  return jwt.sign(userData, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  } as any);
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): PlatformJWTPayload | null => {
  try {
    // Decode and verify the token, asserting the payload matches UserProfile
    return jwt.verify(token, config.jwt.secret) as PlatformJWTPayload;
  } catch (error) {
    // If verification fails (invalid token, expired, etc.), return null
    console.warn('[Auth Service] Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export default passport; 