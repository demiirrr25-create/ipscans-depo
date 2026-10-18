import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";
import { Icon, type IconName } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SectionHeader } from "@/components/ds/product";
import { homeCopy } from "./copy";

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

const toolProtocols: Record<Exclude<ToolKey, "speedTest">, string> = {
  ipLookup: "IPv4 · IPv6 · ASN",
  dns: "A · AAAA · MX · TXT · NS",
  whois: "RDAP · ICANN · IANA",
  ports: "TCP · 12 COMMON PORTS",
};

export function NetworkToolsSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const copy = homeCopy[locale];
  const gridTools = toolKeys.filter(
    (key): key is Exclude<ToolKey, "speedTest"> => key !== "speedTest"
  );

  return (
    <section id="tools" className="ds-section">
      <div className="ds-container">
        <SectionHeader
          eyebrow={dict.experience.networkTools}
          title={copy.toolsTitle}
          lead={copy.toolsLead}
        />

        <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-12">
          {/* Featured Speed Test Dark Stage Card */}
          <Reveal variant="scale" className="lg:col-span-5">
            <div className="group ds-stage flex h-full flex-col justify-between p-8 sm:p-10">
              <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-55">
                <SignalField variant="stage" />
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(75%_80%_at_20%_20%,rgb(7_8_11/0.88)_25%,transparent_85%)]"
              />

              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="ds-eyebrow text-on-stage-2">
                    {dict.nav.speedTest}
                  </span>
                  <span className="ds-mono text-xs text-on-stage-3">
                    HTTPS · EDGE
                  </span>
                </div>

                {/* Signal-Gradient Speed Gauge Visual */}
                <div
                  aria-hidden="true"
                  className="my-8 flex flex-col items-center justify-center rounded-lg border border-stage-line bg-white/[0.03] px-6 py-7"
                >
                  <svg
                    viewBox="0 0 220 120"
                    className="h-28 w-52 overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="home-speed-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#2f6bff" />
                        <stop offset="50%" stopColor="#00c2ff" />
                        <stop offset="100%" stopColor="#7a5cff" />
                      </linearGradient>
                    </defs>
                    {/* Track arc */}
                    <path
                      d="M 24 104 A 86 86 0 0 1 196 104"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    {/* Signal gradient arc */}
                    <path
                      d="M 24 104 A 86 86 0 0 1 178 52"
                      fill="none"
                      stroke="url(#home-speed-gradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    {/* Center hub & animated needle */}
                    <g className="origin-[110px_104px] transition-transform duration-700 ease-out-expo group-hover:rotate-12">
                      <line
                        x1="110"
                        y1="104"
                        x2="156"
                        y2="56"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="110" cy="104" r="5" fill="#ffffff" />
                    </g>
                  </svg>

                  <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-stage-line pt-4 text-center">
                    <div>
                      <span className="block text-[0.75rem] text-on-stage-3">
                        {dict.speedTest.download}
                      </span>
                      <span className="ds-mono mt-0.5 block text-xs font-medium text-on-stage-2">
                        Mbps
                      </span>
                    </div>
                    <div className="border-x border-stage-line">
                      <span className="block text-[0.75rem] text-on-stage-3">
                        {dict.speedTest.upload}
                      </span>
                      <span className="ds-mono mt-0.5 block text-xs font-medium text-on-stage-2">
                        Mbps
                      </span>
                    </div>
                    <div>
                      <span className="block text-[0.75rem] text-on-stage-3">
                        {dict.speedTest.ping}
                      </span>
                      <span className="ds-mono mt-0.5 block text-xs font-medium text-on-stage-2">
                        ms
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="ds-h3 text-on-stage">{dict.speedTest.title}</h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-on-stage-2">
                  {dict.speedTest.subtitle}
                </p>
              </div>

              <div className="mt-8 pt-2">
                <Link
                  href={toolPath("speedTest", locale)}
                  className="btn btn-inverse btn-lg w-full sm:w-auto"
                >
                  <Icon name="gauge" size={18} />
                  <span>{dict.speedTest.start}</span>
                  <Icon
                    name="arrowRight"
                    size={18}
                    className="btn-arrow rtl-flip"
                  />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* 4 Browser Diagnostic Tools Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {gridTools.map((key, i) => {
              const tool = dict[key];
              return (
                <Reveal key={key} delay={(i + 1) * 70}>
                  <Link
                    href={toolPath(key, locale)}
                    className="group ds-card ds-card-interactive flex h-full flex-col justify-between p-7 sm:p-8"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="grid size-12 place-items-center rounded-[14px] bg-signal-soft text-signal transition-transform duration-500 ease-out-expo group-hover:scale-105">
                          <Icon name={toolIcons[key]} size={22} />
                        </span>
                        <span className="ds-mono text-xs text-ink-3">
                          {toolProtocols[key]}
                        </span>
                      </div>

                      <h3 className="ds-h4 mt-6 text-ink">{tool.title}</h3>
                      <p className="mt-2.5 text-[0.96rem] leading-relaxed text-ink-2">
                        {tool.subtitle}
                      </p>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-sm font-medium text-ink">
                      <span>{tool.button}</span>
                      <Icon
                        name="arrowRight"
                        size={16}
                        className="rtl-flip text-ink-3 transition-all duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-signal"
                      />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
