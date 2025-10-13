/*
  Warnings:

  - You are about to drop the column `caption` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `checksum` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `isCover` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `objectKey` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `areaM2` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `budgetMax` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `budgetMin` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `placeType` on the `Project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Attachment` DROP FOREIGN KEY `Attachment_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `Project` DROP FOREIGN KEY `Project_clientId_fkey`;

-- DropIndex
DROP INDEX `Attachment_checksum_key` ON `Attachment`;

-- DropIndex
DROP INDEX `Attachment_objectKey_key` ON `Attachment`;

-- DropIndex
DROP INDEX `Project_status_city_idx` ON `Project`;

-- AlterTable
ALTER TABLE `Attachment` DROP COLUMN `caption`,
    DROP COLUMN `checksum`,
    DROP COLUMN `height`,
    DROP COLUMN `isCover`,
    DROP COLUMN `objectKey`,
    DROP COLUMN `sizeBytes`,
    DROP COLUMN `width`;

-- AlterTable
ALTER TABLE `Project` DROP COLUMN `areaM2`,
    DROP COLUMN `budgetMax`,
    DROP COLUMN `budgetMin`,
    DROP COLUMN `placeType`,
    ADD COLUMN `coverAttachmentId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_coverAttachmentId_fkey` FOREIGN KEY (`coverAttachmentId`) REFERENCES `Attachment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
