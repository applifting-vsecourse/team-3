import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { accessSync, constants } from "node:fs"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, delimiter, join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

import { exerciseOnboardingProfileContract } from "./onboarding-profile.mjs"

const origin = process.env.HH_FRONTEND ?? "http://127.0.0.1:39396"
const api = process.env.HH_BACKEND ?? "http://127.0.0.1:40396/api"
function findChromium() {
  const executables =
    process.platform === "win32"
      ? ["chrome.exe", "msedge.exe", "chromium.exe"]
      : [
          "chromium",
          "chromium-browser",
          "google-chrome",
          "google-chrome-stable",
          "chrome-headless-shell",
        ]
  const candidates = process.env.HH_CHROMIUM
    ? [process.env.HH_CHROMIUM]
    : (process.env.PATH ?? "")
        .split(delimiter)
        .flatMap((directory) => executables.map((name) => join(directory, name)))
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // Continue to the next executable.
    }
  }
  throw new Error("Put Chromium on PATH or set HH_CHROMIUM to the executable's absolute path.")
}

for (const url of [origin, api]) {
  if (new URL(url).hostname !== "127.0.0.1")
    throw new Error("The harness requires local preview endpoints.")
}
const mode = process.argv.slice(2)
if (mode.includes("--help")) {
  console.log(`HobbyHub onboarding browser regression

Use Node 22+ and a local preview with the seeded Czech catalog and simulated email inbox.
Allow the frontend URL in the local backend's CORS configuration.
The runner registers synthetic accounts in that preview's database.

  HH_FRONTEND   Frontend URL, defaults to http://127.0.0.1:39396
  HH_BACKEND    API URL, defaults to http://127.0.0.1:40396/api
  HH_CHROMIUM   Chromium executable path if it is not on PATH
  --preflight   Check the running preview endpoints
  --only=TEXT   Match a scenario name

Screenshots and a JSON report are saved to a temporary directory.`)
  process.exit(0)
}
if (mode.includes("--preflight")) {
  for (const url of [`${origin}/vitej`, `${api}/localities`]) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Preview endpoint ${url}: ${response.status}`)
    await response.body?.cancel()
    console.log(`${response.status} ${url}`)
  }
  process.exit(0)
}

const chromePath = findChromium()
const browserProfile = await mkdtemp(join(tmpdir(), "hh296-v4-profile-"))
const evidence = await mkdtemp(join(tmpdir(), "hh296-v5-evidence-"))
const browser = spawn(
  chromePath,
  [
    ...(/chrome-headless-shell/i.test(basename(chromePath)) ? [] : ["--headless=new"]),
    ...(process.env.HH_CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    ...(process.env.HH_CHROMIUM_SINGLE_PROCESS === "1" ? ["--single-process"] : []),
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=0",
    `--user-data-dir=${browserProfile}`,
    "about:blank",
  ],
  {
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      LD_LIBRARY_PATH: [process.env.HH_CHROMIUM_LIB_DIR, process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(":"),
    },
  },
)

const quote = JSON.stringify
const errors = []
const network = []
const results = []
const check = (isCorrect, detail) => {
  if (!isCorrect) throw new Error(detail)
}
const textExpr = (el) => `(${el})?.innerText?.trim()`

function devtoolsEndpoint() {
  return new Promise((resolve, reject) => {
    let stderr = ""
    const timer = setTimeout(() => reject(Error("Chromium did not start")), 8000)
    browser.stderr.on("data", (data) => {
      stderr = (stderr + data.toString()).slice(-4096)
      const endpoint = stderr.match(/DevTools listening on (ws:\/\/\S+)/)?.[1]
      if (endpoint) {
        clearTimeout(timer)
        resolve(new URL(endpoint))
      }
    })
    browser.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    browser.on("exit", (code) => {
      clearTimeout(timer)
      reject(Error(`Chromium exited ${code}: ${stderr.trim().slice(-700)}`))
    })
  })
}

let socket
try {
  const endpoint = await devtoolsEndpoint()
  const [tab] = await (await fetch(`http://${endpoint.host}/json/list`)).json()
  socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  const calls = new Map()
  const skippedRemoteRequests = new Set()
  let failNextSave = false
  let skipFailures = 0
  let skipFailureStatus = 503
  let messageId = 0

  socket.addEventListener("message", ({ data }) => {
    const reply = JSON.parse(data)
    const call = calls.get(reply.id)
    if (call) {
      clearTimeout(call.timer)
      calls.delete(reply.id)
      if (reply.error) call.reject(Error(reply.error.message))
      else call.resolve(reply.result)
      return
    }
    if (reply.method === "Runtime.exceptionThrown") {
      errors.push(
        reply.params.exceptionDetails.exception?.description ?? reply.params.exceptionDetails.text,
      )
    }
    if (reply.method === "Fetch.requestPaused") {
      const { requestId, request } = reply.params
      const url = new URL(request.url)
      if (url.origin === new URL(api).origin) {
        const isSaveFailure =
          request.method === "POST" &&
          failNextSave &&
          url.pathname.endsWith("/me/profile/onboarding")
        const isSkipFailure =
          request.method === "POST" &&
          skipFailures > 0 &&
          url.pathname.endsWith("/me/profile/onboarding/skip")
        if (isSaveFailure || isSkipFailure) {
          if (isSaveFailure) failNextSave = false
          if (isSkipFailure) skipFailures--
          const responseCode = isSkipFailure ? skipFailureStatus : 503
          const message =
            responseCode === 403 ? "Požadavek nepřišel z HobbyHubu." : "Simulated retryable error"
          void send("Fetch.fulfillRequest", {
            requestId,
            responseCode,
            responseHeaders: [
              { name: "Content-Type", value: "application/json" },
              { name: "Access-Control-Allow-Origin", value: origin },
              { name: "Access-Control-Allow-Credentials", value: "true" },
            ],
            body: Buffer.from(JSON.stringify({ message })).toString("base64"),
          }).catch((error) => errors.push(error.message))
        } else {
          void send("Fetch.continueRequest", { requestId }).catch((error) =>
            errors.push(error.message),
          )
        }
        return
      }
      const search = url.searchParams.get("q")
      const isDelayed = search === "Kocouří obec"
      const features = isDelayed
        ? [
            {
              geometry: { coordinates: [14.45, 50.08] },
              properties: {
                name: "Kocouří obec",
                osm_value: "village",
                countrycode: "CZ",
                county: "Zkušební okres",
              },
            },
          ]
        : []
      // Keep the actual place service offline and force the debounce/stale response ordering.
      void sleep(isDelayed ? 550 : 0)
        .then(() =>
          send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: "Content-Type", value: "application/json" },
              { name: "Access-Control-Allow-Origin", value: origin },
            ],
            body: Buffer.from(JSON.stringify({ features }), "utf8").toString("base64"),
          }),
        )
        .catch(() => {
          // Cancellation of a superseded query is expected.
          skippedRemoteRequests.add(requestId)
        })
    }
    if (reply.method === "Network.requestWillBeSent") {
      const { method, url } = reply.params.request
      const { hostname, pathname } = new URL(url)
      network.push({ method, hostname, pathname })
    }
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId
      const timer = setTimeout(() => {
        calls.delete(id)
        reject(Error(`CDP timeout for ${method}`))
      }, 8000)
      calls.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails)
      throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }

  const readState = () =>
    evaluate(`({
    path: location.pathname,
    dialogTitles: [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].map(
      (dialog) => ({
        title: dialog.querySelector('h1,h2,h3')?.innerText,
        hidden: Boolean(dialog.closest('[aria-hidden=true]')),
        containsFocus: dialog.contains(document.activeElement),
      }),
    ),
    label: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim().slice(0, 80),
    body: document.body?.innerText?.slice(0, 450),
  })`)

  const until = async (expression, detail) => {
    const deadline = Date.now() + 8000
    do {
      try {
        const answer = await evaluate(expression)
        if (answer) return answer
      } catch (error) {
        if (!/context|navigat|null.*reading/i.test(error.message)) throw error
      }
      await sleep(75)
    } while (Date.now() < deadline)
    throw new Error(`${detail ?? expression}: ${JSON.stringify(await readState())}`)
  }

  const activeScope = `(
    [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].reverse()
      .find((dialog) => dialog.getClientRects().length && !dialog.closest('[aria-hidden=true]'))
      ?? document.querySelector('main') ?? document.body
  )`

  const findControl = (label, scope = activeScope) => {
    const pattern =
      label instanceof RegExp
        ? label
        : new RegExp(`^${label.replace(/[.*+?^$${}()|[\]\\]/g, "\\$&")}$`, "u")
    return `Array.from((${scope})?.querySelectorAll('button, a[href], [role=button], [role=option]') ?? [])
      .find((el) => {
        const pattern = new RegExp(${quote(pattern.source)}, ${quote(pattern.flags)});
        return !el.closest('[aria-hidden=true]') &&
          el.getClientRects().length &&
          [el.getAttribute('aria-label'), el.innerText, el.textContent].some(
            (label) => label && pattern.test(label.replace(/\\s+/g, ' ').trim()),
          );
      })`
  }

  const safeCenter = async (expression) => {
    await until(`Boolean(${expression})`)
    await evaluate(`(${expression}).scrollIntoView({ block: "center", behavior: "instant" })`)
    return until(
      `(() => {
      const element = ${expression};
      if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      const cx = x + width/2;
      const cy = y + height/2;
      return element.contains(document.elementFromPoint(cx, cy)) ? { x: cx, y: cy } : null;
    })()`,
      `Control center unavailable for ${expression.slice(0, 120)}`,
    )
  }

  const click = async (label, scope) => {
    const center = await safeCenter(findControl(label, scope))
    await send("Input.dispatchMouseEvent", {
      ...center,
      type: "mousePressed",
      button: "left",
      clickCount: 1,
    })
    await send("Input.dispatchMouseEvent", {
      ...center,
      type: "mouseReleased",
      button: "left",
      clickCount: 1,
    })
  }

  const tap = async (label, scope) => {
    const center = await safeCenter(findControl(label, scope))
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [center] })
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  }

  const key = async (key, code, windowsVirtualKeyCode, modifiers = 0) => {
    const fields = { key, code, windowsVirtualKeyCode, modifiers }
    const text = key === "Enter" && modifiers === 0 ? "\r" : undefined
    await send("Input.dispatchKeyEvent", { ...fields, type: text ? "keyDown" : "rawKeyDown", text })
    await send("Input.dispatchKeyEvent", { ...fields, type: "keyUp" })
  }

  const keyboard = async (label, scope) => {
    const expression = findControl(label, scope)
    await until(
      `(() => {
      const control = ${expression};
      control?.focus();
      return Boolean(control && document.activeElement === control);
    })()`,
      `Cannot focus ${label}`,
    )
    await key("Enter", "Enter", 13)
  }

  const tabTo = async (label, limit = 24) => {
    const expression = findControl(label)
    await until(`Boolean(${expression})`)
    for (let step = 0; step < limit; step++) {
      if (await evaluate(`document.activeElement === (${expression})`)) return
      await key("Tab", "Tab", 9)
      await focusedInsideDialog()
    }
    throw new Error(`Did not reach ${label} after ${limit} tabs`)
  }

  const input = async (selector, value) => {
    await until(`Boolean(document.querySelector(${quote(selector)}))`)
    await evaluate(`document.querySelector(${quote(selector)}).focus()`)
    await key("a", "KeyA", 65, 2)
    await send("Input.insertText", { text: value })
  }

  const dialogTitle = (title) =>
    until(
      `[...(${activeScope})?.querySelectorAll('h1,h2,h3') ?? []].some(el => el.innerText.trim() === ${quote(title)})`,
      `Expected screen "${title}"`,
    )

  const request = async (
    path,
    { body, method = body === undefined ? "GET" : "POST", credentials = "include" } = {},
  ) =>
    evaluate(`fetch(${quote(`${api}/${path}`)}, {
      method: ${quote(method)},
      credentials: ${quote(credentials)},
      ${body === undefined ? "" : `headers:{'Content-Type':'application/json'},body:${quote(quote(body))}`}
    }).then(async (response) => ({
      status: response.status,
      body: await response.json().catch(() => null),
    }))`)

  const navigate = (url) => send("Page.navigate", { url })
  const screenshot = async (title) => {
    await sleep(150)
    const { data } = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(join(evidence, `${title}.png`), Buffer.from(data, "base64"))
  }

  const devices = {
    narrow: { width: 320, height: 740, deviceScaleFactor: 1, mobile: true },
    phone: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
    tablet: { width: 820, height: 830, deviceScaleFactor: 1, mobile: false },
    desktop: { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false },
  }

  const device = async (name, motion = "no-preference") => {
    const metrics = devices[name]
    await send("Emulation.setDeviceMetricsOverride", metrics)
    await send("Emulation.setTouchEmulationEnabled", { enabled: metrics.mobile })
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: motion }],
    })
    check(
      await evaluate(
        `matchMedia("(prefers-reduced-motion: reduce)").matches === ${motion === "reduce"}`,
      ),
      "Chromium did not apply the requested motion setting",
    )
  }

  async function assertFit(screen) {
    const layout = await evaluate(`({
      viewport: document.documentElement.clientWidth,
      body: document.documentElement.scrollWidth,
      parts: [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].filter(el =>
        el.getClientRects().length && !el.closest('[aria-hidden=true]')
      ).map((el) => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, x: el.getBoundingClientRect().x }))
    })`)
    check(
      layout.body <= layout.viewport + 1,
      `Horizontal page overflow on ${screen}: ${JSON.stringify(layout)}`,
    )
    check(
      layout.parts.every((part) => part.scrollWidth <= part.width + 2 && part.x >= -2),
      `Horizontal dialog overflow on ${screen}: ${JSON.stringify(layout)}`,
    )
  }

  async function focusedInsideDialog() {
    await until(
      `Boolean((${activeScope})?.contains(document.activeElement))`,
      "Focus escaped the active dialog",
    )
  }

  const recordMotion = () =>
    evaluate(`(() => {
    window.__hhMotion = []
    document.addEventListener("animationstart", (event) => {
      if (event.animationName.startsWith("hh-wizard-")) window.__hhMotion.push(event.animationName)
    })
    return true
  })()`)
  const expectMotion = (name) =>
    until(`window.__hhMotion?.includes(${quote(name)})`, `Expected visible transition ${name}`)

  const assertPressed = (label) =>
    until(
      `(${findControl(label)})?.getAttribute("aria-pressed") === "true"`,
      `Expected ${label} to remain selected`,
    )

  const register = async (tag, fromUrl) => {
    await send("Network.clearBrowserCookies")
    await navigate(`${origin}/akce`)
    await until(
      'location.pathname === "/akce" && Boolean(document.body?.querySelector("h1"))',
      "Preview app did not open",
    )
    const token = randomUUID().slice(0, 10)
    const credentials = {
      email: `onboarding-v5-${tag}-${token}@example.test`,
      password: `HobbyHub QA V5 ${tag} ${token}!2026`,
    }
    const signup = await request("auth/sign-up/email", {
      body: {
        ...credentials,
        name: "Testovací Účet",
        callbackURL: `${origin}/email-overen?from=${encodeURIComponent(fromUrl)}`,
        termsAccepted: true,
        privacyAcknowledged: true,
        ageConfirmed: true,
      },
    })
    check(
      signup.status === 200 && !signup.body?.token,
      `Sign-up status ${signup.status}, no cookie expected until verification`,
    )
    check(
      (await request("auth/get-session")).body === null,
      "Email registration opened a session before verification",
    )
    const inbox = await request("simulated-inbox", { body: credentials })
    check(
      inbox.status === 200 && inbox.body?.messages?.length,
      "The local verification email was not delivered",
    )
    const verifyUrl = await evaluate(`
      [...new DOMParser().parseFromString(${quote(inbox.body.messages[0].html)}, 'text/html').querySelectorAll('a')]
        .map((a) => a.href).find((url) => url.includes('/verify-email'))
    `)
    check(
      new URL(verifyUrl).origin === new URL(api).origin,
      "Expected verification link on the local backend",
    )
    await navigate(verifyUrl)
    await until('location.pathname === "/vitej"')
    await dialogTitle("Kde se potkáme?")
    check(
      await evaluate(`new URLSearchParams(location.search).get("from") === ${quote(fromUrl)}`),
      "Sign-in target was lost",
    )
    check(
      (await request("auth/get-session")).body?.user?.onboardingCompletedAt === null,
      "Onboarding should initially be pending",
    )
    return credentials
  }

  const saveResult = async ({ city, name = "Testovací Účet", bio = null, interestNames }) => {
    await until(
      `location.pathname === "/akce" &&
      new URLSearchParams(location.search).get("vyber") === "podle-zajmu" &&
      new URLSearchParams(location.search).get("lokalita") === ${quote(city)}`,
      "Expected filtered events for the saved locality",
    )
    const saved = await request("me/profile")
    check(
      saved.status === 200 && saved.body?.homeLocality?.slug === city,
      "Persisted locality differs from selected place",
    )
    check(saved.body.name === name, "Profile name was not saved as expected")
    check(saved.body.bio === bio, "Biography was not saved as expected")
    check(
      (saved.body.interests ?? [])
        .map(({ name }) => name)
        .sort()
        .join("|") === [...interestNames].sort().join("|"),
      "The persisted interests differ from the choices",
    )
    check(
      (await request("auth/get-session")).body?.user?.onboardingCompletedAt,
      "Completion was not persisted in the session",
    )
    return saved.body
  }

  const chooseActivities = async (activate, names) => {
    const nameBefore = await evaluate(textExpr(`(${activeScope})?.querySelector("h1,h2")`))
    for (let index = 0; index < names.length; index++) {
      const name = names[index]
      await activate(name)
      if (index < names.length - 1) {
        await dialogTitle(nameBefore)
        await assertPressed(name)
        check(
          (await readState()).dialogTitles.every(({ title }) => title !== "Máš vybráno!"),
          "Completion dialog opened before the third activity",
        )
      }
    }
    await dialogTitle("Máš vybráno!")
    await focusedInsideDialog()
  }

  const activityNames = ["Volejbal", "Turistika", "Deskové hry"]
  const bioField = 'textarea[name="bio"]'
  const nameField = 'input[name="name"]'
  const suggestion = () => evaluate(`document.querySelector(${quote(bioField)})?.value`)

  const makeProfilePhoto = async (name, background) => {
    const base64 = await evaluate(`(() => {
      const canvas = document.createElement("canvas")
      canvas.width = 96
      canvas.height = 72
      const context = canvas.getContext("2d")
      context.fillStyle = ${quote(background)}
      context.fillRect(0, 0, 96, 72)
      context.fillStyle = "#ffffff"
      context.fillRect(16, 16, 32, 32)
      return canvas.toDataURL("image/png").split(",")[1]
    })()`)
    const path = join(browserProfile, name)
    await writeFile(path, Buffer.from(base64, "base64"))
    return path
  }

  const pickPhoto = async (path) => {
    const { root } = await send("DOM.getDocument")
    const { nodeId } = await send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: 'input[type="file"][aria-label="Soubor profilové fotky"]',
    })
    check(nodeId !== 0, "Profile photo input was not rendered")
    await send("DOM.setFileInputFiles", { nodeId, files: [path] })
    await until(`document.body.innerText.includes(${quote(basename(path))})`)
  }

  const verifyProfilePhoto = async (version, credentials = "include") =>
    evaluate(`
    fetch(${quote(api)} + "/me/profile/photo/" + ${quote(version)}, { credentials: ${quote(credentials)} })
      .then(async (response) => ({
        status: response.status,
        mimeType: response.headers.get("Content-Type"),
        cacheControl: response.headers.get("Cache-Control"),
        size: (await response.blob()).size,
      }))
  `)

  async function openCategory(activate, name) {
    const switcher = "Změnit okruh"
    const grid = "#onboarding-category-choices"
    const control = findControl(switcher)
    if (await evaluate(`Boolean(${control}) && document.querySelector(${quote(grid)}).hidden`)) {
      await activate(switcher)
    }
    await activate(name)
    const selector = findControl(switcher)
    await until(`(${selector})?.getAttribute("aria-expanded") === "false"`)
    check(
      (await evaluate(`document.querySelector(${quote(grid)}).hidden`)) === true,
      "Category choices covered the new results after selecting a category",
    )
  }
  const customBio = "Hledám partu na deskovky i výlety. Zvládnu donést svačinu."

  await send("Page.enable")
  await send("Runtime.enable")
  await send("Network.enable")
  await send("Network.setBlockedURLs", { urls: ["*tile.openstreetmap.org*"] })
  await send("Fetch.enable", {
    patterns: [
      { urlPattern: "https://photon.komoot.io/api/*" },
      { urlPattern: `${api}/me/profile/onboarding` },
      { urlPattern: `${api}/me/profile/onboarding/skip` },
    ],
  })

  async function scenario(name, test) {
    const only = mode.find((argument) => argument.startsWith("--only="))?.slice(7)
    if (only && !name.includes(only)) return
    try {
      await test()
      console.log(`PASS ${name}`)
      results.push({ name, status: "pass" })
    } catch (error) {
      console.error(`FAIL ${name}: ${error.message}`)
      results.push({ name, status: "fail", message: error.message })
      await screenshot(`failure-${results.length}`).catch(() => {})
    }
  }

  if (mode.includes("--smoke")) {
    await scenario("Browser automation smoke", async () => {
      const html = `<!doctype html><meta name="viewport" content="width=device-width">
        <div role="dialog" aria-labelledby="name"><h1 id="name">Pokus</h1>
          <input id="search" type="search">
          <button aria-pressed="false" onclick="this.setAttribute('aria-pressed','true');this.focus()">Praha 8</button>
          <button onclick="this.textContent='Hotovo';this.focus()">Další návrh</button>
        </div>`
      await navigate(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await device("phone")
      await dialogTitle("Pokus")
      await input("#search", "Náměstí")
      check(
        (await evaluate('document.querySelector("#search").value')) === "Náměstí",
        "Typing did not reach the field",
      )
      await tap(/^Praha 8(?:$|\s)/)
      await assertPressed("Praha 8")
      await device("desktop", "reduce")
      await keyboard("Další návrh")
      await focusedInsideDialog()
      await until(`Boolean(${findControl("Hotovo")})`)
      await assertFit("simulation")
      await screenshot("smoke")
    })
    console.log(`Evidence: ${evidence}`)
    if (results.some(({ status }) => status === "fail") || errors.length) process.exitCode = 1
  } else {
    await scenario(
      "390 px / touch • direct city, category switching, biography drafts, and private profile photo",
      async () => {
        await device("phone")
        const login = await register("touch", "/skupiny")
        await assertFit("start phone")
        await screenshot("01-mobile-location")
        const fetchMark = network.length
        await input("#onboarding-locality", "Praha 8")
        const district = /^Praha 8(?:$|\s)/
        await until(`Boolean(${findControl(district)})`, "A known city district should appear")
        await sleep(360)
        const placeLookups = network
          .slice(fetchMark)
          .filter(({ hostname }) => hostname === "photon.komoot.io")
        check(placeLookups.length === 0, "A known district triggered a second place-search service")
        check(
          (await request("me/profile")).body?.homeLocality === null,
          "Typing or rendering a suggestion changed locality",
        )
        await tap(district)
        await dialogTitle("Co tě baví?")
        await assertFit("activities phone")
        await focusedInsideDialog()
        await screenshot("02-mobile-categories")

        await recordMotion()
        await openCategory(tap, /^Týmové sporty(?:$|\s)/)
        await until(
          `Boolean(${findControl("Volejbal")})`,
          "The category did not reveal its activity cards",
        )
        await expectMotion("hh-wizard-category-reveal")
        await expectMotion("hh-wizard-cover")
        check(
          await evaluate('document.querySelectorAll("#onboarding-results-heading").length === 1'),
          "The category transition left a stale heading in the chooser",
        )
        await screenshot("03-mobile-category")
        await tap("Volejbal")
        await assertPressed("Volejbal")
        await expectMotion("hh-wizard-flight")
        await openCategory(tap, /^Outdoor(?:$|\s)/)
        await until(`!Boolean(${findControl("Volejbal")})`)
        await tap(/^Turistika(?:$|\s)/i)
        await assertPressed("Turistika")
        await openCategory(tap, /^Hry(?:$|\s)/)
        await tap(/^Deskové hry(?:$|\s)/)
        await dialogTitle("Máš vybráno!")
        await focusedInsideDialog()
        await expectMotion("hh-wizard-ticket")
        const backdrops = await evaluate(`[...document.querySelectorAll(".hh-wizard-overlay")]
          .filter((layer) => layer.dataset.state === "open")
          .map((layer) => {
            const style = getComputedStyle(layer)
            return { color: style.backgroundColor, blur: style.backdropFilter }
          })`)
        check(backdrops.length === 2, "Expected both onboarding modal layers to be open")
        check(
          backdrops[0].color !== backdrops[1].color && backdrops[1].blur !== "none",
          "The selection dialog failed to dim the underlying chooser",
        )
        await assertFit("completion phone")
        await screenshot("04-mobile-completion")

        await tap("Zpět k výběru")
        await dialogTitle("Co tě baví?")
        check(
          !(await readState()).dialogTitles.some(
            ({ title, hidden }) => title === "Máš vybráno!" && !hidden,
          ),
          "Completion immediately reopened without selection changes",
        )
        await assertPressed("Deskové hry")
        await tap("Deskové hry")
        await tap("Deskové hry")
        await dialogTitle("Máš vybráno!")
        await tap("Povědět něco o sobě")
        await dialogTitle("Představ se partě")
        await assertFit("bio phone")
        await screenshot("05-mobile-bio")

        const carouselControls = await evaluate(`Boolean(
          document.querySelector("#onboarding-bio-catalog-count") ||
          ${findControl("Další návrh")} ||
          ${findControl("Předchozí návrh")}
        )`)
        check(!carouselControls, "Profile still shows the pagination UI")
        check((await suggestion()) === "", "The optional bio should start empty")
        const variants = new Set()
        let first
        for (let index = 0; index < 60; index++) {
          await tap("Navrhnout text")
          const next = await suggestion()
          if (index === 0) first = next
          check(next.length <= 500 && next.length > 15, `Draft ${index + 1} has an invalid length`)
          check(!variants.has(next), `Repeated bio variant at position ${index + 1}`)
          variants.add(next)
        }
        await tap("Navrhnout text")
        check((await suggestion()) === first, "The last draft should wrap back to the first")
        console.log(`  ${variants.size} distinct suggestions through touch events`)

        await input(bioField, customBio)
        await tap("Navrhnout text")
        check((await suggestion()) === customBio, "Suggesting silently overwrote the owner's draft")
        await tap("Ponechat rozepsané")
        check((await suggestion()) === customBio, "Cancelling replacement changed the draft")

        const name = "Martin Testovací"
        await input(nameField, name)
        const corruptPhoto = join(browserProfile, "portrait-corrupt.png")
        await writeFile(corruptPhoto, "not an image")
        await pickPhoto(corruptPhoto)
        await tap("Uložit a ukázat akce")
        await until('document.querySelector("[role=alert]")?.innerText.includes("formátu JPEG")')
        const refused = await request("me/profile")
        const session = await request("auth/get-session")
        check(
          refused.body?.name === "Testovací Účet" &&
            refused.body?.bio === null &&
            refused.body?.homeLocality === null &&
            refused.body?.interests?.length === 0 &&
            refused.body?.photoVersion === null &&
            session.body?.user?.onboardingCompletedAt === null,
          "A refused upload saved part of the onboarding",
        )
        check((await suggestion()) === customBio, "Retry lost the draft")

        const photoPath = await makeProfilePhoto("portrait-original.png", "#31543d")
        await pickPhoto(photoPath)
        await until(`Boolean(document.querySelector('img[src^="blob:"]'))`)
        await tap("Zpět")
        await dialogTitle("Co tě baví?")
        await tap("Pokračovat s výběrem")
        await dialogTitle("Máš vybráno!")
        await tap("Povědět něco o sobě")
        await dialogTitle("Představ se partě")
        check((await suggestion()) === customBio, "Returning from the picker lost the draft bio")
        check(
          (await evaluate(`document.querySelector(${quote(nameField)})?.value`)) === name,
          "Returning from the picker lost the edited name",
        )
        await until('document.body.innerText.includes("portrait-original.png")')
        await tap("Uložit a ukázat akce")
        const profile = await saveResult({
          city: "praha-8",
          name,
          bio: customBio,
          interestNames: activityNames,
        })
        check(Boolean(profile.photoVersion), "Private profile is missing the uploaded photo")
        const photo = await verifyProfilePhoto(profile.photoVersion)
        check(
          photo.status === 200 &&
            photo.mimeType === "image/webp" &&
            photo.cacheControl === "private, no-store" &&
            photo.size > 0,
          "Owner read of the new photo was missing WebP bytes or no-store headers",
        )
        check(
          (await verifyProfilePhoto(profile.photoVersion, "omit")).status === 401,
          "Signed-out visitor could fetch the owner's photo",
        )
        check(
          (await request(`images/${profile.photoVersion}`, { credentials: "omit" })).status === 404,
          "Signed-out image CDN exposes the owner photo",
        )
        const namedPublic = await request(`users/${encodeURIComponent(profile.id)}`, {
          credentials: "omit",
        })
        check(
          namedPublic.status === 200 &&
            !JSON.stringify(namedPublic.body).includes(customBio) &&
            !JSON.stringify(namedPublic.body).includes(profile.photoVersion),
          "Private bio leaked in the public profile",
        )
        await navigate(`${origin}/profil`)
        await until(
          `document.body?.innerText.includes(${quote(customBio)})`,
          "Private profile does not show the saved bio",
        )
        await until(
          `[...document.images].some((img) => img.src.endsWith(${quote(profile.photoVersion)}) && img.naturalWidth > 0)`,
        )
        await navigate(`${origin}/profil/upravit`)
        await until(`Boolean(${findControl("Vyměnit fotku")})`)
        const replacementPath = await makeProfilePhoto("portrait-replacement.png", "#cf5b22")
        await pickPhoto(replacementPath)
        await tap("Uložit změny")
        await until('document.body.innerText.includes("Profil je uložený.")')
        const replaced = (await request("me/profile")).body
        check(
          replaced.photoVersion && replaced.photoVersion !== profile.photoVersion,
          "Photo replacement reused the old version",
        )
        check(
          (await verifyProfilePhoto(profile.photoVersion)).status === 404,
          "An obsolete photo version remained available",
        )
        await tap("Odebrat fotku")
        await tap("Uložit změny")
        await until('document.body.innerText.includes("Profil je uložený.")')
        const removed = (await request("me/profile")).body
        check(removed.photoVersion === null, "Removing a photo kept an active version")
        check(
          (await verifyProfilePhoto(replaced.photoVersion)).status === 404,
          "Removed photo was still readable",
        )
        await request("auth/sign-out", { body: {} })
        const again = await request("auth/sign-in/email", { body: login })
        check(again.status === 200, "Signing back in failed")
        await navigate(`${origin}/vitej`)
        await until(
          'location.pathname === "/akce" && Boolean(document.body?.querySelector("h1"))',
          "Completed account reentered onboarding",
        )
      },
    )

    await scenario(
      "1280 px / keyboard and reduced motion • city switch, category bypass, skip bio",
      async () => {
        await device("desktop", "reduce")
        await register("keyboard", "/akce")
        await assertFit("start desktop")
        await device("tablet", "reduce")
        await assertFit("start 820 px screenshot")
        await screenshot("09-tablet-location")
        await device("desktop", "reduce")
        await tabTo(/^Brno(?:$|\s)/)
        await key("Enter", "Enter", 13)
        await dialogTitle("Co tě baví?")
        await focusedInsideDialog()
        await keyboard(/^Zpět(?:$|\s)/)
        await dialogTitle("Kde se potkáme?")
        await until(
          `Boolean(${findControl(/^Brno Poslední výběr$/)})`,
          "Previous pick did not return as an explicit option",
        )
        const remoteSearchMark = network.length
        await input("#onboarding-locality", "Kocouří obec")
        await sleep(360)
        const remoteRequests = network
          .slice(remoteSearchMark)
          .filter(({ hostname }) => hostname === "photon.komoot.io")
        check(
          remoteRequests.length === 1,
          "An unknown municipality should fall back to one remote lookup",
        )
        await input("#onboarding-locality", "Plzen")
        await until(
          `Boolean(${findControl(/^Plzeň(?:$|\s)/)})`,
          "A diacritic-free catalog lookup did not match Plzeň",
        )
        await sleep(620)
        check(
          !(await evaluate(`Boolean(${findControl(/^Kocouří obec/)} )`)),
          "An earlier remote result reappeared after changing the query",
        )
        await recordMotion()
        await key("Enter", "Enter", 13)
        await dialogTitle("Co tě baví?")
        await assertFit("activities desktop")
        await screenshot("06-desktop-activities")

        const animations = await evaluate(`document.getAnimations({ subtree: true })
      .filter((animation) => animation.playState === "running")
      .filter((animation) => animation.effect?.target?.closest?.('[role=dialog]'))
      .map((animation) => animation.animationName ?? "transition")`)
        check(
          animations.length === 0,
          `Reduced-motion flow is still animating: ${animations.join(", ")}`,
        )

        if (await evaluate(`Boolean(${findControl(/^Všechny aktivity(?:$|\s)/)})`))
          await keyboard(/^Všechny aktivity(?:$|\s)/)
        await chooseActivities(keyboard, activityNames)
        await screenshot("07-desktop-completion")
        await key("Tab", "Tab", 9)
        await focusedInsideDialog()
        await key("Tab", "Tab", 9, 8)
        await focusedInsideDialog()

        await tabTo("Povědět něco o sobě")
        await key("Enter", "Enter", 13)
        await dialogTitle("Představ se partě")
        await keyboard("Navrhnout text")
        check((await suggestion()).length > 15, "Cannot accept a suggestion with keyboard")
        await input(nameField, "Jméno Jen Rozepsané")
        await keyboard("Teď ne")
        check(
          await evaluate("window.__hhMotion.length === 0"),
          "Reduced motion still played onboarding keyframes",
        )
        await saveResult({ city: "plzen", interestNames: activityNames })
      },
    )

    await scenario(
      "320 px / touch • direct event action without bio, recoverable API failure",
      async () => {
        await device("narrow")
        await register("small", "/akce")
        await assertFit("start narrow")
        await tap(/^Brno(?:$|\s)/)
        await dialogTitle("Co tě baví?")
        if (await evaluate(`Boolean(${findControl(/^Všechny aktivity(?:$|\s)/)})`))
          await tap(/^Všechny aktivity(?:$|\s)/)
        await chooseActivities(tap, activityNames)
        await assertFit("completion narrow")
        await screenshot("08-narrow-completion")
        await key("Escape", "Escape", 27)
        await dialogTitle("Co tě baví?")
        await focusedInsideDialog()
        await assertPressed("Deskové hry")
        await tap("Pokračovat s výběrem")
        await dialogTitle("Máš vybráno!")
        failNextSave = true
        await tap("Ukázat akce")
        await until(
          'document.querySelector("[role=alert]")?.innerText.includes("Nastavení se nepodařilo uložit")',
        )
        await dialogTitle("Máš vybráno!")
        const pending = await request("auth/get-session")
        check(
          pending.body?.user?.onboardingCompletedAt === null,
          "Failed save marked onboarding complete",
        )
        await tap("Ukázat akce")
        await saveResult({ city: "brno", interestNames: activityNames })
      },
    )

    await scenario(
      "820 px / pointer and keyboard • explicit exit, cancel and persistent skip",
      async () => {
        await device("tablet")
        const login = await register("exit", "/skupiny")
        await keyboard(/^Brno(?:$|\s)/)
        await dialogTitle("Co tě baví?")
        const card = findControl("Volejbal")
        await until(
          `(() => {
            const element = ${card};
            return Boolean(element && element.closest(".hh-wizard-stage").getAnimations({ subtree: true })
              .every((animation) => animation.playState !== "running"));
          })()`,
          "The activity gallery did not settle",
        )
        const center = await safeCenter(card)
        if (await evaluate('matchMedia("(hover: hover)").matches')) {
          await send("Input.dispatchMouseEvent", { ...center, type: "mouseMoved" })
        } else {
          // Headless Chromium can report no hover-capable pointer at a desktop viewport.
          // The same zoom is exposed through visible keyboard focus.
          await evaluate(`(${card}).focus({ preventScroll: true })`)
        }
        await until(
          `parseFloat(getComputedStyle((${card}).querySelector("img")).scale) > 1.03`,
          "Card photo did not react to hover or visible focus after the entrance animation",
        )
        await click("Volejbal")
        await assertPressed("Volejbal")
        await keyboard("Zavřít průvodce")
        await dialogTitle("Odejít z průvodce?")
        await assertFit("exit confirmation")
        await focusedInsideDialog()
        await keyboard("Zůstat v průvodci")
        await dialogTitle("Co tě baví?")
        await assertPressed("Volejbal")
        const pending = await request("auth/get-session")
        check(
          pending.body?.user?.onboardingCompletedAt === null,
          "Cancelling exit completed onboarding",
        )

        await keyboard("Zavřít průvodce")
        await dialogTitle("Odejít z průvodce?")
        await keyboard("Odejít bez uložení")
        await until(
          'location.pathname === "/skupiny"',
          "Explicit exit did not recover the original route",
        )
        const profile = await request("me/profile")
        check(profile.status === 200, "No private profile after exiting")
        check(profile.body.homeLocality === null, "Exiting persisted a draft locality")
        check(profile.body.interests.length === 0, "Exiting persisted draft interests")
        check(profile.body.bio === null, "Exiting changed the existing bio")
        const finished = await request("auth/get-session")
        check(finished.body?.user?.onboardingCompletedAt, "Explicit exit did not persist")
        await request("auth/sign-out", { body: {} })
        const response = await request("auth/sign-in/email", { body: login })
        check(response.status === 200, "Cannot sign back in after explicit exit")
        await navigate(`${origin}/akce`)
        await until('location.pathname === "/akce" && Boolean(document.querySelector("h1"))')
        check(
          !(await evaluate('Boolean(document.querySelector("#onboarding-locality"))')),
          "Onboarding returned after exit",
        )
      },
    )

    await scenario("390 px / exit from the optional profile", async () => {
      await device("phone")
      const login = await register("profile-exit", "/akce")
      await tap(/^Brno(?:$|\s)/)
      await dialogTitle("Co tě baví?")
      await chooseActivities(tap, activityNames)
      await tap("Povědět něco o sobě")
      await dialogTitle("Představ se partě")
      await input(nameField, "Jana Testovací")
      await input(bioField, "Rozepsaný text zůstane jen v průvodci.")
      const attempts = () =>
        network.filter(
          ({ method, pathname }) =>
            method === "POST" && pathname.endsWith("/me/profile/onboarding/skip"),
        ).length
      const before = attempts()
      await tap("Zavřít průvodce")
      await dialogTitle("Odejít z průvodce?")
      skipFailures = 1
      skipFailureStatus = 403
      await tap("Odejít bez uložení")
      await until(
        'document.querySelector("[role=alert]")?.innerText.includes("Požadavek nepřišel z HobbyHubu.")',
        "A refused request should show the backend reason",
      )
      check(attempts() === before + 1, "Skip should retry only transient errors")

      skipFailures = 2
      skipFailureStatus = 503
      await tap("Odejít bez uložení")
      await until(
        'document.querySelector("[role=alert]")?.innerText.includes("Průvodce se nepodařilo přeskočit")',
        "A persistent error should leave the exit dialog open and explain the failed action",
      )
      check(attempts() === before + 3, "Skip should retry once after a service error")
      await dialogTitle("Odejít z průvodce?")
      const pending = await request("auth/get-session")
      check(
        pending.body?.user?.onboardingCompletedAt === null,
        "A failed skip marked onboarding complete",
      )
      await tap("Zůstat v průvodci")
      await dialogTitle("Představ se partě")
      check(
        (await suggestion()) === "Rozepsaný text zůstane jen v průvodci.",
        "Cancelling the failed exit lost the draft",
      )
      await tap("Zavřít průvodce")
      await dialogTitle("Odejít z průvodce?")
      skipFailures = 1
      await tap("Odejít bez uložení")
      await until(
        'location.pathname === "/akce" && !document.querySelector("[role=dialog]")',
        "A successful automatic retry should exit to the events page",
      )
      check(attempts() === before + 5, "A single failure should recover with one automatic retry")
      const profile = await request("me/profile")
      check(profile.status === 200, "The signed-in profile could not be read after exiting")
      check(profile.body.name === "Testovací Účet", "Exiting saved the edited name")
      check(profile.body.bio === null, "Exiting saved the bio draft")
      check(profile.body.homeLocality === null, "Exiting saved the picked locality")
      check(profile.body.interests.length === 0, "Exiting saved the picked interests")
      check(profile.body.photoVersion === null, "Exiting added a photo")
      const finished = await request("auth/get-session")
      check(finished.body?.user?.onboardingCompletedAt, "The explicit skip was not persisted")
      await request("auth/sign-out", { body: {} })
      const signedIn = await request("auth/sign-in/email", { body: login })
      check(signedIn.status === 200, "Sign-in failed after skipping")
      await navigate(`${origin}/akce`)
      await until('location.pathname === "/akce" && Boolean(document.querySelector("h1"))')
      check(
        !(await evaluate('Boolean(document.querySelector("#onboarding-locality"))')),
        "The wizard reopened after skipping it from the profile",
      )
    })

    await scenario(
      "API / profile photo ownership, atomic completion, invalid uploads and concurrent retry",
      async () => {
        await device("desktop", "reduce")
        await exerciseOnboardingProfileContract({
          api,
          evaluate,
          register,
          request,
          verifyProfilePhoto,
        })
      },
    )

    await writeFile(
      join(evidence, "report.json"),
      JSON.stringify(
        { results, errors, network, cancelledRemoteRequests: skippedRemoteRequests.size },
        null,
        2,
      ),
    )
    console.log(`Evidence: ${evidence}`)
    if (errors.length) {
      console.error(`Uncaught browser exceptions: ${errors.length}`)
      for (const error of errors.slice(0, 3)) console.error(error)
    }
    if (results.some(({ status }) => status === "fail") || errors.length) process.exitCode = 1
  }
} finally {
  socket?.close()
  browser.kill()
  await sleep(300)
  await rm(browserProfile, { recursive: true, force: true })
}
