CREATE TABLE "paciente" (
	"id_paciente" uuid PRIMARY KEY NOT NULL,
	"nome_completo" varchar(150) NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"data_nascimento" date NOT NULL,
	"sexo" varchar(20) NOT NULL,
	"num_prontuario" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exame" (
	"id_exame" uuid PRIMARY KEY NOT NULL,
	"id_usuario" text NOT NULL,
	"id_paciente" text NOT NULL,
	"data_hora" timestamp NOT NULL,
	"status" varchar(50) NOT NULL,
	"comorbidades" text,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exame" ADD CONSTRAINT "exame_id_usuario_usuario_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuario"("id_usuario") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exame" ADD CONSTRAINT "exame_id_paciente_paciente_id_paciente_fk" FOREIGN KEY ("id_paciente") REFERENCES "public"."paciente"("id_paciente") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cpf_unique_index" ON "paciente" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "num_prontuario_unique_index" ON "paciente" USING btree ("num_prontuario");