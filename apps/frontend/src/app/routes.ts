export const ROUTES = {
  home: "/",
  events: "/akce",
  eventDetail: "/akce/$eventId",
  groups: "/skupiny",
  profile: "/profil",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/zapomenute-heslo",
  // must match the backend's FRONTEND_RESET_PASSWORD_ROUTE, the link in the e-mail
  resetPassword: "/reset-password",
} as const
