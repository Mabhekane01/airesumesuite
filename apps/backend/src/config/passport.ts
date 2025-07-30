import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

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
      user.googleId = profile.id;
      user.provider = 'google';
      await user.save();
      return done(null, user);
    }

    const newUser = new User({
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      provider: 'google',
      isEmailVerified: true,
      password: 'google-oauth'
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