-- Malá varianta obrázku pro karty (#77); starší obrázky ji nemají
ALTER TABLE "uploaded_image" ADD COLUMN "small" BYTEA;
