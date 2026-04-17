/* eslint-disable no-console */
import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

async function main() {
  console.log('Seeding demo data...');
  const pwHash = await argon2.hash(PASSWORD);

  // ============ Cities ============
  const astana = await prisma.city.findUniqueOrThrow({ where: { slug: 'astana' } });
  const almaty = await prisma.city.findUniqueOrThrow({ where: { slug: 'almaty' } });
  const shymkent = await prisma.city.findUniqueOrThrow({ where: { slug: 'shymkent' } });

  // ============ Services + Categories (используем то, что создал базовый seed.ts) ============
  const svcRemont  = await prisma.service.findUniqueOrThrow({ where: { slug: 'remont-pod-klyuch' },        include: { categories: true } });
  const svcElectro = await prisma.service.findUniqueOrThrow({ where: { slug: 'elektrika' },                include: { categories: true } });
  const svcPlumb   = await prisma.service.findUniqueOrThrow({ where: { slug: 'santehnika-i-otoplenie' },   include: { categories: true } });
  const svcDoors   = await prisma.service.findUniqueOrThrow({ where: { slug: 'dveri-i-okna' },             include: { categories: true } });
  const svcFloors  = await prisma.service.findUniqueOrThrow({ where: { slug: 'poly-i-napolnye-pokrytiya' },include: { categories: true } });
  const svcDesign  = await prisma.service.findUniqueOrThrow({ where: { slug: 'proektirovanie-i-dizajn' },  include: { categories: true } });

  const catIds = (s: typeof svcRemont, from: number, to: number) =>
    s.categories.slice(from, to).map((c) => c.id);

  // ============ Users ============
  const upUser = (email: string, data: Omit<Prisma.UserUncheckedCreateInput, 'email' | 'passwordHash'>) =>
    prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: pwHash, ...data },
      update: { ...data },
    });

  // Аватары — стабильные публичные Unsplash-картинки портретов
  const AV = (id: string, w = 400) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

  const admin = await upUser('admin@remo.test', {
    role: 'ADMIN', name: 'Админ Демо',
    avatarUrl: AV('1535713875002-d1d0cf377fde'),
  });

  const client1 = await upUser('client1@remo.test', {
    role: 'CLIENT', name: 'Айгерим Сейтова', phone: '+77011111111', cityId: astana.id,
    avatarUrl: AV('1544005313-94ddf0286df2'),
  });
  const client2 = await upUser('client2@remo.test', {
    role: 'CLIENT', name: 'Данияр Абдыкадыров', phone: '+77012222222', cityId: almaty.id,
    avatarUrl: AV('1507003211169-0a1dd7228f2d'),
  });
  const client3 = await upUser('client3@remo.test', {
    role: 'CLIENT', name: 'Мария Нурлан', phone: '+77013333333', cityId: shymkent.id,
    avatarUrl: AV('1438761681033-6461ffad8d80'),
  });

  const c1u = await upUser('contractor1@remo.test', {
    role: 'CONTRACTOR', name: 'Ерлан Жумагали', phone: '+77021111111', cityId: almaty.id,
    avatarUrl: AV('1500648767791-00dcc994a43e'),
  });
  const c2u = await upUser('contractor2@remo.test', {
    role: 'CONTRACTOR', name: 'Бекзат Омаров', phone: '+77022222222', cityId: almaty.id,
    avatarUrl: AV('1472099645785-5658abf4ff4e'),
  });
  const c3u = await upUser('contractor3@remo.test', {
    role: 'CONTRACTOR', name: 'Асель Байжанова', phone: '+77023333333', cityId: astana.id,
    plan: 'PRO', planUntil: new Date(Date.now() + 335 * 86_400_000),
    avatarUrl: AV('1517841905240-472988babdf9'),
  });
  const c4u = await upUser('contractor4@remo.test', {
    role: 'CONTRACTOR', name: 'Нурлан Ибраев', phone: '+77024444444', cityId: astana.id,
    avatarUrl: AV('1506794778202-cad84cf45f1d'),
  });
  const c5u = await upUser('contractor5@remo.test', {
    role: 'CONTRACTOR', name: 'Тимур Саркулов', phone: '+77025555555', cityId: shymkent.id,
    avatarUrl: AV('1519085360753-af0119f7cbe7'),
  });
  const c6u = await upUser('contractor6@remo.test', {
    role: 'CONTRACTOR', name: 'Айдар Касымов', phone: '+77026666666', cityId: almaty.id,
    avatarUrl: AV('1534528741775-53994a69daeb'),
  });

  const biz1 = await upUser('business1@remo.test', {
    role: 'BUSINESS', name: 'Серик Темиров', phone: '+77031111111', cityId: almaty.id,
    avatarUrl: AV('1560250097-0b93528c311a'),
  });
  const biz2 = await upUser('business2@remo.test', {
    role: 'BUSINESS', name: 'Галым Мухитов', phone: '+77032222222', cityId: astana.id,
    avatarUrl: AV('1519085360753-af0119f7cbe7'),
  });

  // ============ Companies (агентства) ============
  const PH = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

  const cAlfa = await prisma.company.upsert({
    where: { id: 'demo-co-alfa' },
    create: {
      id: 'demo-co-alfa',
      name: 'Альфа Ремонт',
      purpose: 'SERVICES',
      description: 'Бригада полного цикла: от черновой до чистовой отделки. Работаем по Алматы 12 лет.',
      userId: biz1.id,
      logoUrl: PH('1503387762-592deb58ef4e', 400),
    },
    update: {
      name: 'Альфа Ремонт',
      logoUrl: PH('1503387762-592deb58ef4e', 400),
    },
  });
  const cBeta = await prisma.company.upsert({
    where: { id: 'demo-co-beta' },
    create: {
      id: 'demo-co-beta',
      name: 'Бета Строй',
      purpose: 'SERVICES',
      description: 'Проекты под ключ в Астане. Дизайн, сметы, прораб на объекте. 50+ завершённых объектов.',
      userId: biz2.id,
      logoUrl: PH('1541888946425-d81bb19240f5', 400),
    },
    update: {
      name: 'Бета Строй',
      logoUrl: PH('1541888946425-d81bb19240f5', 400),
    },
  });

  // ============ Contractor profiles ============
  async function ensureContractor(
    userId: string,
    data: { companyName?: string | null; about?: string; cityId?: string; companyId?: string | null; categoryIds?: string[] },
  ) {
    const { categoryIds, ...rest } = data;
    const existing = await prisma.contractor.findUnique({ where: { userId } });
    if (existing) {
      return prisma.contractor.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(categoryIds ? { categories: { set: categoryIds.map((id) => ({ id })) } } : {}),
        },
      });
    }
    return prisma.contractor.create({
      data: {
        userId,
        ...rest,
        ...(categoryIds ? { categories: { connect: categoryIds.map((id) => ({ id })) } } : {}),
      },
    });
  }

  const c1 = await ensureContractor(c1u.id, {
    companyName: 'Альфа Ремонт',
    about: 'Мастер-ремонтник с опытом 12 лет. Выполняю ремонт под ключ. Сроки и аккуратность — гарантия.',
    cityId: almaty.id, companyId: cAlfa.id,
    categoryIds: [...catIds(svcRemont, 0, 3), ...catIds(svcElectro, 0, 2)],
  });
  const c2 = await ensureContractor(c2u.id, {
    companyName: 'Альфа Ремонт',
    about: 'Электрик с лицензией. Проводка, автоматы, щиты. Квартиры и офисы.',
    cityId: almaty.id, companyId: cAlfa.id,
    categoryIds: catIds(svcElectro, 0, 4),
  });
  const c3 = await ensureContractor(c3u.id, {
    companyName: 'Бета Строй',
    about: 'Дизайнер интерьеров. Проекты с 3D-визуализацией, ведение объекта, авторский надзор.',
    cityId: astana.id, companyId: cBeta.id,
    categoryIds: catIds(svcDesign, 0, 3),
  });
  const c4 = await ensureContractor(c4u.id, {
    companyName: 'Бета Строй',
    about: 'Прораб. Сантехника, отопление, водоснабжение под ключ. Монтаж и пусконаладка.',
    cityId: astana.id, companyId: cBeta.id,
    categoryIds: catIds(svcPlumb, 0, 3),
  });
  const c5 = await ensureContractor(c5u.id, {
    companyName: null,
    about: 'Самозанятый мастер. Двери, окна, замки, фурнитура. Шымкент и пригород.',
    cityId: shymkent.id, companyId: null,
    categoryIds: catIds(svcDoors, 0, 3),
  });
  const c6 = await ensureContractor(c6u.id, {
    companyName: null,
    about: 'Укладка полов: ламинат, паркет, линолеум, плинтус. Опыт 8 лет.',
    cityId: almaty.id, companyId: null,
    categoryIds: catIds(svcFloors, 0, 2),
  });

  // ============ CompanyEmployee ============
  async function ensureEmployee(companyId: string, userId: string, role: 'HEAD' | 'MANAGEMENT' | 'EMPLOYEE', position?: string) {
    await prisma.companyEmployee.upsert({
      where: { companyId_userId: { companyId, userId } },
      create: { companyId, userId, role, position, isActive: true },
      update: { role, position },
    });
  }
  await ensureEmployee(cAlfa.id, biz1.id, 'HEAD', 'Владелец');
  await ensureEmployee(cAlfa.id, c1u.id, 'EMPLOYEE', 'Мастер-ремонтник');
  await ensureEmployee(cAlfa.id, c2u.id, 'EMPLOYEE', 'Электрик');
  await ensureEmployee(cBeta.id, biz2.id, 'HEAD', 'Директор');
  await ensureEmployee(cBeta.id, c3u.id, 'MANAGEMENT', 'Ведущий дизайнер');
  await ensureEmployee(cBeta.id, c4u.id, 'EMPLOYEE', 'Прораб');

  // ============ ContractorService + selected categories ============
  async function linkContractorService(contractorId: string, serviceId: string, categoryIds: string[]) {
    const cs = await prisma.contractorService.upsert({
      where: { contractorId_serviceId: { contractorId, serviceId } },
      create: { contractorId, serviceId },
      update: {},
    });
    for (const categoryId of categoryIds) {
      await prisma.contractorServiceSelectedCategory.upsert({
        where: { contractorServiceId_categoryId: { contractorServiceId: cs.id, categoryId } },
        create: { contractorServiceId: cs.id, categoryId },
        update: {},
      });
    }
  }
  await linkContractorService(c1.id, svcRemont.id,  catIds(svcRemont, 0, 3));
  await linkContractorService(c1.id, svcElectro.id, catIds(svcElectro, 0, 2));
  await linkContractorService(c2.id, svcElectro.id, catIds(svcElectro, 0, 4));
  await linkContractorService(c3.id, svcDesign.id,  catIds(svcDesign, 0, 3));
  await linkContractorService(c4.id, svcPlumb.id,   catIds(svcPlumb, 0, 3));
  await linkContractorService(c5.id, svcDoors.id,   catIds(svcDoors, 0, 3));
  await linkContractorService(c6.id, svcFloors.id,  catIds(svcFloors, 0, 2));

  // ============ Projects ============
  type ProjData = Omit<Prisma.ProjectUncheckedCreateInput, 'id' | 'categories'> & {
    serviceLinks?: { serviceId: string; categoryIds: string[] }[];
    categoryIds?: string[];
  };
  async function ensureProject(id: string, data: ProjData) {
    const { serviceLinks, categoryIds, ...rest } = data;
    const project = await prisma.project.upsert({
      where: { id },
      create: {
        id,
        ...rest,
        ...(categoryIds ? { categories: { connect: categoryIds.map((cid) => ({ id: cid })) } } : {}),
      },
      update: {
        ...rest,
        ...(categoryIds ? { categories: { set: categoryIds.map((cid) => ({ id: cid })) } } : {}),
      },
    });
    if (serviceLinks) {
      for (const link of serviceLinks) {
        const ps = await prisma.projectService.upsert({
          where: { projectId_serviceId: { projectId: project.id, serviceId: link.serviceId } },
          create: { projectId: project.id, serviceId: link.serviceId },
          update: {},
        });
        for (const categoryId of link.categoryIds) {
          await prisma.projectServiceSelectedCategory.upsert({
            where: { projectServiceId_categoryId: { projectServiceId: ps.id, categoryId } },
            create: { projectServiceId: ps.id, categoryId },
            update: {},
          });
        }
      }
    }
    return project;
  }

  const p1 = await ensureProject('demo-proj-1', {
    clientId: client1.id, cityId: astana.id, status: 'OPEN',
    propertyType: 'APARTMENT', area: 68, budgetEstimated: 3500000,
    title: 'Ремонт 2-комнатной квартиры в новостройке',
    description: 'Квартира 68 кв.м., белая отделка. Нужен полный чистовой ремонт: стяжка, штукатурка, электрика, сантехника, двери, покраска. Обсуждаю сроки и материалы, бюджет гибкий.',
    serviceLinks: [
      { serviceId: svcRemont.id,  categoryIds: catIds(svcRemont, 0, 2) },
      { serviceId: svcElectro.id, categoryIds: catIds(svcElectro, 0, 2) },
    ],
    categoryIds: [...catIds(svcRemont, 0, 2), ...catIds(svcElectro, 0, 2)],
  });

  const p2 = await ensureProject('demo-proj-2', {
    clientId: client2.id, cityId: almaty.id, status: 'IN_TALK',
    propertyType: 'APARTMENT', area: 45, budgetEstimated: 550000,
    title: 'Замена сантехники в санузле',
    description: 'Совмещённый санузел 4 кв.м. Нужно поменять унитаз, раковину, смесители, стояки. Плитка новая — остаётся.',
    serviceLinks: [{ serviceId: svcPlumb.id, categoryIds: catIds(svcPlumb, 2, 4) }],
    categoryIds: catIds(svcPlumb, 2, 4),
  });

  const p3 = await ensureProject('demo-proj-3', {
    clientId: client1.id, cityId: astana.id, status: 'CLOSED',
    propertyType: 'APARTMENT', area: 32, budgetEstimated: 450000,
    responsibleContractorId: c3.id,
    title: 'Дизайн-проект кухни-гостиной',
    description: 'Нужен полный дизайн-проект с визуализацией, подбор материалов, рабочие чертежи. Площадь 32 кв.м., стиль современный.',
    serviceLinks: [{ serviceId: svcDesign.id, categoryIds: catIds(svcDesign, 0, 2) }],
    categoryIds: catIds(svcDesign, 0, 2),
  });

  const p4 = await ensureProject('demo-proj-4', {
    clientId: client3.id, cityId: shymkent.id, status: 'OPEN',
    propertyType: 'HOUSE', area: 110, budgetEstimated: 800000,
    title: 'Установка межкомнатных дверей в частном доме',
    description: '6 дверей: спальни, кухня, ванная. Двери уже куплены, нужен монтаж, регулировка, установка фурнитуры.',
    serviceLinks: [{ serviceId: svcDoors.id, categoryIds: catIds(svcDoors, 0, 2) }],
    categoryIds: catIds(svcDoors, 0, 2),
  });

  const p5 = await ensureProject('demo-proj-5', {
    clientId: client2.id, cityId: almaty.id, status: 'OPEN',
    propertyType: 'OFFICE', area: 120, budgetEstimated: 1200000,
    title: 'Электрика в офисе open-space',
    description: '120 кв.м., 20 рабочих мест. Нужно развести силовую, слаботочку, собрать щит с автоматами, развести освещение.',
    serviceLinks: [{ serviceId: svcElectro.id, categoryIds: catIds(svcElectro, 1, 4) }],
    categoryIds: catIds(svcElectro, 1, 4),
  });

  const p6 = await ensureProject('demo-proj-6', {
    clientId: client3.id, cityId: shymkent.id, status: 'DRAFT',
    propertyType: 'APARTMENT', area: 54, budgetEstimated: 350000,
    title: 'Укладка ламината (черновик)',
    description: '54 кв.м., 2 комнаты. Материал есть, нужен аккуратный мастер.',
    categoryIds: catIds(svcFloors, 0, 1),
  });

  // ============ Attachments (фото-обложки и галереи проектов) ============
  // Публичные Unsplash URL. makeFileUrl() на фронте пропустит их как чужой хост.
  const projectPhotos: Record<string, string[]> = {
    [p1.id]: [
      PH('1628744404730-5e143358539b'), // пустая квартира под отделку
      PH('1600566753190-17f0baa2a6c3'), // светлый интерьер
      PH('1541888946425-d81bb19240f5'), // стройматериалы
    ],
    [p2.id]: [
      PH('1620626011761-996317b8d101'), // ванная комната
      PH('1552321554-5fefe8c9ef14'), // плитка
    ],
    [p3.id]: [
      PH('1600585154340-be6161a56a0c'), // современная кухня
      PH('1556909114-f6e7ad7d3136'), // дизайн-рендер
      PH('1560448204-e02f11c3d0e2'), // гостиная
    ],
    [p4.id]: [
      PH('1558618666-fcd25c85cd64'), // двери
      PH('1558002038-bb4237b54d50'), // деревянная дверь
    ],
    [p5.id]: [
      PH('1497366216548-37526070297c'), // open-space офис
      PH('1497366754035-f200968a6e72'), // офис с техникой
    ],
    [p6.id]: [
      PH('1586105251261-72a756497a11'), // деревянный пол
    ],
  };

  for (const [projectId, urls] of Object.entries(projectPhotos)) {
    const existing = await prisma.attachment.count({ where: { projectId } });
    if (existing > 0) continue;

    const created: { id: string }[] = [];
    for (let i = 0; i < urls.length; i++) {
      const a = await prisma.attachment.create({
        data: {
          projectId,
          url: urls[i],
          mime: 'image/jpeg',
          sortOrder: i,
        },
      });
      created.push(a);
    }

    // первая фотография — обложка проекта
    await prisma.project.update({
      where: { id: projectId },
      data: { coverAttachmentId: created[0].id },
    });

    // до 3 первых фото → в ProjectShowcaseImage (галерея)
    for (let i = 0; i < Math.min(created.length, 3); i++) {
      await prisma.projectShowcaseImage.upsert({
        where: { projectId_position: { projectId, position: i } },
        create: { projectId, attachmentId: created[i].id, position: i },
        update: { attachmentId: created[i].id },
      });
    }
  }

  // ============ Conversations + Messages ============
  type Msg = { senderId: string; text: string; offsetMin: number; read?: boolean };
  async function ensureConversation(projectId: string, clientId: string, contractorId: string, messages: Msg[]) {
    const conv = await prisma.conversation.upsert({
      where: { projectId_clientId_contractorId: { projectId, clientId, contractorId } },
      create: { projectId, clientId, contractorId },
      update: {},
    });
    const existing = await prisma.message.count({ where: { conversationId: conv.id } });
    if (existing > 0) return conv;

    const base = Date.now() - 4 * 60 * 60_000; // диалог начался 4 часа назад
    for (const m of messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: m.senderId,
          text: m.text,
          createdAt: new Date(base + m.offsetMin * 60_000),
          readAt: m.read ? new Date(base + m.offsetMin * 60_000 + 30_000) : null,
        },
      });
    }
    return conv;
  }

  await ensureConversation(p1.id, client1.id, c1.id, [
    { senderId: c1u.id,    text: 'Здравствуйте! Видел ваш проект по ремонту квартиры. Готов приехать на замер в Астану, удобно в субботу?', offsetMin: 0,   read: true },
    { senderId: client1.id, text: 'Здравствуйте, Ерлан. Да, суббота подходит. В 12:00 можно?',                                                offsetMin: 15,  read: true },
    { senderId: c1u.id,    text: 'Отлично, записал. Подскажите, белая отделка сейчас в каком состоянии? Стяжка есть?',                       offsetMin: 30,  read: true },
    { senderId: client1.id, text: 'Стяжка есть, штукатурка стен черновая, потолки без финиша. Электрика разведена частично.',                offsetMin: 45,  read: true },
    { senderId: c1u.id,    text: 'Понял. Подготовлю примерную смету ко вторнику после замера. Ориентир по материалам есть?',                 offsetMin: 80,  read: true },
    { senderId: client1.id, text: 'Бюджет ~3.5 млн. Материалы средне-премиум, ванная и кухня получше.',                                      offsetMin: 120, read: false },
  ]);

  await ensureConversation(p1.id, client1.id, c2.id, [
    { senderId: c2u.id,    text: 'Здравствуйте! По электрике могу взять часть работ. Какой щит планируете?',        offsetMin: 0,  read: true },
    { senderId: client1.id, text: 'Пока не определились. Можете посоветовать?',                                      offsetMin: 20, read: true },
    { senderId: c2u.id,    text: 'Для 68 кв.м. обычно 24-36 модулей. Пришлю типовой вариант.',                      offsetMin: 30, read: true },
    { senderId: c2u.id,    text: 'Вот фото щита, который делал в похожей квартире — 30 модулей, с реле напряжения.', offsetMin: 60, read: false },
  ]);

  await ensureConversation(p2.id, client2.id, c4.id, [
    { senderId: c4u.id,    text: 'Здравствуйте! Готов взять замену сантехники. Модели уже выбрали?',                                                                          offsetMin: 0,   read: true },
    { senderId: client2.id, text: 'Здравствуйте. Роса Комфорт унитаз, смесители Grohe. Плитка новая, не трогать.',                                                             offsetMin: 10,  read: true },
    { senderId: c4u.id,    text: 'Понял. Стояки менять тоже? Если да — нужно согласовать соседей сверху и снизу на отключение воды.',                                         offsetMin: 25,  read: true },
    { senderId: client2.id, text: 'Да, стояки тоже. Согласовал уже, могу на 3 часа в субботу воду перекрыть.',                                                                 offsetMin: 40,  read: true },
    { senderId: c4u.id,    text: 'Отлично. Смета: стояки — 60к, унитаз+монтаж 35к, раковина 25к, смесители 30к, мелочёвка 20к. Итого ~170к работа, материал отдельно.',      offsetMin: 90,  read: true },
    { senderId: client2.id, text: 'Принято. Когда начать сможем?',                                                                                                            offsetMin: 120, read: true },
    { senderId: c4u.id,    text: 'В эту субботу в 9:00 могу приехать. До 18:00 закончим.',                                                                                    offsetMin: 130, read: true },
    { senderId: client2.id, text: 'Договорились!',                                                                                                                            offsetMin: 140, read: false },
  ]);

  await ensureConversation(p3.id, client1.id, c3.id, [
    { senderId: c3u.id,    text: 'Здравствуйте! Меня зовут Асель, дизайнер. Готова сделать проект кухни-гостиной.',                offsetMin: 0,     read: true },
    { senderId: client1.id, text: 'Здравствуйте! Посмотрела ваше портфолио, хотим работать с вами.',                                offsetMin: 20,    read: true },
    { senderId: c3u.id,    text: 'Спасибо! Начнём с ТЗ — расскажите про стиль, бюджет, состав семьи.',                             offsetMin: 40,    read: true },
    { senderId: client1.id, text: 'Стиль современный, светлый. Семья 3 человека, ребёнок 5 лет. Бюджет 450к за проект.',           offsetMin: 50,    read: true },
    { senderId: c3u.id,    text: 'Поняла. Сделаю 2 варианта планировки, потом 3D визуализация выбранного.',                        offsetMin: 120,   read: true },
    { senderId: c3u.id,    text: 'Отправила первые варианты планировки. Посмотрите, когда удобно.',                                offsetMin: 1440,  read: true },
    { senderId: client1.id, text: 'Второй вариант очень понравился! Берём его в работу.',                                          offsetMin: 1500,  read: true },
    { senderId: c3u.id,    text: 'Отлично! Приступаю к 3D. Будет готово через 5 дней.',                                            offsetMin: 1520,  read: true },
    { senderId: c3u.id,    text: 'Готово! Проект сдан, чертежи и спецификации отправила на почту. Спасибо за работу!',             offsetMin: 10000, read: true },
    { senderId: client1.id, text: 'Асель, огромное спасибо! Всё идеально. Оставлю отзыв.',                                         offsetMin: 10020, read: true },
  ]);

  await ensureConversation(p4.id, client3.id, c5.id, [
    { senderId: c5u.id,    text: 'Здравствуйте! По дверям в Шымкенте — могу на этой неделе приехать на замер.', offsetMin: 0,  read: true },
    { senderId: client3.id, text: 'Здравствуйте! Пятница в первой половине дня подойдёт?',                       offsetMin: 20, read: true },
    { senderId: c5u.id,    text: 'Да, в 11:00 буду. Двери уже привезли?',                                        offsetMin: 30, read: false },
  ]);

  await ensureConversation(p5.id, client2.id, c2.id, [
    { senderId: c2u.id, text: 'Здравствуйте! По офису — опыт с open-space есть. Пришлёте план этажа?', offsetMin: 0, read: false },
  ]);

  // ============ Reviews ============
  await prisma.review.upsert({
    where: { userId_contractorId_projectId: { userId: client1.id, contractorId: c3.id, projectId: p3.id } },
    create: {
      userId: client1.id, contractorId: c3.id, projectId: p3.id,
      rating: 5,
      text: 'Асель — профи! Быстро, внятно, учла все пожелания. Дизайн-проект получился практичным и красивым. Рекомендую всем!',
      status: 'PUBLISHED', publishedAt: new Date(),
    },
    update: {
      rating: 5,
      text: 'Асель — профи! Быстро, внятно, учла все пожелания. Дизайн-проект получился практичным и красивым. Рекомендую всем!',
      status: 'PUBLISHED',
    },
  });

  // ============ Favorites ============
  async function favContractor(userId: string, contractorId: string) {
    await prisma.favoriteContractor.upsert({
      where: { uniq_favorite_user_contractor: { userId, contractorId } },
      create: { userId, contractorId },
      update: {},
    });
  }
  async function favProject(userId: string, projectId: string) {
    await prisma.favorite.upsert({
      where: { uniq_favorite_user_project: { userId, projectId } },
      create: { userId, projectId },
      update: {},
    });
  }
  await favContractor(client1.id, c1.id);
  await favContractor(client1.id, c3.id);
  await favContractor(client2.id, c4.id);
  await favProject(c1u.id, p1.id);
  await favProject(c4u.id, p2.id);

  // ============ Subscription (PRO для одного подрядчика) ============
  await prisma.subscription.upsert({
    where: { id: 'demo-sub-c3-pro' },
    create: {
      id: 'demo-sub-c3-pro',
      userId: c3u.id,
      plan: 'PRO',
      startedAt: new Date(Date.now() - 30 * 86_400_000),
      expiresAt: new Date(Date.now() + 335 * 86_400_000),
      isActive: true,
      paymentRef: 'demo-payment-001',
    },
    update: {},
  });

  // ============ Notifications ============
  const notifCount = await prisma.notification.count({
    where: { userId: { in: [c1u.id, c2u.id, c3u.id, client1.id, client2.id] } },
  });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: c1u.id,     type: 'INFO',  status: 'UNREAD',  title: 'Новое сообщение',        message: 'Клиент Айгерим написал по проекту «Ремонт 2-комнатной квартиры»', data: { projectId: p1.id } },
        { userId: c2u.id,     type: 'INFO',  status: 'UNREAD',  title: 'Новый проект',           message: 'Появился проект «Электрика в офисе open-space» в вашем городе',  data: { projectId: p5.id } },
        { userId: c3u.id,     type: 'INFO',  status: 'READ',    title: 'Отзыв опубликован',      message: 'Айгерим оставила отзыв 5★ по проекту дизайна',                    data: { projectId: p3.id }, readAt: new Date() },
        { userId: client1.id, type: 'INFO',  status: 'UNREAD',  title: 'Новый отклик',           message: 'Подрядчик Ерлан Жумагали откликнулся на ваш проект',              data: { projectId: p1.id } },
        { userId: client2.id, type: 'ALERT', status: 'PENDING', title: 'Подтверждение работ',    message: 'Нурлан Ибраев ждёт подтверждения начала работ по проекту санузла', data: { projectId: p2.id, contractorId: c4.id } },
      ],
    });
  }

  // ============ Project status history (для закрытого проекта) ============
  const historyCount = await prisma.projectStatusHistory.count({ where: { projectId: p3.id } });
  if (historyCount === 0) {
    await prisma.projectStatusHistory.createMany({
      data: [
        { projectId: p3.id, from: null,      to: 'OPEN',    changedById: client1.id,                         comment: 'Проект создан' },
        { projectId: p3.id, from: 'OPEN',    to: 'IN_TALK', changedById: client1.id, contractorId: c3.id,    comment: 'Начали обсуждение с дизайнером' },
        { projectId: p3.id, from: 'IN_TALK', to: 'CLOSED',  changedById: client1.id, contractorId: c3.id,    comment: 'Проект успешно завершён' },
      ],
    });
  }

  // ============ Project views ============
  const viewCount = await prisma.projectView.count({
    where: { projectId: { in: [p1.id, p2.id, p5.id] } },
  });
  if (viewCount === 0) {
    await prisma.projectView.createMany({
      data: [
        { projectId: p1.id, userId: c1u.id },
        { projectId: p1.id, userId: c2u.id },
        { projectId: p1.id, userId: c3u.id },
        { projectId: p2.id, userId: c4u.id },
        { projectId: p5.id, userId: c2u.id },
        { projectId: p5.id, userId: c6u.id },
      ],
    });
  }

  console.log('\nDemo seed complete.');
  console.log('Login credentials (password for ALL: ' + PASSWORD + ')');
  console.log('  admin@remo.test       — ADMIN');
  console.log('  client1@remo.test     — CLIENT (Астана)');
  console.log('  client2@remo.test     — CLIENT (Алматы)');
  console.log('  client3@remo.test     — CLIENT (Шымкент)');
  console.log('  contractor1@remo.test — CONTRACTOR @ Альфа Ремонт (Алматы)');
  console.log('  contractor2@remo.test — CONTRACTOR @ Альфа Ремонт (Алматы)');
  console.log('  contractor3@remo.test — CONTRACTOR @ Бета Строй (Астана, PRO)');
  console.log('  contractor4@remo.test — CONTRACTOR @ Бета Строй (Астана)');
  console.log('  contractor5@remo.test — CONTRACTOR (Шымкент, самозанятый)');
  console.log('  contractor6@remo.test — CONTRACTOR (Алматы, самозанятый)');
  console.log('  business1@remo.test   — BUSINESS (владелец Альфа Ремонт)');
  console.log('  business2@remo.test   — BUSINESS (владелец Бета Строй)');
  console.log(`\nCreated: ${[admin, client1, client2, client3, c1u, c2u, c3u, c4u, c5u, c6u, biz1, biz2].length} users, 2 companies, 6 projects, 6 chats`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
