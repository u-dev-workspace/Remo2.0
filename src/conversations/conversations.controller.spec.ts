import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

const mockConversationsService = {
  contact: jest.fn(),
  list: jest.fn(),
  send: jest.fn(),
  start: jest.fn(),
  myConversations: jest.fn(),
  getUnreadCount: jest.fn(),
};

describe('ConversationsController', () => {
  let controller: ConversationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [{ provide: ConversationsService, useValue: mockConversationsService }],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
