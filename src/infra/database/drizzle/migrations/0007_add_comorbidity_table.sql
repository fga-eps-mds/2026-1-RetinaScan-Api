CREATE TABLE "exame_comorbidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_exame" uuid NOT NULL,
	"diabetes" boolean DEFAULT false NOT NULL,
	"diabetes_anos" integer,
	"diabetes_uso_insulina" boolean DEFAULT false NOT NULL,
	"diabetes_controlado" boolean DEFAULT false NOT NULL,
	"hipertensao" boolean DEFAULT false NOT NULL,
	"hipertensao_controlada" boolean DEFAULT false NOT NULL,
	"alta_miopia" boolean DEFAULT false NOT NULL,
	"glaucoma" boolean DEFAULT false NOT NULL,
	"uso_hidroxicloroquina" boolean DEFAULT false NOT NULL,
	"uveite" boolean DEFAULT false NOT NULL,
	"catarata" boolean DEFAULT false NOT NULL,
	"outras_comorbidades" boolean DEFAULT false NOT NULL,
	"outras_comorbidades_descricao" text,
	"qualidade_tecnica_dificuldade" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exame_comorbidades_id_exame_unique" UNIQUE("id_exame")
);
--> statement-breakpoint
ALTER TABLE "exame_comorbidades" ADD CONSTRAINT "exame_comorbidades_id_exame_exame_id_exame_fk" FOREIGN KEY ("id_exame") REFERENCES "public"."exame"("id_exame") ON DELETE cascade ON UPDATE no action;