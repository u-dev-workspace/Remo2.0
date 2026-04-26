import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { MetricsService } from '../common/metrics/metrics.service';

const mockPrisma = {
  project: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  attachment: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
};

const mockMinio = { putObject: jest.fn(), getObject: jest.fn(), removeObject: jest.fn() };

const mockMetrics = {
  projectsCreatedTotal: { inc: jest.fn() },
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
