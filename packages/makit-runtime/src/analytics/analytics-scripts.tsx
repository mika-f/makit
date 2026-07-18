import Script from "next/script";

export interface AnalyticsScriptsConfig {
  googleAnalytics?: { measurementId: string };
  googleTagManager?: { containerId: string };
  posthog?: { apiKey: string; apiHost?: string };
  umami?: { websiteId: string; scriptUrl?: string };
  vercel?: { scriptUrl?: string };
  scripts?: Array<{
    src: string;
    strategy?: "afterInteractive" | "beforeInteractive" | "lazyOnload" | "worker";
    attributes?: Record<string, string>;
  }>;
}

function json(value: unknown): string {
  // Configuration values are embedded in inline scripts. Escaping `<` keeps a
  // user-provided value from closing the script element.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Provider snippets for the generated app. The generated root layout renders
 * this component exclusively for production builds, so the development server
 * never loads an analytics provider.
 */
export function AnalyticsScripts({ config }: { config: AnalyticsScriptsConfig }) {
  const posthogHost = config.posthog?.apiHost
    ? withoutTrailingSlash(config.posthog.apiHost)
    : "https://us.i.posthog.com";

  return (
    <>
      {config.googleAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleAnalytics.measurementId)}`}
            strategy="afterInteractive"
          />
          <Script id="makit-google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date);gtag("config",${json(config.googleAnalytics.measurementId)});`}
          </Script>
        </>
      )}
      {config.googleTagManager && (
        <>
          <Script id="makit-google-tag-manager" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f)})(window,document,"script","dataLayer",${json(config.googleTagManager.containerId)});`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(config.googleTagManager.containerId)}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}
      {config.posthog && (
        <Script id="makit-posthog" strategy="afterInteractive">
          {`(function(){var s=document.createElement("script");s.async=true;s.src=${json(`${posthogHost}/static/array.js`)};s.onload=function(){if(window.posthog){window.posthog.init(${json(config.posthog.apiKey)},{api_host:${json(posthogHost)},capture_pageview:true,capture_pageleave:true})}};document.head.appendChild(s)})()`}
        </Script>
      )}
      {config.umami && (
        <Script
          src={config.umami.scriptUrl ?? "https://cloud.umami.is/script.js"}
          data-website-id={config.umami.websiteId}
          strategy="afterInteractive"
        />
      )}
      {config.vercel && (
        <Script
          src={config.vercel.scriptUrl ?? "/_vercel/insights/script.js"}
          strategy="afterInteractive"
        />
      )}
      {(config.scripts ?? []).map((script, index) => (
        <Script
          key={`${script.src}:${index}`}
          {...script.attributes}
          src={script.src}
          strategy={script.strategy ?? "afterInteractive"}
        />
      ))}
    </>
  );
}
