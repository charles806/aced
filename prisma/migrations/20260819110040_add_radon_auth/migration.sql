-- CreateTable
CREATE TABLE "RadonUser" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonOneTimeCode" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonOneTimeCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonRefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "device" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonOrg" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonOrgMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonOrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadonOrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadonOrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RadonUser_email_idx" ON "RadonUser"("email");

-- CreateIndex
CREATE INDEX "RadonIdentity_userId_idx" ON "RadonIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RadonIdentity_provider_providerAccountId_key" ON "RadonIdentity"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "RadonOneTimeCode_identifier_purpose_idx" ON "RadonOneTimeCode"("identifier", "purpose");

-- CreateIndex
CREATE INDEX "RadonOneTimeCode_expiresAt_idx" ON "RadonOneTimeCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadonSession_tokenHash_key" ON "RadonSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RadonSession_userId_idx" ON "RadonSession"("userId");

-- CreateIndex
CREATE INDEX "RadonSession_expiresAt_idx" ON "RadonSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadonRefreshToken_tokenHash_key" ON "RadonRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RadonRefreshToken_userId_idx" ON "RadonRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RadonRefreshToken_familyId_idx" ON "RadonRefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RadonRefreshToken_expiresAt_idx" ON "RadonRefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadonApiKey_keyHash_key" ON "RadonApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "RadonApiKey_userId_idx" ON "RadonApiKey"("userId");

-- CreateIndex
CREATE INDEX "RadonApiKey_orgId_idx" ON "RadonApiKey"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "RadonOrg_slug_key" ON "RadonOrg"("slug");

-- CreateIndex
CREATE INDEX "RadonOrgMembership_orgId_idx" ON "RadonOrgMembership"("orgId");

-- CreateIndex
CREATE INDEX "RadonOrgMembership_userId_idx" ON "RadonOrgMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RadonOrgMembership_orgId_userId_key" ON "RadonOrgMembership"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RadonOrgInvite_tokenHash_key" ON "RadonOrgInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "RadonOrgInvite_orgId_idx" ON "RadonOrgInvite"("orgId");
