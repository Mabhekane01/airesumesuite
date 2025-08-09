==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'pnpm start'

> @ai-job-suite/backend@1.0.0 start /opt/render/project/src/apps/backend
> node dist/index.js
> /opt/render/project/src/node_modules/.pnpm/passport-oauth2@1.8.0/node_modules/passport-oauth2/lib/strategy.js:87
> if (!options.clientID) { throw new TypeError('OAuth2Strategy requires a clientID option'); }

                           ^

TypeError: OAuth2Strategy requires a clientID option
at Strategy.OAuth2Strategy (/opt/render/project/src/node_modules/.pnpm/passport-oauth2@1.8.0/node_modules/passport-oauth2/lib/strategy.js:87:34)
at new Strategy (/opt/render/project/src/node_modules/.pnpm/passport-google-oauth20@2.0.0/node_modules/passport-google-oauth20/lib/strategy.js:52:18)
at Object.<anonymous> (/opt/render/project/src/apps/backend/dist/config/passport.js:43:24)
at Module.\_compile (node:internal/modules/cjs/loader:1738:14)
at Object..js (node:internal/modules/cjs/loader:1871:10)
at Module.load (node:internal/modules/cjs/loader:1470:32)
at Module.\_load (node:internal/modules/cjs/loader:1290:12)
at TracingChannel.traceSync (node:diagnostics_channel:322:14)
at wrapModuleLoad (node:internal/modules/cjs/loader:238:24)
at Module.require (node:internal/modules/cjs/loader:1493:12)
Node.js v24.5.0

💡 Recommendation for your case:
Go with Option 1 — refactor so Google OAuth env vars are only accessed when the server starts, not during build. This will make the container portable and avoid hardcoding secrets into the image.

If you want, I can rewrite your Dockerfile.render.optimized and render.yaml so Puppeteer skip flags, Google OAuth creds, and other secrets are correctly loaded before build and runtime without exposing them inside the built image. That way you avoid this crash entirely.
You said:
want the optimal option please
ChatGPT said:

Got it ✅ — the optimal option here is Option 1 (load Google OAuth env vars only at runtime),
because:

    It keeps secrets out of your built image.

    It works on Render, Docker, and locally without special build args.

    It avoids hardcoding sensitive data in Dockerfile.

    It fixes the OAuth2Strategy requires a clientID crash.

Here’s the fix
1️⃣ Change how your passport.js loads env vars

Right now, you’re probably importing and configuring Passport immediately when the module is loaded during build:

// ❌ Problem: This runs as soon as file is imported
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
new GoogleStrategy(
{
clientID: process.env.GOOGLE_CLIENT_ID, // undefined during build
clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
verifyCallback
)
);

We change it so env vars are only read after the app starts:

// ✅ Lazy-load Google strategy only at runtime
const passport = require("passport");

function configurePassport() {
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
new GoogleStrategy(
{
clientID: process.env.GOOGLE_CLIENT_ID,
clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
verifyCallback
)
);
}

module.exports = { configurePassport };

2️⃣ Load Passport inside server.js (or index.js) after env vars exist

require("dotenv").config();
const express = require("express");
const passport = require("passport");
const { configurePassport } = require("./config/passport");

const app = express();

// Run passport config here — runtime, not build
configurePassport();

app.use(passport.initialize());

// Routes...

3️⃣ No Dockerfile change needed for env vars

Your Dockerfile.render.optimized can stay the same except we make sure it doesn’t force env vars at build:

# Use custom base image

FROM ghcr.io/mabhekane01/ai-job-suite-latex-base:latest

USER root
WORKDIR /app

COPY --chown=pptruser:pptruser apps/backend/package.json ./
COPY --chown=pptruser:pptruser apps/backend/tsconfig.json ./
COPY --chown=pptruser:pptruser pnpm-lock.yaml ./
COPY --chown=pptruser:pptruser apps/backend/src ./src

# Puppeteer skip

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN pnpm install --prod --frozen-lockfile
RUN pnpm run build

RUN mkdir -p ./latex-workspace/templates/ ./latex-workspace/output/ && \
 echo "% LaTeX template placeholder" > ./latex-workspace/templates/basic.tex

RUN chown -R pptruser:pptruser /app
USER pptruser

# Non-sensitive defaults

ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV RENDER_SERVICE=true
ENV DISABLE_OPENCOLLECTIVE=true
ENV DISABLE_UPDATE_NOTIFIER=true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=2 \
 CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["pnpm", "start"]

4️⃣ Why this is optimal

    🚫 No secrets in Docker image.

    🚀 Works everywhere without ARG or build.env hacks.

    🛡 Future-proof for staging/production with different env values.

    🐛 Solves your crash, since GOOGLE_CLIENT_ID is loaded after Render injects env vars.
