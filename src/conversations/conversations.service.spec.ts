import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { MinioService } from '../minio/minio.service';

const mockPrisma = {
  conversation: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  message: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  chat: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

const mockEventEmitter = { emit: jest.fn() };
const mockNotifications = { create: jest.fn(), notifyUser: jest.fn() };
const mockMinio = { putObject: jest.fn(), getObject: jest.fn(), removeObject: jest.fn() };

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
