import path from "node:path";

import { chromium } from "playwright";

const [, , pageUrl, outputFile, ...nameParts] = process.argv;

if (!pageUrl || !outputFile) {
  console.error("Usage: node scripts/capture-product-packshot.mjs <url> <output-file> [name]");
  process.exit(1);
}

const name = nameParts.join(" ").trim().toLowerCase();
const keywords = name
  .split(/[^a-z0-9]+/i)
  .map((part) => part.trim().toLowerCase())
  .filter((part) => part.length > 2);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1800 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
});

try {
  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    document.querySelectorAll("[aria-label*='cookie' i], [id*='cookie' i], [class*='cookie' i]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.display = "none";
      }
    });
  });

  const images = await page.locator("img").evaluateAll((nodes, needleTerms) => {
    function scoreImage(image, terms) {
      const rect = image.getBoundingClientRect();
      const src = image.currentSrc || image.src || "";
      const alt = (image.getAttribute("alt") || "").toLowerCase();
      const text = `${src} ${alt}`.toLowerCase();

      if (!src || src.startsWith("data:") || src.endsWith(".svg")) {
        return null;
      }

      if (rect.width < 160 || rect.height < 160) {
        return null;
      }

      const ratio = rect.width / rect.height;
      if (ratio > 1.5 || ratio < 0.2) {
        return null;
      }

      const style = window.getComputedStyle(image);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
        return null;
      }

      if (rect.top > window.innerHeight * 1.6 || rect.bottom < 0) {
        return null;
      }

      let score = rect.width * rect.height;

      if (rect.top < window.innerHeight) {
        score += 60000;
      }

      if (ratio < 0.95) {
        score += 40000;
      }

      if (/logo|icon|sprite|banner|hero-background|avatar|flag/i.test(text)) {
        score -= 120000;
      }

      if (/product|pack|bottle|tube|cream|wash|oil|lotion|mouthwash|soap|pods|lip|mask/i.test(text)) {
        score += 50000;
      }

      const termHits = terms.filter((term) => text.includes(term)).length;
      score += termHits * 35000;

      return {
        score,
        src,
        alt,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      };
    }

    return nodes
      .map((node, index) => {
        const scored = scoreImage(node, needleTerms);
        return scored ? { index, ...scored } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }, keywords);

  if (!images.length) {
    await page.screenshot({ path: outputFile, fullPage: false });
    console.log(`fallback-page\t${pageUrl}\t${outputFile}`);
    await browser.close();
    process.exit(0);
  }

  const candidate = images[0];
  const locator = page.locator("img").nth(candidate.index);
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: outputFile });

  console.log(`image\t${candidate.src}\t${path.resolve(outputFile)}`);
} finally {
  await browser.close();
}
