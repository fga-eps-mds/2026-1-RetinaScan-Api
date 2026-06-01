CREATE TABLE "audit_log" (
	"id_log" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"actor_user_id" text,
	"actor_name" varchar(255),
	"actor_email" varchar(255),
	"target_entity_type" varchar(100),
	"target_entity_id" text,
	"target_display" varchar(255),
	"ip_address" varchar(64),
	"user_agent" text,
	"request_id" varchar(100),
	"changes_json" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_usuario_id_usuario_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_category_idx" ON "audit_log" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_entity_type","target_entity_id");