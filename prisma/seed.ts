import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type CityRow = { slug: string; nameRu: string; nameKk?: string; nameEn?: string };

const cities: CityRow[] = [
  { slug: 'astana',     nameRu: 'Астана',      nameKk: 'Астана',      nameEn: 'Astana' },
  { slug: 'almaty',     nameRu: 'Алматы',      nameKk: 'Алматы',      nameEn: 'Almaty' },
  { slug: 'shymkent',   nameRu: 'Шымкент',     nameKk: 'Шымкент',     nameEn: 'Shymkent' },
  { slug: 'aktobe',     nameRu: 'Актобе',      nameKk: 'Ақтөбе',      nameEn: 'Aktobe' },
  { slug: 'atyrau',     nameRu: 'Атырау',      nameKk: 'Атырау',      nameEn: 'Atyrau' },
  { slug: 'aktau',      nameRu: 'Актау',       nameKk: 'Ақтау',       nameEn: 'Aktau' },
  { slug: 'oral',       nameRu: 'Орал (Уральск)', nameKk: 'Орал',     nameEn: 'Oral' },
  { slug: 'kostanay',   nameRu: 'Костанай',    nameKk: 'Қостанай',    nameEn: 'Kostanay' },
  { slug: 'pavlodar',   nameRu: 'Павлодар',    nameKk: 'Павлодар',    nameEn: 'Pavlodar' },
  { slug: 'petropavl',  nameRu: 'Петропавловск', nameKk:'Петропавл',  nameEn: 'Petropavl' },
  { slug: 'kokshetau',  nameRu: 'Кокшетау',    nameKk: 'Көкшетау',    nameEn: 'Kokshetau' },
  { slug: 'karaganda',  nameRu: 'Караганда',   nameKk: 'Қарағанды',   nameEn: 'Karaganda' },
  { slug: 'temirtau',   nameRu: 'Темиртау',    nameKk: 'Теміртау',    nameEn: 'Temirtau' },
  { slug: 'balqash',    nameRu: 'Балхаш',      nameKk: 'Балқаш',      nameEn: 'Balkhash' },
  { slug: 'ekibastuz',  nameRu: 'Экибастуз',   nameKk: 'Екібастұз',   nameEn: 'Ekibastuz' },
  { slug: 'kyzylorda',  nameRu: 'Кызылорда',   nameKk: 'Қызылорда',   nameEn: 'Kyzylorda' },
  { slug: 'taraz',      nameRu: 'Тараз',       nameKk: 'Тараз',       nameEn: 'Taraz' },
  { slug: 'taldykorgan',nameRu: 'Талдыкорган', nameKk: 'Талдықорған', nameEn: 'Taldykorgan' },
  { slug: 'konaev',     nameRu: 'Конаев',      nameKk: 'Қонаев',      nameEn: 'Konaev' },
  { slug: 'turkistan',  nameRu: 'Туркестан',   nameKk: 'Түркістан',   nameEn: 'Turkistan' },
  { slug: 'semei',      nameRu: 'Семей',       nameKk: 'Семей',       nameEn: 'Semey' },
  { slug: 'oskemen',    nameRu: 'Усть-Каменогорск', nameKk: 'Өскемен', nameEn: 'Oskemen' },
  { slug: 'ridder',     nameRu: 'Риддер',      nameKk: 'Риддер',      nameEn: 'Ridder' },
  { slug: 'zhanaozen',  nameRu: 'Жанаозен',    nameKk: 'Жаңаөзен',    nameEn: 'Zhanaozen' },
  { slug: 'kynar',      nameRu: 'Кентау',      nameKk: 'Кентау',      nameEn: 'Kentau' },
  // при желании дополни остальными городами
];

async function main() {
  for (const c of cities) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      update: { nameRu: c.nameRu, nameKk: c.nameKk, nameEn: c.nameEn },
      create: c,
    });
  }
  console.log(`Seeded ${cities.length} cities`);
}



main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
