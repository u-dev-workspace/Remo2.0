/*
  Warnings:

  - A unique constraint covering the columns `[objectKey]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checksum]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `objectKey` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Attachment_projectId_idx";

-- AlterTable
ALTER TABLE "public"."Attachment" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "objectKey" TEXT NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "public"."Attachment"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_checksum_key" ON "public"."Attachment"("checksum");

-- CreateIndex
CREATE INDEX "Attachment_projectId_sortOrder_idx" ON "public"."Attachment"("projectId", "sortOrder");
