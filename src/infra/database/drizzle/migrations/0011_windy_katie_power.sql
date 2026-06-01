ALTER TYPE "public"."tipo_perfil" ADD VALUE 'ESPECIALISTA';--> statement-breakpoint
ALTER TABLE "usuario" DROP CONSTRAINT "usuario_criado_por_fk";
--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_criado_por_usuario_id_usuario_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id_usuario") ON DELETE set null ON UPDATE no action;