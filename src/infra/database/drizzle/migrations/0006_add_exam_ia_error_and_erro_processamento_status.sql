CREATE TABLE "exam_ia_error" (
	"id_exam_ia_error" uuid PRIMARY KEY NOT NULL,
	"id_exame" uuid NOT NULL,
	"error_message" text NOT NULL,
	"traceback" text,
	"task_id" text,
	"task_name" text,
	"args" jsonb,
	"dt_hora" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exam_ia_error_id_exame_unique" UNIQUE("id_exame")
);
--> statement-breakpoint
ALTER TABLE "exam_ia_error" ADD CONSTRAINT "exam_ia_error_id_exame_exame_id_exame_fk" FOREIGN KEY ("id_exame") REFERENCES "public"."exame"("id_exame") ON DELETE cascade ON UPDATE no action;