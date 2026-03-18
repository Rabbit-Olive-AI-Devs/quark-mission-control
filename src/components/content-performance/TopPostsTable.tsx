import { panelClass, headingClass, subtextClass } from "./styles";

interface RawMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number | null;
}

interface TopPostRow {
  id: string;
  platform: string;
  normalizedScore: number;
  rawMetrics: RawMetrics;
}

interface TopPostsTableProps {
  rows: TopPostRow[];
}

export function TopPostsTable({ rows }: TopPostsTableProps) {
  return (
    <div className={panelClass}>
      <h3 className={headingClass}>Top Posts</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[#F1F5F9]">
              <th className="py-2 pr-2">Post</th>
              <th className="py-2 pr-2">Platform</th>
              <th className="py-2 pr-2">Score</th>
              <th className="py-2">Native metrics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 text-[#94A3B8]">
                <td className="py-2 pr-2">{row.id}</td>
                <td className="py-2 pr-2 uppercase">{row.platform}</td>
                <td className="py-2 pr-2 text-[#F1F5F9]">{row.normalizedScore.toFixed(2)}</td>
                <td className="py-2">
                  <span className={subtextClass}>
                    likes: {row.rawMetrics.likes ?? 0} · comments: {row.rawMetrics.comments ?? 0} · shares: {row.rawMetrics.shares ?? 0} · views: {row.rawMetrics.views ?? 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
