import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdPlayArrow, MdStop, MdRefresh, MdMemory,
  MdCheckCircle, MdError, MdSchedule, MdTerminal, MdSend
} from "react-icons/md";
import { FaServer, FaClock, FaArrowLeft } from "react-icons/fa";
import axiosInstance from '../../utils/axiosInstance';
import MessageBox from "../../components/minimal/MessageBox/MessageBox";
import { parseAnsi } from "../../utils/ansiExcapeCodeParser";
import { type ServiceStatus } from "../../types/ServiceStatus";
import { type ServicePermissions } from "../../types/ServicePermissions";
import useWebSocket from '../../utils/useWebSocket.js';
import { type ServiceWSLog } from "../../types/ServiceWSLog";
import convertToBytes from "../../utils/convertToBytes";
import { formatUptime } from "../../utils/formatUptime";

const ServiceManager: React.FC = () => {
  const { service: serviceName } = useParams<{ service: string }>();
  const navigate = useNavigate();
  const terminalRef = useRef<HTMLDivElement>(null);

  const [service, setService] = useState<ServiceStatus | null>(null);
  const [permissions, setPermissions] = useState<ServicePermissions | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [command, setCommand] = useState("");
  const [uptimeString, setUptimeString] = useState("");
  const [shouldConnect, setShouldConnect] = useState<boolean>(false);
  const lastProcessedIndex = useRef<number>(0);

  const {
    isConnectedRef,
    messages,
  } = useWebSocket("/", shouldConnect, serviceName);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!service?.start_time || service.status !== "running") {
      setUptimeString("Not working");
      return;
    }

    const st: string = service.start_time

    setUptimeString(formatUptime(st));
    const uptimeInterval = setInterval(() => {setUptimeString(formatUptime(st))}, 1000);
    return () => clearInterval(uptimeInterval);
  }, [service?.start_time, service?.status]);

  useEffect(() => {
    if (!isConnectedRef.current || messages.length === 0) return;

    const newMessages = messages.slice(lastProcessedIndex.current);
    lastProcessedIndex.current = messages.length;

    const newLogs: string[] = [];
    for (const raw of newMessages) {
        try {
            const message: ServiceWSLog = JSON.parse(raw ?? "");
            if (message.type === "new-log") {
                newLogs.push(message.data);
            }
        } catch (err) {
            console.warn("Failed to parse WebSocket message:", raw);
        }
    }

    if (newLogs.length > 0) {
        setLogs((old) => [...old, ...newLogs]);
    }
}, [messages]);

  const fetchServiceData = useCallback(async () => {
    if (!serviceName) return;

    try {
      const decodedName = decodeURIComponent(serviceName);

      const statusRes = await axiosInstance.get(`/services/${decodedName}`);
      setService(statusRes.data.service);
      setShouldConnect(true);

      if (!permissions) {
        const permRes = await axiosInstance.get(`/services/${decodedName}/permissions`);
        setPermissions(permRes.data.permissions);

        if (permRes.data.permissions.read_logs && logs.length === 0) {
          const logsRes = await axiosInstance.get(`/services/logs/${decodedName}`);
          setLogs(logsRes.data.logs || []);
        }
      }

      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("You don't have permission to view this service");
      } else {
        setError(err.response?.data?.err || "Failed to load service data");
      }
    } finally {
      setLoading(false);
    }
  }, [serviceName, permissions, logs.length]);

  useEffect(() => {
    document.title = serviceName
      ? `${decodeURIComponent(serviceName)} - folderhost`
      : "Service - folderhost";

    fetchServiceData();

    const interval = setInterval(fetchServiceData, 5000);
    return () => clearInterval(interval);
  }, [serviceName, fetchServiceData]);

  const handleAction = async (action: "start" | "stop") => {
    if (!serviceName || !permissions) return;

    const decodedName = decodeURIComponent(serviceName);

    if (action === "start" && !permissions.start) {
      setError("You don't have permission to start this service");
      return;
    }
    if (action === "stop" && !permissions.stop) {
      setError("You don't have permission to stop this service");
      return;
    }

    setActionLoading(true);

    try {
      if (action === "start") {
        await axiosInstance.put(`/services/${decodedName}/start`);
      } else {
        await axiosInstance.put(`/services/${decodedName}/stop`);
      }

      setService(prev => prev ? {
        ...prev,
        status: action === "stop" ? "stopping" : "starting"
      } : null);

      setTimeout(fetchServiceData, 1000);
    } catch (err: any) {
      setError(err.response?.data?.err || `Failed to ${action} service`);
    } finally {
      setActionLoading(false);
    }
  };

  const sendCommand = async () => {
    if (!serviceName || !command.trim() || !permissions?.execute_commands) return;

    const decodedName = decodeURIComponent(serviceName);

    try {
      await axiosInstance.post("/services/send-command", {
        service: decodedName,
        command: command.trim()
      });

      setCommand("");
    } catch (err: any) {
      setError(err.response?.data?.err || "Failed to send command");
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading service...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FaServer size={48} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Service Not Found</h2>
          <button
            onClick={() => navigate("/services")}
            className="text-sky-400 hover:text-sky-300"
          >
            Return to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-900">
      <MessageBox message={error || message} isErr={!!error} setMessage={setMessage} />

      <main className="mt-10">
        <div className="flex flex-col items-center px-6">
          <section className="flex flex-col bg-gray-800 gap-6 w-4/5 max-w-[1200px] p-6 min-w-[400px] min-h-[600px] shadow-2xl rounded-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/services")}
                  className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-sky-400 transition-colors"
                  title="Back to Services"
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
                <div className={`p-3 rounded-lg ${getStatusColor(service.status)} bg-opacity-60`}>
                  {getStatusIcon(service.status)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{service.name}</h1>
                  <p className="text-gray-400">Service</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {permissions?.start && (
                  <button
                    onClick={() => handleAction("start")}
                    disabled={service.status === 'running' || service.status === 'starting' || actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/50 text-emerald-400 rounded-lg hover:bg-emerald-600/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-emerald-500/50"
                    title="Start"
                  >
                    <MdPlayArrow className="w-5 h-5" />
                    <span>Start</span>
                  </button>
                )}
                {permissions?.stop && (
                  <button
                    onClick={() => handleAction("stop")}
                    disabled={service.status === 'stopped' || service.status === 'stopping' || actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600/50 text-rose-400 rounded-lg hover:bg-rose-600/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-rose-500/50"
                    title="Stop"
                  >
                    <MdStop className="w-5 h-5" />
                    <span>Stop</span>
                  </button>
                )}
                <button
                  onClick={fetchServiceData}
                  disabled={actionLoading}
                  className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-sky-400 transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <MdRefresh className={`w-5 h-5 ${actionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Service Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${service.status === 'running' ? 'bg-emerald-500' :
                    service.status === 'stopped' ? 'bg-rose-500' :
                      'bg-amber-500'
                    }`} />
                  <span className="text-white font-medium capitalize">{service.status}</span>
                  {service.pid && (
                    <span className="text-xs text-gray-500 ml-2">PID: {service.pid}</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Uptime</div>
                <div className="flex items-center gap-2 text-white">
                  <FaClock className="text-gray-400" />
                  <span>{uptimeString}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Memory Usage</div>
                <div className="flex items-center gap-2 text-white">
                  <MdMemory className="text-gray-400" />
                  <span>{service.ram_usage_str || '0 B'} / {convertToBytes(service.ram) > 0 ? service.ram : "Unlimited"}</span>
                </div>
                {service.ram_bytes && service.ram_usage && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all duration-500"
                        style={{ width: `${(service.ram_usage / service.ram_bytes) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {service.work_dir && (
              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400">Working Directory</div>
                <div className="text-gray-300 font-mono text-sm truncate">{service.work_dir}</div>
              </div>
            )}

            <hr className="border-gray-600" />

            {/* Terminal */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <MdTerminal className="text-gray-400" />
                <h2 className="text-lg font-semibold text-white">Terminal</h2>
              </div>

              {/* Logs */}
              <div
                ref={terminalRef}
                className="flex-1 bg-gray-950 rounded-lg p-4 font-mono text-sm overflow-y-auto min-h-[300px] max-h-[400px]"
              >
                {permissions?.read_logs ? (
                  logs.length > 0 ? (
                    logs.map((log, index) => (
                      <div key={`${index}-${log.substring(0, 20)}`} className="py-0.5 border-b border-gray-800/50 last:border-0 font-sans">
                        <span className="text-gray-500 mr-2 select-none">{`>`}</span>
                        {parseAnsi(log)}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      No logs available
                    </div>
                  )
                ) : (
                  <div className="text-rose-500 text-center py-8">
                    You don't have permission to view logs
                  </div>
                )}
              </div>

              {/* Command Input */}
              {permissions?.execute_commands && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                    placeholder="Enter command..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
                    disabled={service.status !== 'running'}
                  />
                  <button
                    onClick={sendCommand}
                    disabled={!command.trim() || service.status !== 'running'}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600/20 text-sky-400 rounded-lg hover:bg-sky-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-sky-500/50"
                  >
                    <MdSend className="w-5 h-5" />
                    <span>Send</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ServiceManager;