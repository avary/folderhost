export interface Service {
  name: string;
  title: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  pid?: number;
  uptime?: number;
  ram: string;
  ram_bytes?: number;
  ram_usage?: number;
  ram_usage_str?: string;
}