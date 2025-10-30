-- CreateTable
CREATE TABLE `ProjectShowcaseImage` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `attachmentId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,

    UNIQUE INDEX `ProjectShowcaseImage_projectId_position_key`(`projectId`, `position`),
    UNIQUE INDEX `ProjectShowcaseImage_projectId_attachmentId_key`(`projectId`, `attachmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorShowcaseImage` (
    `id` VARCHAR(191) NOT NULL,
    `contractorId` VARCHAR(191) NOT NULL,
    `attachmentId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,

    UNIQUE INDEX `ContractorShowcaseImage_contractorId_position_key`(`contractorId`, `position`),
    UNIQUE INDEX `ContractorShowcaseImage_contractorId_attachmentId_key`(`contractorId`, `attachmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectShowcaseImage` ADD CONSTRAINT `ProjectShowcaseImage_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectShowcaseImage` ADD CONSTRAINT `ProjectShowcaseImage_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorShowcaseImage` ADD CONSTRAINT `ContractorShowcaseImage_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `Contractor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorShowcaseImage` ADD CONSTRAINT `ContractorShowcaseImage_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
