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
  // Moje (#304): Akce with the chips Přihlášen / Pořádám, Skupiny with Jsem členem / Spravuju
  // the navigation's „Moje“: opens on Akce, or on Skupiny when only requests to join wait
  my: "/moje",
  myEvents: "/moje/akce",
  myGroups: "/moje/skupiny",
  groups: "/skupiny",
  groupDetail: "/skupiny/$groupId",
  profile: "/profil",
  editProfile: "/profil/upravit",
  // „Lidé, které znám“ (#307, Figma B-09): the whole list behind the profile's preview
  friends: "/profil/pratele",
  userProfile: "/uzivatele/$userId",
  // Pozvánka od kamaráda (#406): a personal link; it only passes through to the sign-up
  invite: "/pozvanka/$code",
  // Najdi parťáka (#84): a deck of people nearby who like the same, linked from Můj profil
  partners: "/partaci",
  // the centre of upozornění on a phone (#86, Figma C-07); on desktop the bell opens a panel
  notifications: "/upozorneni",
  login: "/login",
  signup: "/signup",
  onboarding: "/vitej",
  forgotPassword: "/zapomenute-heslo",
  // where the link in the verification e-mail leads (Figma B-02)
  emailVerified: "/email-overen",
  // must match the backend's FRONTEND_RESET_PASSWORD_ROUTE, the link in the e-mail
  resetPassword: "/reset-password",
  // linked from the sign-up's consents (#153)
  terms: "/podminky",
  privacy: "/ochrana-osobnich-udaju",
  // TODO(B-070): the plans page doesn't exist yet; linked only with VITE_PREMIUM_ENABLED (#473)
  plans: "/tarify",
} as const
