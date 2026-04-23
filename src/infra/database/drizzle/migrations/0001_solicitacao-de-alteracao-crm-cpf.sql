CREATE TYPE "public"."solicitacao_status" AS ENUM('PENDENTE', 'APROVADA', 'REJEITADA');--> statement-breakpoint
CREATE TABLE "solicitacao_cpf_crm" (
	"id" text PRIMARY KEY NOT NULL,
	"id_usuario" text NOT NULL,
	"cpf_novo" text NOT NULL,
	"crm_novo" text NOT NULL,
	"status" "solicitacao_status" DEFAULT 'PENDENTE' NOT NULL,
	"motivo_rejeicao" text,
	"analisado_por" text,
	"analisado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solicitacao_cpf_crm" ADD CONSTRAINT "solicitacao_cpf_crm_id_usuario_usuario_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_cpf_crm" ADD CONSTRAINT "solicitacao_cpf_crm_analisado_por_usuario_id_usuario_fk" FOREIGN KEY ("analisado_por") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solicitacao_usuario_idx" ON "solicitacao_cpf_crm" USING btree ("id_usuario");--> statement-breakpoint
CREATE INDEX "solicitacao_status_idx" ON "solicitacao_cpf_crm" USING btree ("status");--> statement-breakpoint
CREATE INDEX "solicitacao_usuario_status_idx" ON "solicitacao_cpf_crm" USING btree ("id_usuario","status");