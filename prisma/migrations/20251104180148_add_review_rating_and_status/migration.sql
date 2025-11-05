/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `review` table. All the data in the column will be lost.
  - Added the required column `rating` to the `review` table without a default value. This is not possible if the table is not empty.

*/
-- -- DropIndex
-- DROP INDEX `review_projectId_createdAt_idx` ON `review`;
--
-- -- DropIndex
-- DROP INDEX `review_userId_contractorId_projectId_key` ON `review`;
--
-- -- AlterTable
-- -- ALTER TABLE `review` DROP COLUMN `updatedAt`,
-- --     ADD COLUMN `publishedAt` DATETIME(3) NULL,
-- --     ADD COLUMN `rating` INTEGER NOT NULL,
-- --     ADD COLUMN `status` ENUM('PENDING', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
