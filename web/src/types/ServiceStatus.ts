export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  pid?: number;
  start_time?: string;
  uptime?: number;
  work_dir?: string;
  ram: string;
  ram_bytes?: number;
  ram_usage?: number;
  ram_usage_str?: string;
}