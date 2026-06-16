CREATE TYPE "public"."inscricao_status" AS ENUM('CONVITE_ENVIADO', 'PENDENTE', 'APROVADA', 'REJEITADA', 'EXPIRADA');--> statement-breakpoint
CREATE TABLE "inscricao_medico" (
	"id_inscricao" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"status" "inscricao_status" DEFAULT 'CONVITE_ENVIADO' NOT NULL,
	"invited_by" text,
	"nome_completo" text,
	"tipo_perfil" "tipo_perfil",
	"cpf" text,
	"crm" text,
	"dt_nascimento" date,
	"encrypted_password" text,
	"submitted_at" timestamp,
	"motivo_rejeicao" text,
	"analisado_por" text,
	"analisado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inscricao_medico" ADD CONSTRAINT "inscricao_medico_invited_by_usuario_id_usuario_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricao_medico" ADD CONSTRAINT "inscricao_medico_analisado_por_usuario_id_usuario_fk" FOREIGN KEY ("analisado_por") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;