/** Up to two capital initials for an avatar: "Petra Nováková" → "PN". */
export const initials = (name: string): string =>
  name
    .split(" ")
    // Skip words that don't start with a letter, e.g. "(Delete" in "Admin (Delete in Prod)".
    .filter((word) => /^\p{L}/u.test(word))
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
