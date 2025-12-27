-- AlterEnum
ALTER TYPE "VisitorStatus" ADD VALUE 'MEETING_OVER';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "gateCheckedOutAt" TIMESTAMP(3),
ADD COLUMN     "gateCheckedOutBy" TEXT,
ADD COLUMN     "hostCheckedOutAt" TIMESTAMP(3),
ADD COLUMN     "hostCheckedOutBy" TEXT;
