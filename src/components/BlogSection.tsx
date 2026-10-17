"use client";

import { useState } from "react";
import { uiText } from "@/i18n/ui";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { posts, localizedPostText, readingMinutes, postCategory } from "@/content/posts";

const featuredSlugs = [
  "windows-kurulum-code-5",
  "hiz-testi-dogru-olcum",
  "ag-haritasi-kanitlari",
];

export function BlogSection({ locale }: { locale: Locale }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["all"]);
  const [subscribed, setSubscribed] = useState(false);

  const available = posts.filter((p) => p.body[locale]);
  if (!available.length) return null;

  const prioritized = [
    ...featuredSlugs.map((slug) => available.find((p) => p.slug === slug)!).filter(Boolean),
    ...available.filter((p) => !featuredSlugs.includes(p.slug)).slice(0, 5),
  ].slice(0, 8);

  const maxIndex = Math.max(0, prioritized.length - 4);

  const topics = [
    {
      id: "all",
      label: uiText(locale, "All Updates", "Tüm Güncellemeler"),
      className: "newsletter-topic-pill--all newsletter-topic-pill--master",
    },
    {
      id: "hub",
      label: "IPscans+",
      className: "newsletter-topic-pill--hub",
    },
    {
      id: "cli",
      label: "IPCast",
      className: "newsletter-topic-pill--cli",
    },
    {
      id: "ide",
      label: "LPR Pro",
      className: "newsletter-topic-pill--ide",
    },
    {
      id: "sdk",
      label: uiText(locale, "Web Diagnostics", "Web Araçları"),
      className: "newsletter-topic-pill--sdk",
    },
  ];

  const toggleTopic = (id: string) => {
    if (id === "all") {
      setSelectedTopics(["all"]);
      return;
    }
    setSelectedTopics((prev) => {
      const withoutAll = prev.filter((item) => item !== "all");
      if (withoutAll.includes(id)) {
        const next = withoutAll.filter((item) => item !== id);
        return next.length ? next : ["all"];
      }
      return [...withoutAll, id];
    });
  };

  return (
    <>
      {/* Section 8: Antigravity .landing-latest-blogs */}
      <section className="landing-latest-blogs" data-latest-blogs-section>
        <div className="grid-container">
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-12">
              <div className="landing-latest-blogs-header">
                <span className="heading-4">
                  {uiText(locale, "Latest Blogs", "Son Rehberler")}
                </span>
                <Link
                  href={`/${locale}/blog`}
                  className="call-to-action button button-secondary"
                >
                  <span>{uiText(locale, "View blog", "Tüm rehberler")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-latest-blogs-list">
          <div className="grid-container">
            <div className="grid-row">
              <div className="grid-col col-xs-4 col-sm-8 col-md-12">
                <div className="slider-wrapper" data-slider-wrapper>
                  <div
                    className="slider-inner"
                    data-slider-inner
                    style={{
                      transform: `translate3d(calc(${slideIndex} * -25%), 0, 0)`,
                    }}
                  >
                    {prioritized.map((p, i) => (
                      <Link
                        key={p.slug}
                        href={`/${locale}/blog/${p.slug}`}
                        className="list-item"
                      >
                        <div className="list-image-wrapper">
                          <div
                            className={`list-image blog-square-art blog-square-art--${i % 4}`}
                            aria-hidden="true"
                          >
                            <span className="blog-square-art__orb" />
                            <span className="blog-square-art__ring" />
                            <span className="blog-square-art__badge">
                              {postCategory(p, locale)}
                            </span>
                            <strong className="blog-square-art__num">
                              {String(i + 1).padStart(2, "0")}
                            </strong>
                          </div>
                        </div>
                        <div className="list-item-content">
                          <p className="heading-6 item-title">
                            {localizedPostText(p.title, locale)}
                          </p>
                          <div className="list-item-metadata">
                            <span className="caption">
                              {readingMinutes(p, locale)} {uiText(locale, "MIN", "DK")}
                            </span>
                            <span className="caption">{postCategory(p, locale)}</span>
                          </div>
                          <span className="caption arrow-link">
                            {uiText(locale, "Read blog", "Rehberi oku")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="slider-controls-container" data-arrow-controls-wrapper>
                    <div className="slider-controls">
                      <button
                        type="button"
                        className="slider-control-button"
                        disabled={slideIndex === 0}
                        aria-label="Previous slide"
                        onClick={() => setSlideIndex((prev) => Math.max(0, prev - 1))}
                      >
                        <svg
                          viewBox="0 -960 960 960"
                          width="24px"
                          height="24px"
                          fill="currentColor"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="slider-control-button"
                        disabled={slideIndex >= maxIndex}
                        aria-label="Next slide"
                        onClick={() =>
                          setSlideIndex((prev) => Math.min(maxIndex, prev + 1))
                        }
                      >
                        <svg
                          viewBox="0 -960 960 960"
                          width="24px"
                          height="24px"
                          fill="currentColor"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Antigravity .landing-newsletter-section */}
      <section
        className="landing-newsletter-section"
        id="newsletter"
        data-home-newsletter-section
      >
        <div className="grid-container">
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-12">
              <aside
                className="newsletter-card newsletter-card--default"
                data-newsletter-card
                aria-label="IPScans Updates"
              >
                <div className="newsletter-card__surface">
                  <div className="newsletter-card__header">
                    <div className="newsletter-card__title-row">
                      <h2 className="heading-4 newsletter-card__title">
                        {uiText(
                          locale,
                          "Stay in sync with IPScans",
                          "IPScans ile senkronize kalın"
                        )}
                      </h2>
                    </div>
                    <p className="body newsletter-card__description">
                      {uiText(
                        locale,
                        "Get the latest product updates, releases, and feature drops.",
                        "En son ürün güncellemelerini, yeni sürümleri ve ağ rehberlerini takip edin."
                      )}
                    </p>
                  </div>

                  <form
                    className="newsletter-card__form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubscribed(true);
                    }}
                  >
                    <fieldset className="newsletter-card__topics-fieldset">
                      <legend className="sr-only">Product surfaces</legend>
                      <div className="newsletter-card__topics" role="group">
                        {topics.map((topic) => {
                          const isSelected = selectedTopics.includes(topic.id);
                          return (
                            <label
                              key={topic.id}
                              className={`newsletter-topic-pill ${topic.className} ${
                                isSelected ? "selected" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTopic(topic.id)}
                              />
                              <span
                                className="newsletter-topic-pill__indicator"
                                aria-hidden="true"
                              >
                                <span className="newsletter-topic-pill__icon">
                                  <svg
                                    viewBox="0 -960 960 960"
                                    width="14px"
                                    height="14px"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                                  </svg>
                                </span>
                                <span className="newsletter-topic-pill__check">
                                  <svg
                                    viewBox="0 -960 960 960"
                                    width="14px"
                                    height="14px"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                  </svg>
                                </span>
                              </span>
                              <span className="newsletter-topic-pill__label">
                                {topic.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="newsletter-card__capsule">
                      <div className="newsletter-card__email-field">
                        <label htmlFor="home-newsletter-email" className="sr-only">
                          Email
                        </label>
                        <input
                          type="email"
                          id="home-newsletter-email"
                          name="email"
                          placeholder={uiText(
                            locale,
                            "Enter your email address",
                            "E-posta adresinizi girin"
                          )}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="call-to-action newsletter-card__submit"
                      >
                        <span>
                          {subscribed
                            ? uiText(locale, "Subscribed", "Kaydedildi")
                            : uiText(locale, "Subscribe", "Abone Ol")}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
