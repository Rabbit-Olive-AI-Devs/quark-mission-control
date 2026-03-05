"use client";

interface AgentAvatarProps {
  name: string;
  size?: number;
  glow?: boolean;
}

const AGENT_IMAGES: Record<string, { src: string; tint: string }> = {
  Neo: { src: "/agents/neo.jpg", tint: "rgba(0, 255, 65, 0.15)" },
  Fulcrum: { src: "/agents/fulcrum.jpg", tint: "rgba(232, 101, 26, 0.15)" },
  Cassian: { src: "/agents/cassian.jpg", tint: "rgba(74, 123, 204, 0.15)" },
  Chandler: { src: "/agents/chandler.jpg", tint: "rgba(124, 58, 237, 0.15)" },
};

const GLOW_COLORS: Record<string, string> = {
  Neo: "rgba(0, 255, 65, 0.3)",
  Fulcrum: "rgba(232, 101, 26, 0.3)",
  Cassian: "rgba(74, 123, 204, 0.3)",
  Chandler: "rgba(124, 58, 237, 0.3)",
};

const BORDER_COLORS: Record<string, string> = {
  Neo: "rgba(0, 255, 65, 0.4)",
  Fulcrum: "rgba(232, 101, 26, 0.4)",
  Cassian: "rgba(74, 123, 204, 0.4)",
  Chandler: "rgba(124, 58, 237, 0.4)",
};

export function AgentAvatar({ name, size = 48, glow = false }: AgentAvatarProps) {
  const agent = AGENT_IMAGES[name];

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
        boxShadow: glow ? `0 0 20px ${GLOW_COLORS[name]}` : "none",
        border: `2px solid ${BORDER_COLORS[name] || "rgba(255,255,255,0.1)"}`,
      }}
    >
      {/* Character photo */}
      <img
        src={agent.src}
        alt={name}
        className="w-full h-full object-cover"
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
