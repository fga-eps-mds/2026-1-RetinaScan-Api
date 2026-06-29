CREATE TABLE "exam_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"medico_destino_id" text NOT NULL,
	"compartilhado_por" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"expira_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_share" ADD CONSTRAINT "exam_share_exam_id_exame_id_exame_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exame"("id_exame") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_share" ADD CONSTRAINT "exam_share_medico_destino_id_usuario_id_usuario_fk" FOREIGN KEY ("medico_destino_id") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_share" ADD CONSTRAINT "exam_share_compartilhado_por_usuario_id_usuario_fk" FOREIGN KEY ("compartilhado_por") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;