// toISOString() after the year 9999 (UTC) is „+010000-…“, which comes back
// from the database as a date nothing can read
export const LAST_STORABLE_TIME = Date.UTC(9999, 11, 31, 23, 59, 59, 999);
