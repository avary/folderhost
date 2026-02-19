  export const formatUptime = (uptime?: number) => {
    if (!uptime) return "-";
    const seconds = Math.floor(uptime / 1_000_000_000);

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (secs || !parts.length) parts.push(`${secs}s`);

    return parts.join(' ');
  };