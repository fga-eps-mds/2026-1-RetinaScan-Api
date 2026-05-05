CREATE TABLE "imagem" (
	"id_imagem" uuid PRIMARY KEY NOT NULL,
	"id_exame" uuid NOT NULL,
	"lateralidade_olho" varchar(20) NOT NULL,
	"caminho_img" varchar(255) NOT NULL,
	"qualidade_img" varchar(50) DEFAULT 'Pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imagem" ADD CONSTRAINT "imagem_id_exame_exame_id_exame_fk" FOREIGN KEY ("id_exame") REFERENCES "public"."exame"("id_exame") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "imagem_id_exame_lateralidade_uq" ON "imagem" USING btree ("id_exame","lateralidade_olho");--> statement-breakpoint
CREATE INDEX "imagem_id_exame_idx" ON "imagem" USING btree ("id_exame");