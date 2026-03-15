"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Globe, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { EngagementData } from "@/lib/parsers/types";
import { getPlatformColor, PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  data: EngagementData;
}

function Gauge({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="mx-auto">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" fill="#F1F5F9" fontSize="14" fontWeight="600">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

export function EngagementScorecards({ data }: Props) {
  const { today, inboundGap, guardrailBlocks } = data;

  const replyColor =
    inboundGap.replyRate >= 0.5 ? "#10B981" : inboundGap.replyRate >= 0.3 ? "#F59E0B" : "#EF4444";

  const activePlatforms = Object.keys(today.byPlatform);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const todayBlocks = guardrailBlocks.filter((b) => b.timestamp.startsWith(todayStr)).length;

  const actionBreakdown = Object.entries(today.byAction)
    .map(([k, v]) => `${v} ${k}${v !== 1 ? "s" : ""}`)
    .join(", ");

  const cards = [
    {
      icon: Heart,
      label: "Actions Today",
      value: String(today.total),
      color: "#00D4AA",
      detail: actionBreakdown || "No actions yet",
    },
    {
      icon: MessageCircle,
      label: "Reply Rate",
      value: null,
      color: replyColor,
      detail: `${inboundGap.totalReplied}/${inboundGap.totalReceived} replied`,
    },
    {
      icon: Globe,
      label: "Platforms Active",
      value: String(activePlatforms.length),
      color: "#00D4AA",
      detail: null,
    },
    {
      icon: ShieldAlert,
      label: "Blocked",
      value: String(todayBlocks),
      color: todayBlocks > 0 ? "#EF4444" : "#94A3B8",
      detail: todayBlocks > 0 ? "guardrail blocks today" : "no blocks",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <card.icon size={14} style={{ color: card.color }} />
              <span className="text-xs text-[#94A3B8]">{card.label}</span>
            </div>

            {card.label === "Reply Rate" ? (
              <Gauge value={inboundGap.replyRate} color={replyColor} />
            ) : card.label === "Platforms Active" ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-[#F1F5F9] mb-2">{card.value}</div>
                <div className="flex justify-center gap-1.5">
                  {["x", "tiktok", "youtube", "instagram", "substack"].map((p) => (
                    <span
                      key={p}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: activePlatforms.includes(p) ? getPlatformColor(p) : "rgba(255,255,255,0.1)",
                      }}
                      title={PLATFORM_LABELS[p]}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            )}

            {card.detail && (
              <p className="text-[10px] text-[#94A3B8] text-center mt-2 truncate">{card.detail}</p>
            )}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
