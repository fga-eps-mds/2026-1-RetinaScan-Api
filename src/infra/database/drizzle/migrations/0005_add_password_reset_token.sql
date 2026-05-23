CREATE TABLE "password_reset_token" (
	"id" text PRIMARY KEY NOT NULL,
	"id_usuario" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_id_usuario_usuario_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuario"("id_usuario") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_token_usuario_idx" ON "password_reset_token" USING btree ("id_usuario");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_token_hash_unique" ON "password_reset_token" USING btree ("token_hash");