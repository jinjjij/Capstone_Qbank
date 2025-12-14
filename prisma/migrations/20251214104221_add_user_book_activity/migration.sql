-- CreateTable
CREATE TABLE "UserBookActivity" (
    "userId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBookActivity_pkey" PRIMARY KEY ("userId","bookId")
);

-- CreateIndex
CREATE INDEX "UserBookActivity_userId_lastAccessedAt_idx" ON "UserBookActivity"("userId", "lastAccessedAt" DESC);

-- CreateIndex
CREATE INDEX "UserBookActivity_bookId_idx" ON "UserBookActivity"("bookId");

-- AddForeignKey
ALTER TABLE "UserBookActivity" ADD CONSTRAINT "UserBookActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookActivity" ADD CONSTRAINT "UserBookActivity_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
