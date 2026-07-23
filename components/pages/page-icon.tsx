"use client";

import {
  FileText, Folder, Star, Heart, Bookmark, Flag, Bell, Calendar, Clock,
  Search, Mail, MessageSquare, User, Users, Settings, Link, Globe,
  Database, Terminal, Code, BarChart2, TrendingUp, Home, Building,
  Briefcase, Rocket, Zap, Flame, Target, Pencil, Check, Clipboard,
  Download, Upload, Share, Map, Phone, Lock, Key, Shield,
  ShoppingCart, Package, Coffee, Gift, Gem, Camera, Image, Video,
  Music, BookOpen, Archive, Tag, List, Hash, Layers, Wrench, Compass,
  type LucideIcon,
  Lightbulb, FilePlus, FolderOpen, Grid2X2, Activity, Award,
  Headphones, Mic, Monitor, Paperclip, PieChart, Send, Truck, Wifi,
  ChevronRight, Pen, Eye, AlertCircle, Info, HelpCircle, Edit,
} from "lucide-react";
import { flagIconCode } from "@/lib/emoji-flags";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  FileText, Folder, FolderOpen, Star, Heart, Bookmark, Flag, Bell,
  Calendar, Clock, Search, Mail, MessageSquare, User, Users, Settings,
  Link, Globe, Database, Terminal, Code, BarChart2, PieChart, TrendingUp,
  Activity, Home, Building, Briefcase, Rocket, Zap, Flame, Target,
  Pencil, Pen, Edit, Check, Clipboard, Download, Upload, Share, Map,
  Phone, Lock, Key, Shield, ShoppingCart, Package, Coffee, Gift, Gem,
  Camera, Image, Video, Music, BookOpen, Archive, Tag, List, Hash,
  Layers, Wrench, Compass, Lightbulb, FilePlus, Grid2X2, Award,
  Headphones, Mic, Monitor, Paperclip, Send, Truck, Wifi,
  ChevronRight, Eye, AlertCircle, Info, HelpCircle,
};

type ParsedIcon =
  | { kind: "emoji"; value: string }
  | { kind: "icon"; name: string; color: string }
  | { kind: "image"; url: string };

export function parseIcon(raw: string | null | undefined): ParsedIcon | null {
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw) as { type?: string; name?: string; color?: string; url?: string };
      if (obj.type === "icon" && obj.name) {
        return { kind: "icon", name: obj.name, color: obj.color ?? "#6b7280" };
      }
      if (obj.type === "image" && obj.url) {
        return { kind: "image", url: obj.url };
      }
    } catch {
      // fall through to emoji
    }
  }
  return { kind: "emoji", value: raw };
}

interface PageIconProps {
  icon: string | null | undefined;
  size?: number;
  className?: string;
}

export function PageIcon({ icon, size = 16, className = "" }: PageIconProps) {
  const parsed = parseIcon(icon);
  if (!parsed) return null;

  if (parsed.kind === "emoji") {
    // Country/region flag emoji don't render on Windows (the system font shows
    // the raw "TM"-style letter pair). Draw them with the flag-icons SVG set —
    // the same one the emoji picker grid uses — so flags display everywhere.
    const flagCode = flagIconCode(parsed.value);
    if (flagCode) {
      return (
        <span
          aria-hidden
          className={`fi fi-${flagCode} fis shrink-0 rounded-[2px] ${className}`}
          style={{ fontSize: size, lineHeight: 1 }}
        />
      );
    }
    return (
      <span
        className={`leading-none select-none ${className}`}
        style={{ fontSize: size, lineHeight: 1 }}
      >
        {parsed.value}
      </span>
    );
  }

  if (parsed.kind === "icon") {
    const Comp = ICON_REGISTRY[parsed.name];
    if (!Comp) return null;
    return (
      <Comp
        size={size}
        color={parsed.color}
        strokeWidth={1.75}
        className={`shrink-0 ${className}`}
      />
    );
  }

  if (parsed.kind === "image") {
    const radius = size >= 40 ? 6 : size >= 20 ? 4 : 2;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={parsed.url}
        alt=""
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return null;
}
