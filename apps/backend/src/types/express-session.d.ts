import 'express-session';

declare module 'express-session' {
  interface SessionData {
    redirectAfterLogin?: string;
    csrfToken?: string;
  }
}
