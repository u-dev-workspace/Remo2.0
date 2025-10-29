-- DropIndex
DROP INDEX `Service_isActive_idx` ON `Service`;

-- DropIndex
DROP INDEX `Service_name_idx` ON `Service`;

-- CreateTable
CREATE TABLE `ContractorService` (
    `id` VARCHAR(191) NOT NULL,
    `contractorId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractorService_contractorId_idx`(`contractorId`),
    INDEX `ContractorService_serviceId_idx`(`serviceId`),
    UNIQUE INDEX `ContractorService_contractorId_serviceId_key`(`contractorId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorServiceSelectedCategory` (
    `contractorServiceId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `ContractorServiceSelectedCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`contractorServiceId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectService` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectService_projectId_idx`(`projectId`),
    INDEX `ProjectService_serviceId_idx`(`serviceId`),
    UNIQUE INDEX `ProjectService_projectId_serviceId_key`(`projectId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectServiceSelectedCategory` (
    `projectServiceId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `ProjectServiceSelectedCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`projectServiceId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContractorService` ADD CONSTRAINT `ContractorService_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `Contractor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorService` ADD CONSTRAINT `ContractorService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorServiceSelectedCategory` ADD CONSTRAINT `ContractorServiceSelectedCategory_contractorServiceId_fkey` FOREIGN KEY (`contractorServiceId`) REFERENCES `ContractorService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorServiceSelectedCategory` ADD CONSTRAINT `ContractorServiceSelectedCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectService` ADD CONSTRAINT `ProjectService_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectService` ADD CONSTRAINT `ProjectService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectServiceSelectedCategory` ADD CONSTRAINT `ProjectServiceSelectedCategory_projectServiceId_fkey` FOREIGN KEY (`projectServiceId`) REFERENCES `ProjectService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectServiceSelectedCategory` ADD CONSTRAINT `ProjectServiceSelectedCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Contractor` RENAME INDEX `Contractor_cityId_fkey` TO `Contractor_cityId_idx`;
