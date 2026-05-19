-- CreateTable
CREATE TABLE "OrcaFunction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "registered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrcaFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcaJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcaJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrcaJob" ADD CONSTRAINT "OrcaJob_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "OrcaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
