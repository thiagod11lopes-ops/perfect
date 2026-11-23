# Prompt — UI smoke test via headless Chrome + CDP

Use when you've made a visible change and need to confirm it actually
renders (per `SYSTEM_PROMPT.md` §3 "Smoke-test the UI").

---

## Steps

1. Start the dev server in the background:
   ```bash
   nohup npx vite --host 127.0.0.1 --port 5174 > /tmp/snake-dev.log 2>&1 &
   disown
   sleep 2
   ```
2. Take a headless screenshot of the menu:
   ```bash
   timeout 12 google-chrome --headless=new --disable-gpu --no-sandbox \
     --window-size=1280,800 --virtual-time-budget=3500 \
     --screenshot=/tmp/snake-menu.png \
     http://127.0.0.1:5174/
   ```
3. Read the file with the `Read` tool to inspect it visually.
4. (Optional) For gameplay screen, drive the page via CDP — start Chrome
   with `--remote-debugging-port=9222`, then open a WebSocket to the
   `webSocketDebuggerUrl` from `http://127.0.0.1:9222/json` and dispatch
   key events:
   ```js
   await send('Input.dispatchKeyEvent', {
     type: 'keyDown', code: 'Enter', key: 'Enter',
     windowsVirtualKeyCode: 13,
   });
   ```
   Then `Page.captureScreenshot`.
5. **Always tear down** afterward:
   ```bash
   pkill -f 'google-chrome.*9222' 2>/dev/null
   pkill -f 'vite.*5174' 2>/dev/null
   ```

---

## Gotchas

- `--virtual-time-budget` accelerates RAF but freezes wall-clock — the
  30 Hz-gated background canvas may render incorrectly. For background
  verification, use real time via CDP.
- The `node_modules/ws` package is needed for CDP scripts. Install it
  in `/tmp/node_modules` to keep the project clean:
  `cd /tmp && npm init -y && npm install ws`.
- Don't reuse the dev server's port if you have HMR running — pick
  5174/5175 for tests.
