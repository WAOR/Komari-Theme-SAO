import { useEffect, useState } from "react";
import pkg from "../../package.json" with { type: "json" };

const STORAGE_KEY = "komari_sao_update_cache";
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小时检查一次，防 GitHub API 触发限流

interface UpdateState {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseUrl: string;
}

function parseSemverPart(s: string | undefined): number {
  if (!s) return 0;
  const num = parseInt(s, 10);
  return isNaN(num) ? 0 : num;
}

function compareSemver(latest: string, current: string): boolean {
  const l = latest.replace(/^v/, "").trim().split(".").map(parseSemverPart);
  const c = current.replace(/^v/, "").trim().split(".").map(parseSemverPart);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lNum = l[i] || 0;
    const cNum = c[i] || 0;
    if (lNum > cNum) return true;
    if (lNum < cNum) return false;
  }
  return false;
}

export function useThemeUpdate(repo = "WAOR/Komari-Theme-SAO") {
  const currentVersion = pkg.version ? `v${pkg.version}` : "v1.2.3";

  // 仅在显式传入 ?mockUpdate=1 时强制进入演示模式，日常 ?mock=1 遵循真实状态判定
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isMockPreview = searchParams?.get("mockUpdate") === "1";

  const [state, setState] = useState<UpdateState>(() => {
    // 如果 URL 带有 mockUpdate=1 或在 mock 调试下，默认开启演示效果展示 v1.2.4
    if (isMockPreview) {
      return {
        hasUpdate: true,
        latestVersion: "v1.2.4",
        currentVersion,
        releaseUrl: `https://github.com/${repo}/releases`,
      };
    }

    // 从 LocalStorage 读取缓存
    if (typeof localStorage !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CHECK_INTERVAL_MS) {
            return {
              hasUpdate: compareSemver(parsed.latestVersion, currentVersion),
              latestVersion: parsed.latestVersion,
              currentVersion,
              releaseUrl: parsed.releaseUrl || `https://github.com/${repo}/releases`,
            };
          }
        }
      } catch {}
    }

    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      currentVersion,
      releaseUrl: `https://github.com/${repo}/releases`,
    };
  });

  useEffect(() => {
    // mock 预览模式不发起远程真实请求
    if (isMockPreview) return;

    let ignore = false;

    async function checkForUpdates() {
      try {
        let cleanLatest = "";
        let releaseLink = `https://github.com/${repo}/releases`;

        // 1. 优先尝试从 GitHub Releases 获取
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            headers: { Accept: "application/vnd.github.v3+json" },
          });
          if (res.ok) {
            const data = await res.json();
            const tag = data.tag_name || data.name || "";
            if (tag) {
              cleanLatest = tag.startsWith("v") ? tag : `v${tag}`;
              if (data.html_url) releaseLink = data.html_url;
            }
          }
        } catch {}

        // 2. 如果 Releases 暂无新 Tag，回退读取远端 main 分支 package.json 上的 version
        if (!cleanLatest) {
          try {
            const rawRes = await fetch(`https://raw.githubusercontent.com/${repo}/main/package.json`, {
              cache: "no-store",
            });
            if (rawRes.ok) {
              const rawPkg = await rawRes.json();
              if (rawPkg.version) {
                cleanLatest = `v${rawPkg.version}`;
              }
            }
          } catch {}
        }

        if (!cleanLatest || ignore) return;

        const hasNew = compareSemver(cleanLatest, currentVersion);
        const newState: UpdateState = {
          hasUpdate: hasNew,
          latestVersion: cleanLatest,
          currentVersion,
          releaseUrl: releaseLink,
        };

        setState(newState);

        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              latestVersion: cleanLatest,
              releaseUrl: newState.releaseUrl,
            })
          );
        } catch {}
      } catch {
        // 静默处理网络错误，不影响界面渲染
      }
    }

    checkForUpdates();

    return () => {
      ignore = true;
    };
  }, [repo, currentVersion, isMockPreview]);

  // 提供交互切换（方便用户点击呼吸点随时在“正常绿点”与“橘黄滚动新版本”之间对比）
  const toggleMockUpdate = () => {
    setState((prev) => ({
      ...prev,
      hasUpdate: !prev.hasUpdate,
      latestVersion: !prev.hasUpdate ? "v1.2.4" : prev.currentVersion,
    }));
  };

  return {
    ...state,
    toggleMockUpdate,
  };
}
