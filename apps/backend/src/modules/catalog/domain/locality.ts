export type Locality = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  lat: number;
  lng: number;
};
