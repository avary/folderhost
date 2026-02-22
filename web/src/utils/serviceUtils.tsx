import { MdCheckCircle, MdStop, MdSchedule, MdError } from "react-icons/md";
import convertToBytes from "./convertToBytes";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return 'bg-emerald-500';
    case 'stopped': return 'bg-rose-500';
    case 'starting':
    case 'stopping':
      return 'bg-amber-500';
    default: return 'text-slate-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running': return <MdCheckCircle className="w-6 h-6" />;
    case 'stopped': return <MdStop className="w-6 h-6" />;
    case 'starting':
    case 'stopping':
      return <MdSchedule className="w-6 h-6 animate-spin" />;
    default: return <MdError className="w-6 h-6" />;
  }
};

const formatRam = (service: { ram_usage_str?: string; ram?: string }): string => {
  const usage = service.ram_usage_str || '0 B';
  const limit = convertToBytes(service.ram || '0') > 0 ? service.ram : "Unlimited";
  return `${usage} / ${limit}`;
};

export {getStatusColor, getStatusIcon, formatRam}