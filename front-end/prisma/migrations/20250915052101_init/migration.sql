-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "session_id" TEXT,
    "workos_id" TEXT,
    "email" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL,
    "chat_session_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "context_used" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_session_id_key" ON "public"."users"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_workos_id_key" ON "public"."users"("workos_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_updated_at_idx" ON "public"."chat_sessions"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "messages_chat_session_id_id_idx" ON "public"."messages"("chat_session_id", "id");

-- CreateIndex
CREATE INDEX "messages_chat_session_id_created_at_idx" ON "public"."messages"("chat_session_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
