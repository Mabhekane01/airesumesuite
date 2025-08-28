import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { query } from "./database";
import { logger } from "../utils/logger";

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const result = await query(
          "SELECT * FROM users WHERE email = $1 AND is_active = true",
          [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        logger.error("Local strategy error:", error);
        return done(error);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env["JWT_SECRET"] || "your-jwt-secret",
    },
    async (payload, done) => {
      try {
        const result = await query(
          "SELECT id, email, first_name, last_name, service_type, tier FROM users WHERE id = $1 AND is_active = true",
          [payload.id]
        );

        if (result.rows.length === 0) {
          return done(null, false);
        }

        return done(null, result.rows[0]);
      } catch (error) {
        logger.error("JWT strategy error:", error);
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy
if (process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env["GOOGLE_CLIENT_ID"],
        clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
        callbackURL:
          process.env["GOOGLE_CALLBACK_URL"] || "/api/v1/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Check if user exists
          let result = await query(
            "SELECT * FROM users WHERE google_id = $1 AND is_active = true",
            [profile.id]
          );

          if (result.rows.length > 0) {
            // Update last login
            await query(
              "UPDATE users SET last_login_at = NOW() WHERE id = $1",
              [result.rows[0].id]
            );
            return done(null, result.rows[0]);
          }

          // Check if email exists
          result = await query(
            "SELECT * FROM users WHERE email = $1 AND is_active = true",
            [profile.emails?.[0]?.value]
          );

          if (result.rows.length > 0) {
            // Link Google account to existing user
            await query(
              "UPDATE users SET google_id = $1, provider = $2, is_email_verified = true WHERE id = $3",
              [profile.id, "google", result.rows[0].id]
            );
            return done(null, result.rows[0]);
          }

          // Create new user
          const newUser = {
            email: profile.emails?.[0]?.value,
            first_name: profile.name?.givenName || "Unknown",
            last_name: profile.name?.familyName || "Unknown",
            google_id: profile.id,
            provider: "google",
            is_email_verified: true,
            service_type: "ai-resume",
          };

          result = await query(
            `INSERT INTO users (email, first_name, last_name, google_id, provider, is_email_verified, service_type, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
              newUser.email,
              newUser.first_name,
              newUser.last_name,
              newUser.google_id,
              newUser.provider,
              newUser.is_email_verified,
              newUser.service_type,
              "", // Empty password for OAuth users
            ]
          );

          return done(null, result.rows[0]);
        } catch (error) {
          logger.error("Google strategy error:", error);
          return done(error);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await query(
      "SELECT id, email, first_name, last_name, service_type, tier FROM users WHERE id = $1 AND is_active = true",
      [id]
    );

    if (result.rows.length === 0) {
      return done(null, false);
    }

    return done(null, result.rows[0]);
  } catch (error) {
    logger.error("Deserialize user error:", error);
    return done(error);
  }
});

export { passport };
