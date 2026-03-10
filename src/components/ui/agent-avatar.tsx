"use client";

interface AgentAvatarProps {
  name: string;
  size?: number;
  glow?: boolean;
}

// Use lowercase keys for consistent lookup regardless of input casing
const AGENT_IMAGES: Record<string, { src: string; tint: string }> = {
  neo: { src: "/agents/neo.png", tint: "rgba(0, 255, 65, 0.12)" },
  fulcrum: { src: "/agents/fulcrum.png", tint: "rgba(232, 101, 26, 0.12)" },
  cassian: { src: "/agents/cassian.png", tint: "rgba(74, 123, 204, 0.12)" },
  chandler: { src: "/agents/chandler.png", tint: "rgba(124, 58, 237, 0.12)" },
  mse6: { src: "/agents/mse6.jpg", tint: "rgba(74, 158, 224, 0.12)" },
};

const GLOW_COLORS: Record<string, string> = {
  neo: "rgba(0, 255, 65, 0.3)",
  fulcrum: "rgba(232, 101, 26, 0.3)",
  cassian: "rgba(74, 123, 204, 0.3)",
  chandler: "rgba(124, 58, 237, 0.3)",
  mse6: "rgba(74, 158, 224, 0.3)",
};

const BORDER_COLORS: Record<string, string> = {
  neo: "rgba(0, 255, 65, 0.4)",
  fulcrum: "rgba(232, 101, 26, 0.4)",
  cassian: "rgba(74, 123, 204, 0.4)",
  chandler: "rgba(124, 58, 237, 0.4)",
  mse6: "rgba(74, 158, 224, 0.4)",
};

function normalizeAgentKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function AgentAvatar({ name, size = 48, glow = false }: AgentAvatarProps) {
  const key = normalizeAgentKey(name);
  const agent = AGENT_IMAGES[key];

  if (!agent) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#7C3AED]/20 text-[#7C3AED] font-bold text-sm"
        style={{ width: size, height: size }}
      >
        {name[0]}
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden shrink-0 relative"
      style={{
        width: size,
        height: size,
        boxShadow: glow ? `0 0 20px ${GLOW_COLORS[key] || "rgba(255,255,255,0.2)"}` : "none",
        border: `2px solid ${BORDER_COLORS[key] || "rgba(255,255,255,0.1)"}`,
      }}
    >
      {/* Character photo */}
      <img
        src={agent.src}
        alt={name}
        className="w-full h-full object-cover object-top"
        style={{ filter: "saturate(0.7) brightness(0.9)" }}
      />
      {/* Color tint overlay */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: agent.tint, mixBlendMode: "color" }}
      />
    </div>
  );
}
