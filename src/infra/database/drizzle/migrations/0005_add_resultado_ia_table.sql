CREATE TABLE "resultado_ia" (
	"id_resultado_ia" uuid PRIMARY KEY NOT NULL,
	"id_imagem" uuid NOT NULL,
	"predicted_class" integer NOT NULL,
	"predicted_label" varchar(50) NOT NULL,
	"confidence" real NOT NULL,
	"probabilities" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resultado_ia_id_imagem_unique" UNIQUE("id_imagem")
);
--> statement-breakpoint
ALTER TABLE "resultado_ia" ADD CONSTRAINT "resultado_ia_id_imagem_imagem_id_imagem_fk" FOREIGN KEY ("id_imagem") REFERENCES "public"."imagem"("id_imagem") ON DELETE cascade ON UPDATE no action;