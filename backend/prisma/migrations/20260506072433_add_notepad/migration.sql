-- CreateTable
CREATE TABLE "NoteUnit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteUnit_userId_idx" ON "NoteUnit"("userId");

-- CreateIndex
CREATE INDEX "NoteTopic_unitId_idx" ON "NoteTopic"("unitId");

-- CreateIndex
CREATE INDEX "Note_topicId_idx" ON "Note"("topicId");

-- AddForeignKey
ALTER TABLE "NoteUnit" ADD CONSTRAINT "NoteUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTopic" ADD CONSTRAINT "NoteTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "NoteUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "NoteTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
