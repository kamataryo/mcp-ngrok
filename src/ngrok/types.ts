export interface NgrokStatus {
  running: boolean;
  publicUrl: string | null;
  upstream: string | null;
}
