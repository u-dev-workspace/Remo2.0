-- AlterTable
ALTER TABLE `Project` ADD COLUMN `area` DOUBLE NULL,
    ADD COLUMN `budgetEstimated` INTEGER NULL,
    ADD COLUMN `propertyType` ENUM('APARTMENT', 'HOUSE', 'OFFICE', 'RETAIL', 'WAREHOUSE', 'OTHER') NULL;

-- CreateIndex
CREATE INDEX `Project_propertyType_idx` ON `Project`(`propertyType`);

-- CreateIndex
CREATE INDEX `Project_area_idx` ON `Project`(`area`);

-- CreateIndex
CREATE INDEX `Project_budgetEstimated_idx` ON `Project`(`budgetEstimated`);
