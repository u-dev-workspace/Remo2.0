# CLAUDE.md

## План на сегодня

1. нужно пройтись по всем ручкам,

2. провести аудит где могут выходить ошибки из за ввода не коректных данных

3. сделать юнит тесты для предварительной проверки 

4. рассказать что и где было не предуспотренно

5. составить план по отладке и рефактору кода (при необходимости)




Надо по этому пройтись там ошибки в тестах



 FAIL  src/categories/categories.service.spec.ts         
                                                         
  ● CategoriesService › should be defined

    Nest can't resolve dependencies of the CategoriesService (?). Please make sure that the argument PrismaService at index [0] is available in the RootTestModule context.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       providers: [CategoriesService],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (categories/categories.service.spec.ts:8:35)



 PASS  src/app.controller.spec.ts


 PASS  src/uploads/dto/presign-upload.dto.spec.ts        
                                                         
 PASS  src/company/dto/create-company.dto.spec.ts        
                                                         

 FAIL  src/auth/auth.service.spec.ts                     
                                                         
  ● AuthService › should be defined

    Nest can't resolve dependencies of the AuthService (?, JwtService). Please make sure that the argument PrismaService at index [0] is available in the RootTestModule context.   

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       providers: [AuthService],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (auth/auth.service.spec.ts:8:35)


 PASS  src/notifications/dto/respond-alert.dto.spec.ts   
 FAIL  src/auth/auth.controller.spec.ts
  ● AuthController › should be defined

    Nest can't resolve dependencies of the AuthController (?). Please make sure that the argument AuthService at index [0] is available in the RootTestModule context.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If AuthService is a provider, is it part of the current RootTestModule?
    - If AuthService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing AuthService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       controllers: [AuthController],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadController (../node_modules/@nestjs/core/injector/injector.js:94:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:68:13
          at async Promise.all (index 0)
      at TestingInstanceLoader.createInstancesOfControllers (../node_modules/@nestjs/core/injector/instance-loader.js:67:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:42:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (auth/auth.controller.spec.ts:8:35)

 FAIL  src/projects/projects.service.spec.ts
  ● ProjectsService › should be defined

    Nest can't resolve dependencies of the ProjectsService (?, MinioService). Please make sure that the argument PrismaService at index [0] is available in the RootTestModule conte
xt.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       providers: [ProjectsService],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (projects/projects.service.spec.ts:8:35)

 FAIL  src/conversations/conversations.service.spec.ts
  ● ConversationsService › should be defined

    Nest can't resolve dependencies of the ConversationsService (?, EventEmitter, NotificationsService, MinioService). Please make sure that the argument PrismaService at index [0]
 is available in the RootTestModule context.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       providers: [ConversationsService],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (conversations/conversations.service.spec.ts:8:35)

 PASS  src/auth/dto.spec.ts
 PASS  src/reviews/dto/create-review.dto.spec.ts
 PASS  src/projects/dto/create-project.dto.spec.ts
 FAIL  src/categories/categories.controller.spec.ts      
  ● CategoriesController › should be defined

    Nest can't resolve dependencies of the CategoriesService (?). Please make sure that the argument PrismaService at index [0] is available in the RootTestModule context.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       7 |
       8 |   beforeEach(async () => {
    >  9 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
      10 |       controllers: [CategoriesController],
      11 |       providers: [CategoriesService],
      12 |     }).compile();

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (categories/categories.controller.spec.ts:9:35)

 FAIL  src/conversations/conversations.controller.spec.ts
  ● ConversationsController › should be defined

    Nest can't resolve dependencies of the ConversationsController (?). Please make sure that the argument ConversationsService at index [0] is available in the RootTestModule cont
ext.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If ConversationsService is a provider, is it part of the current RootTestModule?
    - If ConversationsService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing ConversationsService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       6 |
       7 |   beforeEach(async () => {
    >  8 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
       9 |       controllers: [ConversationsController],
      10 |     }).compile();
      11 |

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadController (../node_modules/@nestjs/core/injector/injector.js:94:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:68:13
          at async Promise.all (index 0)
      at TestingInstanceLoader.createInstancesOfControllers (../node_modules/@nestjs/core/injector/instance-loader.js:67:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:42:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (conversations/conversations.controller.spec.ts:8:35)

 FAIL  src/projects/projects.controller.spec.ts          
  ● ProjectsController › should be defined

    Nest can't resolve dependencies of the ProjectsService (?, MinioService). Please make sure that the argument PrismaService at index [0] is available in the RootTestModule conte
xt.

    Potential solutions:
    - Is RootTestModule a valid NestJS module?
    - If PrismaService is a provider, is it part of the current RootTestModule?
    - If PrismaService is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing PrismaService */ ]
      })

    For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors

       7 |
       8 |   beforeEach(async () => {
    >  9 |     const module: TestingModule = await Test.createTestingModule({
         |                                   ^
      10 |       controllers: [ProjectsController],
      11 |       providers: [ProjectsService],
      12 |     }).compile();

      at TestingInjector.lookupComponentInParentModules (../node_modules/@nestjs/core/injector/injector.js:286:19)
      at TestingInjector.resolveComponentWrapper (../node_modules/@nestjs/testing/testing-injector.js:19:45)
      at resolveParam (../node_modules/@nestjs/core/injector/injector.js:140:38)
          at async Promise.all (index 0)
      at TestingInjector.resolveConstructorParams (../node_modules/@nestjs/core/injector/injector.js:169:27)
      at TestingInjector.loadInstance (../node_modules/@nestjs/core/injector/injector.js:75:13)
      at TestingInjector.loadProvider (../node_modules/@nestjs/core/injector/injector.js:103:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:56:13
          at async Promise.all (index 3)
      at TestingInstanceLoader.createInstancesOfProviders (../node_modules/@nestjs/core/injector/instance-loader.js:55:9)
      at ../node_modules/@nestjs/core/injector/instance-loader.js:40:13
          at async Promise.all (index 1)
      at TestingInstanceLoader.createInstances (../node_modules/@nestjs/core/injector/instance-loader.js:39:9)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/core/injector/instance-loader.js:22:13)
      at TestingInstanceLoader.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-instance-loader.js:9:9)
      at TestingModuleBuilder.createInstancesOfDependencies (../node_modules/@nestjs/testing/testing-module.builder.js:118:9)
      at TestingModuleBuilder.compile (../node_modules/@nestjs/testing/testing-module.builder.js:74:9)
      at Object.<anonymous> (projects/projects.controller.spec.ts:9:35)

