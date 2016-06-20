interface OS {
  tmpdir(): string;
  hostname(): string;
  type(): string;
  platform(): string;
  arch(): string;
  release(): string;
  uptime(): number;
  loadavg(): number[];
  totalmem(): number;
  freemem(): number;
  cpus(): { model: string; speed: number; times: { user: number; nice: number; sys: number; idle: number; irq?: number; }; }[];
  networkInterfaces(): any;
  EOL: string;
}
