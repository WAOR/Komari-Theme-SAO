import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles/index.css";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");
const root = rootEl;

async function bootstrap() {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    const mockParam = searchParams.get("mock");
    const nodesParam = searchParams.get("nodes");
    if (mockParam === "1") {
      try {
        sessionStorage.setItem("komari_dev_mock", "1");
        if (nodesParam) sessionStorage.setItem("komari_dev_nodes", nodesParam);
      } catch {}
    } else if (mockParam === "0") {
      try {
        sessionStorage.removeItem("komari_dev_mock");
        sessionStorage.removeItem("komari_dev_nodes");
      } catch {}
    }

    let isMock = mockParam === "1";
    if (!isMock && mockParam !== "0") {
      try {
        isMock = sessionStorage.getItem("komari_dev_mock") === "1";
      } catch {}
    }

    if (isMock) {
      const { installDevMockApi } = await import("./dev/mockApi");
      installDevMockApi();
    }
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
