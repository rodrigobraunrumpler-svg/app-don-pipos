import { z } from "zod";

// Lo único que la app sabe de las copias de seguridad (backup_status): cuándo terminó la última buena y si está
// atrasada (ninguna, o más de 26 horas)
export const backupStatusSchema = z.object({
  lastBackupAt: z
    .string()
    .transform((text) => new Date(text))
    .nullable(),
  late: z.boolean(),
});

export type BackupStatus = z.infer<typeof backupStatusSchema>;
