export const ROUTES = {
  home: "/",
  events: "/akce",
  eventDetail: "/akce/$eventId",
  newEvent: "/akce/nova",
  editEvent: "/akce/$eventId/upravit",
  manageEvent: "/akce/$eventId/sprava",
  // the participant rates the event and its organizer (Figma C-03, #66)
  rateEvent: "/akce/$eventId/hodnoceni",
  // the organizer rates the participants (Figma D-05, #66): its own page, from the management
  rateParticipants: "/akce/$eventId/hodnoceni-ucastniku",
  myEvents: "/moje-akce",
  groups: "/skupiny",
  profile: "/profil",
  editProfile: "/profil/upravit",
  userProfile: "/uzivatele/$userId",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/zapomenute-heslo",
  // where the link in the verification e-mail leads (Figma B-02)
  emailVerified: "/email-overen",
  // must match the backend's FRONTEND_RESET_PASSWORD_ROUTE, the link in the e-mail
  resetPassword: "/reset-password",
  // linked from the sign-up's consents (#153)
  terms: "/podminky",
  privacy: "/ochrana-osobnich-udaju",
} as const
