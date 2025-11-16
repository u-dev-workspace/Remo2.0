-- DropIndex
-- DROP INDEX `review_contractorId_createdAt_idx` ON `Review`;

-- DropIndex
-- DROP INDEX `uniq_review_user_contractor_project` ON `Review`;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `responsibleContractorId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ProjectStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `from` ENUM('OPEN', 'IN_TALK', 'CLOSED', 'ARCHIVED') NULL,
    `to` ENUM('OPEN', 'IN_TALK', 'CLOSED', 'ARCHIVED') NOT NULL,
    `changedById` VARCHAR(191) NULL,
    `contractorId` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectStatusHistory_projectId_idx`(`projectId`),
    INDEX `ProjectStatusHistory_changedById_idx`(`changedById`),
    INDEX `ProjectStatusHistory_contractorId_idx`(`contractorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_responsibleContractorId_fkey` FOREIGN KEY (`responsibleContractorId`) REFERENCES `Contractor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectStatusHistory` ADD CONSTRAINT `ProjectStatusHistory_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectStatusHistory` ADD CONSTRAINT `ProjectStatusHistory_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectStatusHistory` ADD CONSTRAINT `ProjectStatusHistory_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `Contractor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
