import { PrismaService } from '@/core/prisma/prisma.service';
import {
  demoActivities,
  demoActivityCategories,
  demoLocalities,
} from '@/scripts/seed/data/demo-data';

/**
 * Číselník aktivit a lokalit (B-002). Aplikace ho potřebuje vždy, nejen pro demo,
 * proto běží při každém seedu a srovná databázi se zdrojem v demo-data.ts:
 * chybějící položky založí, existujícím aktualizuje název, pořadí a klíčová slova.
 * Nic nemaže – na aktivitu nebo lokalitu už mohou odkazovat akce a skupiny.
 */
export async function seedCatalog(prisma: PrismaService): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const category of demoActivityCategories) {
    const { id } = await prisma.activityCategory.upsert({
      where: { slug: category.slug },
      create: { ...category },
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
    });
    categoryIds.set(category.slug, id);
  }

  for (const activity of demoActivities) {
    const categoryId = categoryIds.get(activity.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category ${activity.categorySlug}`);
    }
    const data = {
      name: activity.name,
      categoryId,
      sortOrder: activity.sortOrder,
      keywords: [...activity.keywords],
    };
    await prisma.activity.upsert({
      where: { slug: activity.slug },
      create: { slug: activity.slug, ...data },
      update: data,
    });
  }

  // Města jsou v seznamu před svými částmi, takže rodič už existuje.
  // Páruje se podle slugu: jméno lokality unikátní není (víc obcí „Nová Ves“).
  const localityIds = new Map<string, string>();
  for (const locality of demoLocalities) {
    const parentId = locality.parentSlug
      ? localityIds.get(locality.parentSlug)
      : null;
    if (locality.parentSlug && !parentId) {
      throw new Error(`Unknown parent locality ${locality.parentSlug}`);
    }
    const data = {
      name: locality.name,
      parentId,
      lat: locality.lat,
      lng: locality.lng,
    };
    const { id } = await prisma.locality.upsert({
      where: { slug: locality.slug },
      create: { slug: locality.slug, ...data },
      update: data,
    });
    localityIds.set(locality.slug, id);
  }

  console.log(
    `Catalog: ${demoActivityCategories.length} categories, ` +
      `${demoActivities.length} activities, ${demoLocalities.length} localities`,
  );
}
