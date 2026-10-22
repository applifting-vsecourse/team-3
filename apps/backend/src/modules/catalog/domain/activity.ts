export type Activity = {
  id: string;
  slug: string;
  name: string;
  keywords: string[];
};

/** First level of the two-level activity catalog (B-002). */
export type ActivityCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  activities: Activity[];
};
