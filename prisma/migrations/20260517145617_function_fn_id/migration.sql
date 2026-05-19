/*
  Warnings:

  - Added the required column `fnId` to the `OrcaFunction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrcaFunction" ADD COLUMN     "fnId" TEXT NOT NULL;
