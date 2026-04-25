CREATE TYPE "public"."solicitacao_status" AS ENUM('PENDENTE', 'APROVADA', 'REJEITADA');--> statement-breakpoint
CREATE TYPE "public"."status_usuario" AS ENUM('ATIVO', 'INATIVO', 'BLOQUEADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_perfil" AS ENUM('ADMIN', 'MEDICO');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "solicitacao_cpf_crm" (
	"id" text PRIMARY KEY NOT NULL,
	"id_usuario" text NOT NULL,
	"cpf_novo" text,
	"crm_novo" text,
	"status" "solicitacao_status" DEFAULT 'PENDENTE' NOT NULL,
	"motivo_rejeicao" text,
	"analisado_por" text,
	"analisado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id_usuario" text PRIMARY KEY NOT NULL,
	"nome_completo" text NOT NULL,
	"cpf" text NOT NULL,
	"dt_nascimento" date,
	"crm" text NOT NULL,
	"email" text NOT NULL,
	"tipo_perfil" "tipo_perfil" DEFAULT 'MEDICO' NOT NULL,
	"status" "status_usuario" DEFAULT 'ATIVO' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exame" (
	"id_exame" uuid PRIMARY KEY NOT NULL,
	"id_usuario" text NOT NULL,
	"nome_completo" varchar(150) NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"data_nascimento" text NOT NULL,
	"sexo" varchar(20) NOT NULL,
	"data_hora" timestamp NOT NULL,
	"status" varchar(50) NOT NULL,
	"comorbidades" text,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_usuario_id_usuario_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_usuario_id_usuario_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_cpf_crm" ADD CONSTRAINT "solicitacao_cpf_crm_id_usuario_usuario_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_cpf_crm" ADD CONSTRAINT "solicitacao_cpf_crm_analisado_por_usuario_id_usuario_fk" FOREIGN KEY ("analisado_por") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exame" ADD CONSTRAINT "exame_id_usuario_usuario_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuario"("id_usuario") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "solicitacao_usuario_idx" ON "solicitacao_cpf_crm" USING btree ("id_usuario");--> statement-breakpoint
CREATE INDEX "solicitacao_status_idx" ON "solicitacao_cpf_crm" USING btree ("status");--> statement-breakpoint
CREATE INDEX "solicitacao_usuario_status_idx" ON "solicitacao_cpf_crm" USING btree ("id_usuario","status");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_email_unique" ON "usuario" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_cpf_unique" ON "usuario" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_crm_unique" ON "usuario" USING btree ("crm");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");