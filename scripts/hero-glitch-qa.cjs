const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/Fabiano/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    const context = await browser.newContext();
    await context.route('https://www.clarity.ms/**', route => route.abort());
    await context.addInitScript(() => {
      sessionStorage.setItem('portfolio-chibi-hidden', 'true');
      window.glitchTasks = new Map();
      const set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => {
        const id = set(() => { window.glitchTasks.delete(id); callback(...args); }, delay);
        if (callback.name === 'burst') window.glitchTasks.set(id, {callback, delay});
        return id;
      };
      window.clearTimeout = id => { window.glitchTasks.delete(id); clear(id); };
      window.triggerScheduledGlitch = () => {
        const [id, task] = [...window.glitchTasks][0];
        window.clearTimeout(id);
        task.callback();
        return task.delay;
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height:1000});
      await page.goto('http://localhost:4173');
      assert.equal(await page.locator('.hero-glitch-svg').count(), 0, 'Opening has no glitch layers');
      await page.waitForFunction(() => window.glitchTasks.size === 1);
      const before = await page.locator('.hero-title').evaluate(title => {
        const box = title.getBoundingClientRect();
        return {width:box.width,height:box.height,font:getComputedStyle(title).fontFamily, paths:[...title.querySelectorAll('.hero-writing-svg .hero-letter')].map(path=>path.getAttribute('d'))};
      });
      const delay = await page.evaluate(() => window.triggerScheduledGlitch());
      assert.ok(delay >= 6000 && delay <= 12000);
      assert.equal(await page.locator('.hero-glitch-svg').count(), 9);
      await page.evaluate(() => {
        const ids=[...document.querySelectorAll('svg [id]')].map(node=>node.id);
        if(new Set(ids).size!==ids.length)throw Error('Duplicate SVG IDs');
        document.querySelectorAll('.hero-glitch-svg').forEach(svg=>svg.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=parseFloat(svg.style.getPropertyValue('--glitch-duration'))*.57;}));
      });
      await page.locator('.hero-title').screenshot({path:`.qa/hero-glitch-${width}.png`});
      const during = await page.locator('.hero-title').evaluate(title => {
        const box=title.getBoundingClientRect();
        return {width:box.width,height:box.height,font:getComputedStyle(title).fontFamily, paths:[...title.querySelectorAll('.hero-writing-svg .hero-letter')].map(path=>path.getAttribute('d'))};
      });
      assert.deepEqual(during, before, 'Glitch preserves the font, original glyphs and geometry');
      await page.waitForFunction(() => !document.querySelector('.hero-title').classList.contains('is-glitching'));
      assert.equal(await page.locator('.hero-glitch-svg').count(), 0, 'Burst cleans up its layers');
      const repeated = await page.evaluate(() => [...window.glitchTasks.values()][0].delay);
      assert.ok(repeated >= 18000 && repeated <= 38000);
      // Switching language during a burst removes stale glyphs without replaying the opening.
      await page.evaluate(() => window.triggerScheduledGlitch());
      await page.locator('[data-language="en"]').click();
      assert.equal(await page.locator('.hero-glitch-svg').count(), 0);
      assert.deepEqual(await page.locator('.hero-writing-label').allInnerTexts(), ['FROM LOGIC','TO PRODUCT','IN USE.']);
      assert.equal(await page.locator('.hero-copy.is-copy-animating').count(), 0);
      await page.evaluate(() => window.triggerScheduledGlitch());
      const translated = await page.evaluate(() => [...document.querySelectorAll('.hero-writing')].every(line => {
        const source=line.querySelector('.hero-writing-svg .hero-letter').getAttribute('d');
        return [...line.querySelectorAll('.hero-glitch-svg')].every(svg=>svg.querySelector('.hero-glitch-glyph').getAttribute('d')===source);
      }));
      assert.ok(translated);
      await page.locator('[data-language="pt"]').click();
      await page.locator('#contato').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.glitchTasks.size === 0);
      assert.equal(await page.locator('.hero-glitch-svg').count(),0,'Offscreen title stops work');
      await page.locator('.hero-title').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.glitchTasks.size === 1);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(() => window.glitchTasks.size === 0);
      assert.equal(await page.locator('.hero-glitch-svg').count(),0,'Reduced motion disables the effect');
      await page.emulateMedia({reducedMotion:'no-preference'});
      console.log(`PASS ${width}px: random brief bursts, unchanged font/layout, PT/ENG, offscreen and reduced motion`);
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
