CREATE TABLE "laudo_especialista" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_exame" uuid NOT NULL,
	"id_especialista" text NOT NULL,
	"texto" text NOT NULL,
	"resultado_ia_valido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "laudo_especialista" ADD CONSTRAINT "laudo_especialista_id_exame_exame_id_exame_fk" FOREIGN KEY ("id_exame") REFERENCES "public"."exame"("id_exame") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laudo_especialista" ADD CONSTRAINT "laudo_especialista_id_especialista_usuario_id_usuario_fk" FOREIGN KEY ("id_especialista") REFERENCES "public"."usuario"("id_usuario") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "laudo_especialista_exam_unique" ON "laudo_especialista" USING btree ("id_exame");