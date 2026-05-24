CREATE TABLE "notificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"dados" jsonb,
	"chave_dedupe" text NOT NULL,
	"lida_em" timestamp,
	"enviada_em_tempo_real_em" timestamp,
	"enviada_por_email_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_usuario_id_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacoes_usuario_id_idx" ON "notificacao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "notificacoes_tipo_idx" ON "notificacao" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "notificacoes_created_at_idx" ON "notificacao" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notificacoes_lida_em_idx" ON "notificacao" USING btree ("lida_em");--> statement-breakpoint
CREATE UNIQUE INDEX "notificacoes_chave_dedupe_uidx" ON "notificacao" USING btree ("chave_dedupe");