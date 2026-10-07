import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Lock, WifiOff, RotateCw, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useAppearance } from "@/hooks/useAppearance";
import { useAuth } from "@/hooks/useAuth";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useSiteMetadata } from "@/hooks/useSiteMetadata";
import { readStoredSiteMetadata } from "@/hooks/useSiteMetadata";
import { useMetricColorsSync } from "@/hooks/useMetricColors";
import { useNodeStoreStatus } from "@/hooks/useNode";
import { HomeSkeleton } from "./HomeSkeleton";

export function AppShell() {
  useAppearance();
  useSiteMetadata();
  useMetricColorsSync();
  const { pathname, search } = useLocation();
  const publicConfig = usePublicConfig();
  const auth = useAuth();
  const cachedMeta = readStoredSiteMetadata();
  const siteName =
    publicConfig.data?.sitename?.trim() ||
    cachedMeta.siteName ||
    (publicConfig.isPending ? "" : "Komari");
  const normalizedPath = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  const isDataRoute =
    normalizedPath === "/" ||
    normalizedPath === "/assets" ||
    normalizedPath === "/traffic" ||
    normalizedPath.startsWith("/instance/");
  const isCheckingAccess =
    isDataRoute &&
    (publicConfig.isPending ||
      (publicConfig.data?.private_site === true && auth.isPending));
  const isMockError =
    new URLSearchParams(search).get("mock_error") === "1" ||
    new URLSearchParams(search).get("mock-error") === "1" ||
    (typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("mock_error") === "1" ||
        new URLSearchParams(window.location.search).get("mock-error") === "1"));
  const accessError =
    isMockError || (isDataRoute && publicConfig.isError && !publicConfig.data);
  const isPrivateVisitor =
    isDataRoute &&
    publicConfig.data?.private_site === true &&
    !auth.isPending &&
    auth.data?.logged_in !== true;
  const isThemeManage =
    new URLSearchParams(search).get("view") === "theme-manage" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("view") === "theme-manage");
  const isHomeDashboard = normalizedPath === "/" && !isThemeManage;
  // 并发直出：首页默认并发拉取节点，消除瀑布流排队；若后续判定私有则由 isPrivateVisitor 安全拦截
  const canHydrateHome =
    isHomeDashboard &&
    !accessError &&
    !isPrivateVisitor &&
    !(publicConfig.data?.private_site === true && !auth.data?.logged_in);
  const homeStoreStatus = useNodeStoreStatus(canHydrateHome);
  const isCheckingHomeData =
    canHydrateHome && !homeStoreStatus.hydrated && !homeStoreStatus.nodeInfoError;
  const isCheckingShell = isCheckingAccess || isCheckingHomeData;
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* MAO 风格顶部导航 Bar 框架 */}
      <header className="mao-top-nav-bar">
        <div className="mx-auto flex h-14 w-full max-w-430 items-center justify-between px-3 sm:px-5 md:px-6 lg:px-8">
          <div className="mao-nav-brand-left flex items-center gap-2.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-(--text-primary)"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
              <path d="M16.924 11.132a5 5 0 1 0 -4.056 5.792" />
              <path d="M3 12a9 9 0 1 0 9 -9" />
            </svg>
            <span className="mao-nav-title" title={siteName}>
              {siteName}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-9" />
        </div>
      </header>
      <main className="app-main flex-1 px-3 pb-2 pt-6 sm:px-5 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-430">
          {isCheckingShell ? (
            isHomeDashboard && !isPrivateVisitor ? (
              <HomeSkeleton />
            ) : (
              <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner size={24} />
              </div>
            )
          ) : accessError ? (
            <AccessError onRetry={() => void publicConfig.refetch()} />
          ) : isPrivateVisitor ? (
            <PrivateSiteGate />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

function AccessError({ onRetry }: { onRetry: () => void }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.has("mock_error") || sp.has("mock-error")) {
        sp.delete("mock_error");
        sp.delete("mock-error");
        const nextUrl =
          window.location.pathname + (sp.toString() ? `?${sp.toString()}` : "");
        window.location.href = nextUrl;
        return;
      }
      window.location.reload();
    } else {
      onRetry();
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <section className="access-error-card" role="alert" aria-live="assertive">
        <div className="access-error-icon-wrap" aria-hidden="true">
          <WifiOff size={22} strokeWidth={2} />
        </div>
        <div className="space-y-1.5">
          <h2 className="access-error-title">无法读取站点配置</h2>
          <p className="access-error-desc">
            与监控服务通信失败或接口未响应，请检查网络连接后重试。
          </p>
        </div>
        <div className="access-error-actions">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="access-error-refresh-btn"
          >
            <RotateCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            <span>{refreshing ? "正在刷新…" : "刷新页面"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function PrivateSiteGate() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <section className="access-error-card" role="alert">
        <div className="access-error-icon-wrap is-lock" aria-hidden="true">
          <Lock size={22} strokeWidth={2} />
        </div>
        <div className="space-y-1.5">
          <h2 className="access-error-title">站点已设为私有</h2>
          <p className="access-error-desc">
            该探针已被站长设为私有访问，登录后即可查看节点实时状态。
          </p>
        </div>
        <div className="access-error-actions">
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="access-error-refresh-btn"
          >
            <span>前往登录</span>
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
