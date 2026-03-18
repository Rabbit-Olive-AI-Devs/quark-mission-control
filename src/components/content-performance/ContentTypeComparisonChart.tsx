import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { panelClass, headingClass } from "./styles";

interface Row {
  contentType: string;
  score: number;
}

interface ContentTypeComparisonChartProps {
  rows: Row[];
}

export function ContentTypeComparisonChart({ rows }: ContentTypeComparisonChartProps) {
  return (
    <div className={panelClass}>
      <h3 className={headingClass}>Content-Type Comparison</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <XAxis dataKey="contentType" stroke="#64748B" fontSize={10} />
            <YAxis stroke="#64748B" fontSize={10} />
            <Tooltip />
            <Bar dataKey="score" fill="#00D4AA" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
