import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface ChartWidgetProps {
  title: string;
  description?: string;
  type: "area" | "bar" | "line" | "pie" | "donut";
  data: any[];
  xKey: string;
  dataKeys: string[];
  labels?: string[];
  colors?: string[];
  isLoading?: boolean;
  isError?: boolean;
  height?: number;
  valueFormatter?: (value: any) => string;
}

export function ChartWidget({
  title,
  description,
  type,
  data,
  xKey,
  dataKeys,
  labels = [],
  colors = ["hsl(var(--primary))", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"],
  isLoading,
  isError,
  height = 300,
  valueFormatter = (val) => val.toString(),
}: ChartWidgetProps) {
  const hasData = data && data.length > 0;

  // Custom tooltips styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card text-card-foreground p-3 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-1">{label || payload[0].name}</p>
          <div className="space-y-0.5">
            {payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || item.payload.fill || colors[index % colors.length] }}
                  />
                  {labels[index] || item.name}
                </span>
                <span className="font-mono font-bold text-right">
                  {valueFormatter(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
              <BarChart3 className="h-8 w-8 animate-bounce text-primary/45" />
              <span className="text-xs">Generating analytical plots...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-xs font-semibold">Failed to load chart metrics</span>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <BarChart3 className="h-8 w-8 opacity-40" />
              <span className="text-xs font-medium">No transaction records found</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                if (type === "area") {
                  return (
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {dataKeys.map((key, idx) => (
                          <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0.0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                      <XAxis
                        dataKey={xKey}
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={valueFormatter}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {dataKeys.map((key, idx) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill={`url(#color-${key})`}
                          name={labels[idx] || key}
                        />
                      ))}
                      {dataKeys.length > 1 && <Legend className="text-xs" />}
                    </AreaChart>
                  );
                }

                if (type === "bar") {
                  return (
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                      <XAxis
                        dataKey={xKey}
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={valueFormatter}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.15)" }} />
                      {dataKeys.map((key, idx) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={colors[idx % colors.length]}
                          radius={[4, 4, 0, 0]}
                          name={labels[idx] || key}
                        />
                      ))}
                      {dataKeys.length > 1 && <Legend className="text-xs" />}
                    </BarChart>
                  );
                }

                if (type === "line") {
                  return (
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                      <XAxis
                        dataKey={xKey}
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-[10px] fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={valueFormatter}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {dataKeys.map((key, idx) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                          name={labels[idx] || key}
                        />
                      ))}
                      {dataKeys.length > 1 && <Legend className="text-xs" />}
                    </LineChart>
                  );
                }

                if (type === "pie" || type === "donut") {
                  const innerRad = type === "donut" ? "60%" : "0%";
                  return (
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRad}
                        outerRadius="80%"
                        paddingAngle={4}
                        dataKey={dataKeys[0]}
                        nameKey={xKey}
                      >
                        {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        content={({ payload }) => (
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-xs text-muted-foreground mt-4">
                            {payload?.map((entry: any, index: number) => (
                              <div key={`item-${index}`} className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="font-semibold text-foreground">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  );
                }

                return <div />;
              })()}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
