"use client";

interface AgentAvatarProps {
  name: string;
  size?: number;
  glow?: boolean;
}

const AGENT_IMAGES: Record<string, { src: string; tint: string }> = {
  Neo: { src: "/agents/neo.png", tint: "rgba(0, 255, 65, 0.12)" },
  Fulcrum: { src: "/agents/fulcrum.png", tint: "rgba(232, 101, 26, 0.12)" },
  Cassian: { src: "/agents/cassian.png", tint: "rgba(74, 123, 204, 0.12)" },
  Chandler: { src: "/agents/chandler.png", tint: "rgba(124, 58, 237, 0.12)" },
  MSE6: { src: "/agents/mse6.svg", tint: "rgba(74, 158, 224, 0.12)" },
};

const GLOW_COLORS: Record<string, string> = {
  Neo: "rgba(0, 255, 65, 0.3)",
  Fulcrum: "rgba(232, 101, 26, 0.3)",
  Cassian: "rgba(74, 123, 204, 0.3)",
  Chandler: "rgba(124, 58, 237, 0.3)",
  MSE6: "rgba(74, 158, 224, 0.3)",
};

const BORDER_COLORS: Record<string, string> = {
  Neo: "rgba(0, 255, 65, 0.4)",
  Fulcrum: "rgba(232, 101, 26, 0.4)",
  Cassian: "rgba(74, 123, 204, 0.4)",
  Chandler: "rgba(124, 58, 237, 0.4)",
  MSE6: "rgba(74, 158, 224, 0.4)",
};

function normalizeAgentKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function AgentAvatar({ name, size = 48, glow = false }: AgentAvatarProps) {
  const key = normalizeAgentKey(name);
  const agent =
    AGENT_IMAGES[name] ||
    AGENT_IMAGES[key] ||
    AGENT_IMAGES[name.toLowerCase()] ||
    AGENT_IMAGES[name.toUpperCase()];

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
        boxShadow: glow ? `0 0 20px ${GLOW_COLORS[name] || GLOW_COLORS[key] || "rgba(255,255,255,0.2)"}` : "none",
        border: `2px solid ${BORDER_COLORS[name] || BORDER_COLORS[key] || "rgba(255,255,255,0.1)"}`,
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
