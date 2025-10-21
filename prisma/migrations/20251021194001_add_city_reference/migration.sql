/*
  Warnings:

  - You are about to drop the column `city` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Contractor` ADD COLUMN `cityId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Project` DROP COLUMN `city`,
    ADD COLUMN `cityId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `city`,
    ADD COLUMN `cityId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `City` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameRu` VARCHAR(191) NOT NULL,
    `nameKk` VARCHAR(191) NULL,
    `nameEn` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `City_slug_key`(`slug`),
    INDEX `City_nameRu_idx`(`nameRu`),
    INDEX `City_nameKk_idx`(`nameKk`),
    INDEX `City_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contractor` ADD CONSTRAINT `Contractor_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
