"use client";

import {
  Lightbulb, AlertTriangle, TrendingUp, User, MessageSquare,
  BarChart2, Signal, ThumbsUp, Star, Zap, Target, Eye,
  Heart, Flag, Tag, Bookmark, Bell, Clock, Search, Globe,
} from "lucide-react";

export const ICON_OPTIONS = [
  { name: "lightbulb", Icon: Lightbulb },
  { name: "exclamation-triangle", Icon: AlertTriangle },
  { name: "arrow-trending-up", Icon: TrendingUp },
  { name: "user", Icon: User },
  { name: "chat-bubble-left-right", Icon: MessageSquare },
  { name: "chart-bar", Icon: BarChart2 },
  { name: "signal", Icon: Signal },
  { name: "hand-thumb-up", Icon: ThumbsUp },
  { name: "star", Icon: Star },
  { name: "zap", Icon: Zap },
  { name: "target", Icon: Target },
  { name: "eye", Icon: Eye },
  { name: "heart", Icon: Heart },
  { name: "flag", Icon: Flag },
  { name: "tag", Icon: Tag },
  { name: "bookmark", Icon: Bookmark },
  { name: "bell", Icon: Bell },
  { name: "clock", Icon: Clock },
  { name: "search", Icon: Search },
  { name: "globe", Icon: Globe },
];

export function getIcon(name: string) {
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? Lightbulb;
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {ICON_OPTIONS.map(({ name, Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          title={name}
          className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
            value === name
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
