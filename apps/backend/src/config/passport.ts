import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import * as bcrypt from 'bcryptjs';

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID']!,
  clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
  callbackURL: process.env['GOOGLE_CALLBACK_URL'] || '/api/v1/auth/google/callback'
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }

    user = await User.findOne({ email: profile.emails?.[0]?.value });
    
    if (user) {
      // Link existing local account with Google
      user.googleId = profile.id;
      user.provider = 'google';
      user.isEmailVerified = true; // Google accounts are always verified
      await user.save();
      console.log('✅ Linked existing account with Google:', user.email);
      return done(null, user);
    }

    // Generate a secure random password for Google OAuth users
    const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const newUser = new User({
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      provider: 'google',
      isEmailVerified: true,
      password: hashedPassword
    });

    await newUser.save();
    done(null, newUser);
  } catch (error) {
    done(error, false);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

export default passport;