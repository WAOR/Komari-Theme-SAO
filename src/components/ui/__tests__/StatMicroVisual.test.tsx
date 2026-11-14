import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatMicroVisual } from '../StatMicroVisual';

describe('StatMicroVisual', () => {
  it('renders ram gauge with correct percentage and value', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="ram" ramPct={59.2} />);
    expect(html).toContain('<svg');
    expect(html).toContain('59');
    expect(html).toContain('mao-gauge-pct');
  });

  it('renders cpu equalizer bars (5 tracks + 5 active bars)', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="cpu" avgCpu={88.2} />);
    expect(html).toContain('<svg');
    const rectCount = (html.match(/<rect/g) || []).length;
    expect(rectCount).toBe(10);
  });

  it('renders connections dual rings', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="connections" totalTcpConn={1200} totalUdpConn={80} />);
    expect(html).toContain('<svg');
    const circleCount = (html.match(/<circle/g) || []).length;
    expect(circleCount).toBeGreaterThanOrEqual(2);
  });

  it('renders disk storage matrix', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="disk" diskPct={32.3} />);
    expect(html).toContain('<svg');
    const rectCount = (html.match(/<rect/g) || []).length;
    expect(rectCount).toBe(6);
  });

  it('renders traffic bar sparkline with real hourly buckets and bandwidth wave distinctly', () => {
    const hourlyBuckets = [
      { up: 100, down: 200, total: 300 },
      { up: 200, down: 400, total: 600 },
      { up: 150, down: 350, total: 500 },
      { up: 500, down: 800, total: 1300 },
      { up: 300, down: 600, total: 900 },
      { up: 800, down: 1200, total: 2000 },
      { up: 1000, down: 1500, total: 2500 }, // latest hour
    ];
    const trafficHtml = renderToStaticMarkup(
      <StatMicroVisual metric="traffic" todayTrafficHourly={hourlyBuckets} />
    );
    expect(trafficHtml).toContain('mao-micro-bars-sparkline');
    expect(trafficHtml).toContain('mao-traffic-bar-total');
    expect(trafficHtml).toContain('mao-traffic-bar-dot');

    const bandwidthHtml = renderToStaticMarkup(<StatMicroVisual metric="bandwidth" />);
    expect(bandwidthHtml).toContain('mao-micro-sparkline');
    expect(bandwidthHtml).toContain('mao-spark-line-tx');
  });

  it('renders static aesthetic states for cpu, connections, and traffic when microVisualMode is static', () => {
    // 1. CPU 静态美化状态：峰值柱高 44（保留清晰顶部虚影）
    const cpuStatic = renderToStaticMarkup(<StatMicroVisual metric="cpu" avgCpu={2} microVisualMode="static" />);
    expect(cpuStatic).toContain('height="44"');

    // 2. 活跃连接静态美化状态：使用 0.78 饱满外环弧度，告别低连接空轨虚影
    const connStatic = renderToStaticMarkup(<StatMicroVisual metric="connections" totalTcpConn={10} totalUdpConn={2} microVisualMode="static" />);
    expect(connStatic).toContain('mao-conn-fill-tcp');
    expect(connStatic).toContain('mao-conn-fill-udp');
    // cOuter ~257.61, 257.61 * 0.78 ~200.935
    expect(connStatic).toMatch(/stroke-dasharray="200\./);

    // 3. 今日流量静态美化状态：即使传入全空小时桶，也呈现 7 阶饱满起伏直方图与高光点
    const trafficStatic = renderToStaticMarkup(
      <StatMicroVisual
        metric="traffic"
        todayTrafficHourly={[{ up: 0, down: 0, total: 0 }, { up: 0, down: 0, total: 0 }]}
        microVisualMode="static"
      />
    );
    expect(trafficStatic).toContain('mao-traffic-bar-dot');
    expect(trafficStatic).toContain('mao-traffic-bar-total');
  });

  it('renders asset budget arc and symbol', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="asset" costSummary={{ remainingCny: 470, totalOriginalPriceCny: 788 }} />);
    expect(html).toContain('<svg');
    expect(html).toContain('¥');
  });

  it('renders nodes cluster keepalive telemetry micro visual', () => {
    const html = renderToStaticMarkup(
      <StatMicroVisual
        metric="nodes"
        onlinePct={83.3}
        onlineNodes={5}
        offlineNodes={1}
        totalNodes={6}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('mao-micro-nodes-ecg');
    expect(html).toContain('mao-ecg-grid');
    expect(html).toContain('mao-ecg-trace');
    expect(html).toContain('has-offline');
  });

  it('renders agonal single weak pulse for all-offline (0% online) nodes', () => {
    const html = renderToStaticMarkup(
      <StatMicroVisual
        metric="nodes"
        onlinePct={0}
        onlineNodes={0}
        offlineNodes={6}
        totalNodes={6}
      />
    );
    expect(html).toContain('has-all-offline');
    expect(html).toContain('has-offline');
    expect(html).toContain('M 2 32 L 24 32');
  });

  it('renders process task cascade windows and prompt', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="process" />);
    expect(html).toContain('<svg');
    expect(html).toContain('mao-micro-proc-cascade');
    expect(html).toContain('mao-proc-window');
    expect(html).toContain('mao-proc-prompt-arrow');
    expect(html).toContain('mao-proc-task-bar');
  });

  it('renders non-circular ECG vital telemetry trace for uptime card without dots', () => {
    const html = renderToStaticMarkup(<StatMicroVisual metric="uptime" recentRebootSeconds={7200} />);
    expect(html).toContain('mao-micro-uptime-ecg');
    expect(html).toContain('mao-ecg-grid');
    expect(html).toContain('mao-ecg-trace');
    expect(html).not.toContain('<circle');
  });

  it('renders cellular trigram pillars for loss card with CT, CU, CM indicators and tiers', () => {
    const normalHtml = renderToStaticMarkup(
      <StatMicroVisual metric="loss" ctLoss={0} cuLoss={0} cmLoss={0} />
    );
    expect(normalHtml).toContain('mao-micro-trigram');
    expect(normalHtml).toContain('CT');
    expect(normalHtml).toContain('CU');
    expect(normalHtml).toContain('CM');
    expect(normalHtml).toContain('data-tier="good"');
    expect(normalHtml).not.toContain('mao-trigram-cap');

    const mixedHtml = renderToStaticMarkup(
      <StatMicroVisual metric="loss" ctLoss={1} cuLoss={5} cmLoss={20} />
    );
    expect(mixedHtml).toContain('data-tier="good"');
    expect(mixedHtml).toContain('data-tier="warning"');
    expect(mixedHtml).toContain('data-tier="error"');
  });

  it('renders SAO rank word for yesterdayBest stability score', () => {
    // SSS (>= 98)
    const sssHtml = renderToStaticMarkup(<StatMicroVisual metric="yesterdayBest" yesterdayScore={99.5} />);
    expect(sssHtml).toContain('mao-word-rank');
    expect(sssHtml).toContain('SSS');

    // SS (93 ~ 97.9)
    const ssHtml = renderToStaticMarkup(<StatMicroVisual metric="yesterdayBest" yesterdayScore={97.4} />);
    expect(ssHtml).toContain('SS');

    // S (85 ~ 92.9)
    const sHtml = renderToStaticMarkup(<StatMicroVisual metric="yesterdayBest" yesterdayScore={90.0} />);
    expect(sHtml).toContain('S');

    // A (70 ~ 84.9)
    const aHtml = renderToStaticMarkup(<StatMicroVisual metric="yesterdayBest" yesterdayScore={78.0} />);
    expect(aHtml).toContain('A');

    // Placeholder
    const nullHtml = renderToStaticMarkup(<StatMicroVisual metric="yesterdayBest" yesterdayScore={undefined} />);
    expect(nullHtml).toContain('is-placeholder');
    expect(nullHtml).toContain('---');
  });
});
