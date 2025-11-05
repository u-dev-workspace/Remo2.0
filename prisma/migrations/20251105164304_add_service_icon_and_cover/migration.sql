-- AlterTable
ALTER TABLE `Service` ADD COLUMN `icon_url` VARCHAR(191) NULL,
    ADD COLUMN `is_coverser` BOOLEAN NOT NULL DEFAULT false;
