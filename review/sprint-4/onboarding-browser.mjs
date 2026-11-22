import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { chromium } from "playwright"

const origin = "http://localhost:3050"
const api = "http://localhost:4050/api"
const evidence = "/tmp/hobbyhub-onboarding-evidence"
const browser = await chromium.launch()
const response = async (page, route, body) =>
  page.evaluate(async ({ api, route, body }) => {
    const res = await fetch(api + "/" + route, {
      credentials: "include",
      ...(body ? {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      } : {}),
    })
    return { status: res.status, json: await res.json() }
  }, { api, route, body })

async function register(page) {
  await page.goto(origin + "/akce")
  await page.locator("h1").first().waitFor()
  const id = randomUUID().slice(0, 10)
  const account = { email: "sprint4-" + id + "@example.test", password: "HobbyHub QA 2026 #" + id }
  const created = await response(page, "auth/sign-up/email", {
    ...account, name: "Testovací Účet", callbackURL: origin + "/email-overen?from=%2Fskupiny",
    termsAccepted: true, privacyAcknowledged: true, ageConfirmed: true,
  })
  assert.equal(created.status, 200, "Synthetic user should register")
  assert.equal((await response(page, "auth/get-session")).json, null)
  const inbox = await response(page, "simulated-inbox", account)
  assert.equal(inbox.status, 200)
  const link = await page.evaluate((html) =>
    [...new DOMParser().parseFromString(html, "text/html").links]
      .find(a => a.href.includes("/verify-email"))?.href,
    inbox.json.messages[0].html)
  assert.equal(new URL(link).origin, new URL(api).origin)
  await page.goto(link)
  await page.waitForURL("**/vitej?**")
  await page.getByRole("heading", { name: "Kde se potkáme?" }).waitFor()
  assert.equal((await response(page, "auth/get-session")).json.user.onboardingCompletedAt, null)
  return account
}

async function fit(page) {
  const overflows = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"][data-state="open"]'))
    return document.documentElement.scrollWidth > window.innerWidth + 1 ||
      dialogs.some(dialog => dialog.scrollWidth > dialog.clientWidth + 2)
  })
  assert.equal(overflows, false, "Wizard should fit the viewport width")
}

async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await fit(page)
  await page.screenshot({ path: evidence + "/" + name + ".png", animations: "disabled" })
}

async function signInAgain(account) {
  const fresh = await browser.newPage()
  try {
    await fresh.goto(origin + "/akce")
    assert.equal((await response(fresh, "auth/sign-in/email", account)).status, 200)
    await fresh.goto(origin + "/skupiny")
    await fresh.locator("h1").first().waitFor()
    assert.equal(new URL(fresh.url()).pathname, "/skupiny")
    assert.ok((await response(fresh, "auth/get-session")).json.user.onboardingCompletedAt)
  } finally {
    await fresh.close()
  }
}

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" })
  const account = await register(mobile)
  await screenshot(mobile, "01-mobile-locality")
  await mobile.locator("#onboarding-locality").fill("Praha 8")
  await mobile.getByRole("button", { name: /^Praha 8(?:$|\s)/ }).first().click()
  await mobile.getByRole("heading", { name: "Co tě baví?" }).waitFor()
  await screenshot(mobile, "02-mobile-categories")
  await mobile.getByRole("button", { name: /^Týmové sporty(?:$|\s)/ }).first().click()
  await mobile.getByRole("button", { name: "Volejbal", exact: true }).click()
  assert.equal(await mobile.getByRole("heading", { name: "Máš vybráno!" }).count(), 0)
  await screenshot(mobile, "03-mobile-activity")
  await mobile.getByRole("button", { name: "Pokračovat s výběrem" }).click()
  await mobile.getByRole("heading", { name: "Máš vybráno!" }).waitFor()
  await screenshot(mobile, "04-mobile-confirm")
  await mobile.getByRole("button", { name: "Uložit a ukázat akce" }).click()
  await mobile.waitForURL(url => url.pathname === "/akce" && url.searchParams.get("vyber") === "podle-zajmu")
  const profile = (await response(mobile, "me/profile")).json
  assert.equal(profile.homeLocality.slug, "praha-8")
  assert.deepEqual(profile.interests.map(item => item.name), ["Volejbal"])
  await signInAgain(account)
  await mobile.close()

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" })
  const skipped = await register(desktop)
  await screenshot(desktop, "05-desktop-locality")
  await desktop.getByRole("button", { name: "Teď ne", exact: true }).click()
  await desktop.getByRole("heading", { name: "Odejít z průvodce?" }).waitFor()
  await screenshot(desktop, "06-desktop-skip")
  await desktop.getByRole("button", { name: "Odejít bez uložení" }).click()
  await desktop.waitForURL("**/skupiny")
  assert.equal((await response(desktop, "me/profile")).json.homeLocality, null)
  await signInAgain(skipped)
  console.log("Verified registration via simulated email, save and skip, both persisted on new sign-in.")
} finally {
  await browser.close()
}
