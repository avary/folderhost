import moment from "moment";

export const formatUptime = (startTime: string) => {
    const duration = moment.duration(moment().diff(moment(startTime)));
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${String(hours).padStart(2, "0")}h`);
    if (minutes > 0) parts.push(`${String(minutes).padStart(2, "0")}m`);
    parts.push(`${String(seconds).padStart(2, "0")}s`);

    return parts.join(" ");
};