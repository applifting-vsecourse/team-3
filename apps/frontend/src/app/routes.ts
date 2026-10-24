export const ROUTES = {
  home: "/",
  events: "/akce",
  eventDetail: "/akce/$eventId",
  newEvent: "/akce/nova",
  groups: "/skupiny",
  profile: "/profil",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/zapomenute-heslo",
  // where the link in the verification e-mail leads (Figma B-02)
  emailVerified: "/email-overen",
  // must match the backend's FRONTEND_RESET_PASSWORD_ROUTE, the link in the e-mail
  resetPassword: "/reset-password",
} as const
