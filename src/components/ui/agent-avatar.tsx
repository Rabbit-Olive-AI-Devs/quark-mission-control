"use client";

interface AgentAvatarProps {
  name: string;
  size?: number;
  glow?: boolean;
}

// Neo — The Matrix: green digital rain aesthetic, dark shades silhouette
function NeoAvatar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Background — dark with matrix green glow */}
      <circle cx="32" cy="32" r="32" fill="#0D1A0D" />
      <circle cx="32" cy="32" r="30" fill="url(#neo-grad)" opacity="0.3" />

      {/* Sunglasses silhouette */}
      <ellipse cx="32" cy="28" rx="16" ry="14" fill="#0A0A0A" />

      {/* Face shape */}
      <path d="M22 22C22 18 26 14 32 14C38 14 42 18 42 22V30C42 36 38 42 32 44C26 42 22 36 22 30V22Z" fill="#1a2e1a" />

      {/* Iconic shades */}
      <rect x="20" y="23" width="10" height="5" rx="1" fill="#00FF41" opacity="0.9" />
      <rect x="34" y="23" width="10" height="5" rx="1" fill="#00FF41" opacity="0.9" />
      <line x1="30" y1="25.5" x2="34" y2="25.5" stroke="#00FF41" strokeWidth="0.8" opacity="0.7" />

      {/* Matrix rain drops */}
      <text x="12" y="52" fill="#00FF41" fontSize="5" opacity="0.4" fontFamily="monospace">01</text>
      <text x="28" y="56" fill="#00FF41" fontSize="4" opacity="0.3" fontFamily="monospace">10</text>
      <text x="44" y="50" fill="#00FF41" fontSize="5" opacity="0.35" fontFamily="monospace">11</text>
      <text x="20" y="60" fill="#00FF41" fontSize="4" opacity="0.25" fontFamily="monospace">0</text>
      <text x="50" y="58" fill="#00FF41" fontSize="3" opacity="0.3" fontFamily="monospace">1</text>

      {/* Collar / coat */}
      <path d="M18 42C20 38 26 36 32 36C38 36 44 38 46 42L50 54C42 50 22 50 14 54L18 42Z" fill="#0A0A0A" />
      <line x1="32" y1="36" x2="32" y2="52" stroke="#1a1a1a" strokeWidth="0.5" />

      <defs>
        <radialGradient id="neo-grad" cx="32" cy="32" r="30">
          <stop offset="0%" stopColor="#00FF41" />
          <stop offset="100%" stopColor="#0D1A0D" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Fulcrum — Ahsoka: orange/white montrals, rebel insignia vibe
function FulcrumAvatar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="#1A0D05" />
      <circle cx="32" cy="32" r="30" fill="url(#fulcrum-grad)" opacity="0.25" />

      {/* Montrals (head-tails) */}
      <path d="M20 18L16 4L24 16Z" fill="#E8651A" />
      <path d="M44 18L48 4L40 16Z" fill="#E8651A" />
      {/* White stripes on montrals */}
      <path d="M18 12L16 6L20 14Z" fill="#F5F5F5" opacity="0.6" />
      <path d="M46 12L48 6L44 14Z" fill="#F5F5F5" opacity="0.6" />

      {/* Face */}
      <path d="M22 20C22 16 26 12 32 12C38 12 42 16 42 20V30C42 36 38 42 32 44C26 42 22 36 22 30V20Z" fill="#E8651A" />

      {/* Face markings — white diamond pattern */}
      <path d="M32 14L34 18L32 22L30 18Z" fill="#F5F5F5" opacity="0.8" />
      <circle cx="27" cy="22" r="1" fill="#F5F5F5" opacity="0.5" />
      <circle cx="37" cy="22" r="1" fill="#F5F5F5" opacity="0.5" />

      {/* Eyes */}
      <ellipse cx="27" cy="26" rx="3" ry="2.5" fill="#1A0D05" />
      <ellipse cx="37" cy="26" rx="3" ry="2.5" fill="#1A0D05" />
      <circle cx="27.5" cy="25.5" r="1" fill="#4FC3F7" />
      <circle cx="37.5" cy="25.5" r="1" fill="#4FC3F7" />

      {/* Fulcrum symbol (simplified rebel-style) */}
      <path d="M28 48L32 42L36 48L32 52Z" fill="#E8651A" opacity="0.6" />
      <line x1="32" y1="44" x2="32" y2="50" stroke="#F5F5F5" strokeWidth="0.5" opacity="0.4" />

      {/* Cloak */}
      <path d="M18 42C20 38 26 36 32 36C38 36 44 38 46 42L50 56C42 52 22 52 14 56L18 42Z" fill="#2A1A0D" />

      <defs>
        <radialGradient id="fulcrum-grad" cx="32" cy="32" r="30">
          <stop offset="0%" stopColor="#E8651A" />
          <stop offset="100%" stopColor="#1A0D05" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Cassian — Andor: blue rebel tones, intelligence operative, star wars rebel insignia
function CassianAvatar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="#0A0D1A" />
      <circle cx="32" cy="32" r="30" fill="url(#cassian-grad)" opacity="0.2" />

      {/* Hair */}
      <path d="M20 22C20 14 25 10 32 10C39 10 44 14 44 22V24H20V22Z" fill="#1A1A2E" />

      {/* Face */}
      <path d="M22 20C22 16 26 13 32 13C38 13 42 16 42 20V30C42 36 38 42 32 44C26 42 22 36 22 30V20Z" fill="#C4956A" />

      {/* Beard shadow */}
      <path d="M24 32C24 32 28 36 32 36C36 36 40 32 40 32V34C40 38 36 42 32 42C28 42 24 38 24 34V32Z" fill="#8B6847" opacity="0.4" />

      {/* Eyes */}
      <ellipse cx="27" cy="25" rx="2.5" ry="2" fill="#0A0D1A" />
      <ellipse cx="37" cy="25" rx="2.5" ry="2" fill="#0A0D1A" />
      <circle cx="27.5" cy="24.5" r="0.8" fill="#6B4C2A" />
      <circle cx="37.5" cy="24.5" r="0.8" fill="#6B4C2A" />

      {/* Rebel parka / jacket */}
      <path d="M16 44C20 38 26 36 32 36C38 36 44 38 48 44L52 58C42 54 22 54 12 58L16 44Z" fill="#1A2744" />
      {/* Jacket collar */}
      <path d="M24 38L28 36L32 38L36 36L40 38L38 42L32 40L26 42Z" fill="#243B66" />
      {/* Rebel insignia on chest */}
      <circle cx="32" cy="48" r="4" fill="none" stroke="#4A7BCC" strokeWidth="0.8" opacity="0.5" />
      <path d="M32 45L34 48L32 51L30 48Z" fill="#4A7BCC" opacity="0.4" />

      <defs>
        <radialGradient id="cassian-grad" cx="32" cy="32" r="30">
          <stop offset="0%" stopColor="#4A7BCC" />
          <stop offset="100%" stopColor="#0A0D1A" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Chandler — Bing: warm purple, casual sweater vest, sarcastic smirk
function ChandlerAvatar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="#120D1A" />
      <circle cx="32" cy="32" r="30" fill="url(#chandler-grad)" opacity="0.2" />

      {/* Hair — the classic 90s parted look */}
      <path d="M19 22C19 12 24 8 32 8C40 8 45 12 45 22V24H19V22Z" fill="#3D2B1A" />
      {/* Part line */}
      <line x1="30" y1="8" x2="28" y2="20" stroke="#2A1E12" strokeWidth="1" />

      {/* Face */}
      <path d="M22 18C22 14 26 11 32 11C38 11 42 14 42 18V30C42 36 38 42 32 44C26 42 22 36 22 30V18Z" fill="#DEB887" />

      {/* Eyes — slightly raised eyebrow for the sarcasm */}
      <ellipse cx="27" cy="24" rx="2.5" ry="2" fill="#120D1A" />
      <ellipse cx="37" cy="24" rx="2.5" ry="2" fill="#120D1A" />
      <circle cx="27.5" cy="23.5" r="0.8" fill="#4A6741" />
      <circle cx="37.5" cy="23.5" r="0.8" fill="#4A6741" />
      {/* Raised left eyebrow */}
      <path d="M24 20C25 19 29 19 30 20" stroke="#3D2B1A" strokeWidth="0.8" fill="none" />
      <path d="M34 21C35 19.5 39 19.5 40 21" stroke="#3D2B1A" strokeWidth="0.8" fill="none" />

      {/* Smirk */}
      <path d="M28 32C30 34 34 34 36 32" stroke="#8B6847" strokeWidth="0.8" fill="none" />
      <path d="M36 32C37 31.5 37.5 32 37 33" stroke="#8B6847" strokeWidth="0.6" fill="none" />

      {/* Sweater vest + collared shirt */}
      <path d="M16 44C20 38 26 36 32 36C38 36 44 38 48 44L52 58C42 54 22 54 12 58L16 44Z" fill="#4A2D6B" />
      {/* Shirt collar poking out */}
      <path d="M26 37L29 35L32 37L35 35L38 37" stroke="#F5F5F5" strokeWidth="1" fill="none" />
      {/* Vest V-pattern */}
      <path d="M32 37L28 50" stroke="#3A2255" strokeWidth="0.6" />
      <path d="M32 37L36 50" stroke="#3A2255" strokeWidth="0.6" />

      <defs>
        <radialGradient id="chandler-grad" cx="32" cy="32" r="30">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#120D1A" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function AgentAvatar({ name, size = 48, glow = false }: AgentAvatarProps) {
  const avatarMap: Record<string, React.ReactNode> = {
    Neo: <NeoAvatar size={size} />,
    Fulcrum: <FulcrumAvatar size={size} />,
    Cassian: <CassianAvatar size={size} />,
    Chandler: <ChandlerAvatar size={size} />,
  };

  const glowColors: Record<string, string> = {
    Neo: "rgba(0, 255, 65, 0.3)",
    Fulcrum: "rgba(232, 101, 26, 0.3)",
    Cassian: "rgba(74, 123, 204, 0.3)",
    Chandler: "rgba(124, 58, 237, 0.3)",
  };

  return (
    <div
      className="rounded-full overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        boxShadow: glow ? `0 0 20px ${glowColors[name] || "rgba(0,212,170,0.2)"}` : "none",
      }}
    >
      {avatarMap[name] || (
        <div
          className="w-full h-full flex items-center justify-center bg-[#7C3AED]/20 text-[#7C3AED] font-bold text-sm"
          style={{ width: size, height: size }}
        >
          {name[0]}
        </div>
      )}
    </div>
  );
}
