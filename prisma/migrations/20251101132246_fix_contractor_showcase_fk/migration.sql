/*
  Warnings:

  - A unique constraint covering the columns `[contractorId,contractorAttachmentId]` on the table `ContractorShowcaseImage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contractorAttachmentId` to the `ContractorShowcaseImage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ContractorShowcaseImage` DROP FOREIGN KEY `ContractorShowcaseImage_attachmentId_fkey`;

-- DropIndex
DROP INDEX `ContractorShowcaseImage_contractorId_attachmentId_key` ON `ContractorShowcaseImage`;

-- AlterTable
ALTER TABLE `ContractorShowcaseImage` ADD COLUMN `contractorAttachmentId` VARCHAR(191) NOT NULL,
    MODIFY `attachmentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ContractorShowcaseImage_contractorId_contractorAttachmentId_key` ON `ContractorShowcaseImage`(`contractorId`, `contractorAttachmentId`);

-- AddForeignKey
ALTER TABLE `ContractorShowcaseImage` ADD CONSTRAINT `ContractorShowcaseImage_contractorAttachmentId_fkey` FOREIGN KEY (`contractorAttachmentId`) REFERENCES `ContractorAttachment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractorShowcaseImage` ADD CONSTRAINT `ContractorShowcaseImage_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
