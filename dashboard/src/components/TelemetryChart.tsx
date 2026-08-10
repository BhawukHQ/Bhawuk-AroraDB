import React, { memo } from 'react';
import { ResponsiveContainer, AreaChart, XAxis, Tooltip, Area } from 'recharts';

interface ChartDataPoint {
  time: string;
  ops: number;
  mem: number;
}

interface Props {
  chartData: ChartDataPoint[];
  metricsTimeframe: '1m' | '5m' | '15m';
  setMetricsTimeframe: (tf: '1m' | '5m' | '15m') => void;
  readRate?: number;
  writeRate?: number;
}

const TelemetryChart: React.FC<Props> = ({ chartData, metricsTimeframe, setMetricsTimeframe, readRate, writeRate }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-panel" style={{ marginBottom: 0 }}>
        <div className="panel-header">
          <h3>Telemetry Charts</h3>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${metricsTimeframe === '1m' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetricsTimeframe('1m')}
            >1m</button>
            <button
              className={`btn btn-sm ${metricsTimeframe === '5m' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetricsTimeframe('5m')}
            >5m</button>
            <button
              className={`btn btn-sm ${metricsTimeframe === '15m' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetricsTimeframe('15m')}
            >15m</button>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-purple)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-purple)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={9} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Area name="Ops/sec" type="monotone" dataKey="ops" stroke="var(--color-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorOps)" />
                <Area name="RAM (MB)" type="monotone" dataKey="mem" stroke="var(--color-purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <div className="rate-indicator">
              <span>{readRate ?? 0}</span>
              <p>Read Ops/sec</p>
            </div>
            <div className="rate-indicator">
              <span>{writeRate ?? 0}</span>
              <p>Write Ops/sec</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TelemetryChart);
