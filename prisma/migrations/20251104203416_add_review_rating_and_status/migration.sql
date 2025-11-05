/*
  Warnings:

  - You are about to drop the `review` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_contractorId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_userId_fkey`;

-- DropTable
DROP TABLE `review`;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `contractorId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `status` ENUM('PENDING', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedAt` DATETIME(3) NULL,

    INDEX `review_contractorId_createdAt_idx`(`contractorId`, `createdAt`),
    UNIQUE INDEX `uniq_review_user_contractor_project`(`userId`, `contractorId`, `projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `Contractor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
