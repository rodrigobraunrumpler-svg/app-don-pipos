import { rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import { backupStatusSchema, type BackupStatus } from "../schema/backup";

export const getBackupStatus = (): Promise<BackupStatus> =>
  rpcResult(backupStatusSchema, supabase().rpc("backup_status"));
