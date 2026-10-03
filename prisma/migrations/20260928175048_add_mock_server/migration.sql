-- CreateTable
CREATE TABLE "MockServer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockEndpoint" (
    "id" TEXT NOT NULL,
    "mockServerId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "REST_METHOD" NOT NULL DEFAULT 'GET',
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "description" TEXT,
    "dataStore" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockServer_prefix_key" ON "MockServer"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "MockEndpoint_mockServerId_path_method_key" ON "MockEndpoint"("mockServerId", "path", "method");

-- AddForeignKey
ALTER TABLE "MockServer" ADD CONSTRAINT "MockServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockEndpoint" ADD CONSTRAINT "MockEndpoint_mockServerId_fkey" FOREIGN KEY ("mockServerId") REFERENCES "MockServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
