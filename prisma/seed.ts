// // prisma/seed.ts
// import { PrismaClient, ProjectStatus, UserRole } from '@prisma/client';
// import * as argon2 from 'argon2';
//
// const prisma = new PrismaClient();
//
// async function main() {
//     console.log('Seeding…');
//
//     // генерим хэши через argon2id
//     const clientPassHash = await argon2.hash('client123', {
//         type: argon2.argon2id,
//         memoryCost: 2 ** 16, // 64 MiB
//         timeCost: 3,
//         parallelism: 1,
//     });
//     const contractorPassHash = await argon2.hash('contractor123', {
//         type: argon2.argon2id,
//         memoryCost: 2 ** 16,
//         timeCost: 3,
//         parallelism: 1,
//     });
//
//     // ... категории upsert как раньше
//
//     const client = await prisma.user.upsert({
//         where: { email: 'client@example.com' },
//         update: {
//             role: UserRole.CLIENT,
//             passwordHash: clientPassHash,
//             name: 'Client User',
//             city: 'Алматы',
//         },
//         create: {
//             email: 'client@example.com',
//             role: UserRole.CLIENT,
//             passwordHash: clientPassHash,
//             name: 'Client User',
//             city: 'Алматы',
//         },
//     });
//
//     const contractorUser = await prisma.user.upsert({
//         where: { email: 'contractor@example.com' },
//         update: {
//             role: UserRole.CONTRACTOR,
//             passwordHash: contractorPassHash,
//             name: 'Contractor User',
//             city: 'Алматы',
//         },
//         create: {
//             email: 'contractor@example.com',
//             role: UserRole.CONTRACTOR,
//             passwordHash: contractorPassHash,
//             name: 'Contractor User',
//             city: 'Алматы',
//         },
//     });
//
//     const categories = [
//         'Электрика',
//         'Сантехника',
//         'Плитка',
//         'Отделка',
//         'Окна/двери',
//         'Мебель/сборка',
//     ];
//
//     // 1) Категории параллельно
//     await Promise.all(
//       categories.map((name) =>
//         prisma.category.upsert({
//             where: { name },
//             update: {},
//             create: { name },
//         }),
//       ),
//     );
//
//
//     // 4) Проект клиента — создаём только если ещё нет
//     const existingProject = await prisma.project.findFirst({
//         where: { clientId: client.id, title: 'Ремонт кухни' },
//         select: { id: true },
//     });
//
//     const project =
//       existingProject ??
//       (await prisma.project.create({
//           data: {
//               clientId: client.id,
//               title: 'Ремонт кухни',
//               description: 'Плитка, стены, потолок',
//               placeType: 'apartment',
//               city: 'Алматы',
//               status: 'OPEN',
//           },
//           select: { id: true },
//       }));
//
//     console.log('Seed OK ✅');
//     console.log(`Categories: ${categories.length}`);
//     console.log('Client:', client.id);
//     console.log('ContractorUser:', contractorUser.id);
//     console.log('Contractor:', contractorUser.id);
//     console.log('Project:', project.id);
//
//
// }
//
// main().finally(() => prisma.$disconnect());
