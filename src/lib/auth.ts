import { db } from "@/infra/database/drizzle/connection";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/infra/database/drizzle/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    `http://localhost:${process.env.PORT || 3000}`,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:5173"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      birthDate: {
        type: "date",
        required: true,
      },
      crm: {
        type: "string",
        required: true,
      },
      cpf: {
        type: "string",
        required: true,
      },
      identityNumber: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "MEDICO",
        input: false,
        returned: true,
      },
    },
  },
});
