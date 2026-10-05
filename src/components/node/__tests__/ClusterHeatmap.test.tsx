import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClusterHeatmap } from "@/components/node/ClusterHeatmap";
import type { HomeNodeSummary } from "@/services/wsStore";

function createMockNode(overrides: Partial<HomeNodeSummary> = {}): HomeNodeSummary {
  return {
    uuid: "test-node-1",
    group: "生产",
    region: "HK",
    hidden: false,
    weight: 0,
    online: true,
    trafficUp: 100,
    trafficDown: 200,
    netUp: 1024,
    netDown: 2048,
    cpuPct: 15,
    ramUsed: 1024,
    ramTotal: 4096,
    diskUsed: 2048,
    diskTotal: 8192,
    connectionsTcp: 10,
    connectionsUdp: 5,
    ...overrides,
  };
}

describe("ClusterHeatmap Component", () => {
  it("renders correctly with online, high load and offline nodes", () => {
    const nodes: HomeNodeSummary[] = [
      createMockNode({ uuid: "node-1", online: true, netDown: 100 * 1024 }),
      createMockNode({ uuid: "node-2", online: true, netDown: 8 * 1024 * 1024 }),
      createMockNode({ uuid: "node-3", online: false }),
    ];
    const nameMap = new Map([
      ["node-1", "Normal Node"],
      ["node-2", "High Load Node"],
      ["node-3", "Offline Node"],
    ]);

    const html = renderToStaticMarkup(
      <ClusterHeatmap
        nodes={nodes}
        nameByUuid={nameMap}
        onlinePct={67}
        onlineNodes={2}
        offlineNodes={1}
        totalNodes={3}
      />,
    );

    // 检查总数与标签
    expect(html).toContain("67%");
    expect(html).toContain("在线率");
    expect(html).toContain("在线 2 台");
    expect(html).toContain("总计 3 台");
    expect(html).toContain("高吞吐");
    expect(html).toContain("1 台");

    // 检查渲染出的方格类名（包括铺满整行的空机位槽）
    expect(html).toContain("is-low-load");
    expect(html).toContain("is-high-load");
    expect(html).toContain("is-offline");
    expect(html).toContain("is-empty-slot");
    expect(html).toContain("机架 100 槽");
  });

  it("renders with EVA Unit-01 palette when colorTheme is eva", () => {
    const nodes: HomeNodeSummary[] = [
      createMockNode({ uuid: "node-1", online: true, netDown: 50 * 1024 }),
    ];
    const html = renderToStaticMarkup(
      <ClusterHeatmap
        nodes={nodes}
        onlinePct={100}
        onlineNodes={1}
        offlineNodes={0}
        totalNodes={1}
        colorTheme="eva"
      />,
    );

    expect(html).toContain('data-palette="eva"');
    expect(html).toContain("空闲");
    expect(html).toContain("高吞吐");
    expect(html).toContain("初号机紫");
  });

  it("fills empty slots with simulated data when mockFill is true", () => {
    const nodes = [createMockNode({ uuid: "n-1", online: true })];

    const htmlNormal = renderToStaticMarkup(
      <ClusterHeatmap
        nodes={nodes}
        onlinePct={100}
        onlineNodes={1}
        offlineNodes={0}
        totalNodes={1}
        mockFill={false}
      />,
    );
    expect(htmlNormal).toContain("is-empty-slot");
    expect(htmlNormal).not.toContain("is-mock-cell");
    expect(htmlNormal).toContain("机架 100 槽");

    const htmlMock = renderToStaticMarkup(
      <ClusterHeatmap
        nodes={nodes}
        onlinePct={100}
        onlineNodes={1}
        offlineNodes={0}
        totalNodes={1}
        mockFill={true}
      />,
    );
    expect(htmlMock).not.toContain("is-empty-slot");
    expect(htmlMock).toContain("is-mock-cell");
    expect(htmlMock).toContain("机架模拟槽位 #");
    expect(htmlMock).toContain("机架 100 槽");
  });
});
