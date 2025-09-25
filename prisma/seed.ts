// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding…');

    const categories = [
        'Электрика',
        'Сантехника',
        'Плитка',
        'Отделка',
        'Окна/двери',
        'Мебель/сборка',
    ];

    for (const name of categories) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log(`Categories upserted: ${categories.length}`);
    console.log('Seed OK ✅');
}

main()
    .then(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
    .catch(async (e) => {
        console.error('Seed FAILED ❌', e);
        await prisma.$disconnect();
        process.exit(1);
    });
