import { GitCommit, ArrowRight, Inbox, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { RelativeTime } from "./RelativeTime";
import type { TimelineItem } from "../../types";

interface ActivityItemProps {
  item: TimelineItem;
}

function formatStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "inbox":
      return "Inbox";
    case "backlog":
      return "Backlog";
    case "todo":
      return "To Do";
    case "in_progress":
      return "In Progress";
    case "in_review":
      return "In Review";
    case "done":
      return "Done";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function formatSourceLabel(source: string): string {
  switch (source.toLowerCase()) {
    case "email":
      return "email";
    case "slack":
      return "Slack";
    case "sentry":
      return "Sentry";
    case "public_form":
      return "public report form";
    default:
      return source;
  }
}

export function ActivityItem({ item }: ActivityItemProps) {
  const actorName = item.actor?.full_name || item.actor?.email?.split("@")[0] || "System";

  const renderReceived = () => {
    const channel = formatSourceLabel(item.field || "external");
    const sender = item.new_value && item.new_value !== item.field ? item.new_value : null;
    return (
      <div className="truncate">
        <span className="font-medium text-text">Received via {channel}</span>
        {sender && (
          <span className="text-text-muted">
            {" "}
            from <span className="font-medium text-text">{sender}</span>
          </span>
        )}
      </div>
    );
  };

  const renderDescription = () => {
    switch (item.verb) {
      case "created":
        return <span className="text-text-muted">created this issue</span>;
      case "status_changed":
        return (
          <span className="text-text-muted">
            changed status from{" "}
            <span className="font-medium text-text">{formatStatusLabel(item.old_value)}</span>
            {" to "}
            <span className="font-semibold text-accent">{formatStatusLabel(item.new_value)}</span>
          </span>
        );
      case "priority_changed":
        return (
          <span className="text-text-muted">
            changed priority from{" "}
            <span className="font-medium text-text">{item.old_value || "none"}</span>
            {" to "}
            <span className="font-semibold text-warning">{item.new_value}</span>
          </span>
        );
      case "assigned":
        return (
          <span className="text-text-muted">
            assigned to{" "}
            <span className="font-medium text-text">{item.new_value || "unassigned"}</span>
          </span>
        );
      case "restored":
        return <span className="font-medium text-success">restored this issue</span>;
      default:
        return (
          <span className="text-text-muted">
            {item.verb}{" "}
            {item.field && <span className="font-mono text-[11px] text-accent">{item.field}</span>}
            {item.new_value && (
              <>
                <ArrowRight className="mx-1 inline h-3 w-3" />
                <span className="font-medium text-text">{item.new_value}</span>
              </>
            )}
          </span>
        );
    }
  };

  const getIcon = () => {
    switch (item.verb) {
      case "received":
        return <Inbox className="h-3.5 w-3.5 text-accent" />;
      case "created":
        return <GitCommit className="h-3.5 w-3.5 text-info" />;
      case "status_changed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-accent" />;
      case "assigned":
        return <UserCheck className="h-3.5 w-3.5 text-accent" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-text-muted" />;
    }
  };

  return (
    <div
      className="group flex items-center justify-between gap-2 py-1 text-xs"
      data-testid={`activity-item-${item.id}`}
    >
      <div className="flex items-center gap-2 truncate">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface">
          {getIcon()}
        </span>
        {item.verb === "received" ? (
          renderReceived()
        ) : (
          <div className="truncate">
            <span className="font-semibold text-text">{actorName}</span> {renderDescription()}
          </div>
        )}
      </div>
      <RelativeTime dateString={item.created_at} className="flex-shrink-0" />
    </div>
  );
}
