-- AlterEnum (#64): přátelé a organizátoři mých akcí, mezi „všichni“ a „jen organizátoři“.
-- Ve vlastní migraci: novou hodnotu enumu nejde použít v transakci, která ji přidala.
ALTER TYPE "profile_visibility" ADD VALUE 'friends' BEFORE 'organizers';
