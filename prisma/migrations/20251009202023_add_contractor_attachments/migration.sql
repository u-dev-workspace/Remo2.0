-- CreateTable
CREATE TABLE `ContractorAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `contractorId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `sizeBytes` INTEGER NULL,
    `caption` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `objectKey` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContractorAttachment_objectKey_key`(`objectKey`),
    UNIQUE INDEX `ContractorAttachment_checksum_key`(`checksum`),
    INDEX `ContractorAttachment_contractorId_sortOrder_idx`(`contractorId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContractorAttachment` ADD CONSTRAINT `ContractorAttachment_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `Contractor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
