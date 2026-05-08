-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "QuestionMedia" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionMedia" ADD CONSTRAINT "QuestionMedia_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
