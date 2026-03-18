import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { panelClass, headingClass } from "./styles";

export interface EvolutionRow {
  dayKey: string;
  publishes: number;
  totalEngagements: number;
  engagementPerPost: number;
  rolling7d: number;
}

interface EvolutionChartsProps {
  rows: EvolutionRow[];
}

export function EvolutionCharts({ rows }: EvolutionChartsProps) {
  return (
    <div className={panelClass}>
      <h3 className={headingClass}>Evolution</h3>
      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <XAxis dataKey="dayKey" stroke="#64748B" fontSize={10} />
            <YAxis stroke="#64748B" fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey="publishes" stroke="#00D4AA" dot={false} />
            <Line type="monotone" dataKey="totalEngagements" stroke="#7C3AED" dot={false} />
            <Line type="monotone" dataKey="engagementPerPost" stroke="#F59E0B" dot={false} />
            <Line type="monotone" dataKey="rolling7d" stroke="#38BDF8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
