# Minka

A private, self-hosted family app. One dashboard for the household's shopping
list, meals and recipes, fridge, calendar, tasks, budget, home maintenance and
notes. It installs on a phone like an app, and still opens without a network.

Minka is developed in French, and each instance speaks one language, chosen
when it is deployed. This guide sets up an **English-speaking instance**. The
developer documentation — architecture, module contract, tests — is in
[README.md](README.md), in French; so are the code's identifiers and comments,
and the addresses of the pages (`/courses`, `/recettes`).

---

## What's inside

| Module | What it does |
| --- | --- |
| **Shopping list** | One list for the whole household, made to be used one-handed in the shop. Items are sorted by aisle as they are added; press and hold an item to move it to another aisle, and Minka remembers. |
| **Meals** | Lunch and dinner, Monday to Sunday. A slot holds a recipe or plain text — "Leftovers", "Eating out". Meals can be dragged to another day, a week typed as text can be imported, and the week's ingredients sent to the shopping list. |
| **Recipes** | The household's recipes, searched by title and by ingredient, with free tags. A recipe pasted from a website is imported in one go; cooking mode shows the steps full screen, ticks them off and keeps the screen on. |
| **Fridge** | What is left, and above all what is about to go off: the soonest use-by dates first. |
| **Calendar** | The household's upcoming events, day by day, each for someone or for everyone — stays over several days included. |
| **Tasks** | One list sorted by due date, with a filter per person. A recurring task reschedules itself when ticked. |
| **Budget** | Where the month's money goes: a total, categories with an optional monthly limit, and spending entered in three seconds. |
| **Maintenance** | The house's upkeep plan, room by room — what needs descaling, replacing, checking — rescheduled from the day the job was done. |
| **Notes** | What fits nowhere else: codes, measurements, gift ideas. Saved as you type; pinned notes stay on top. |

Also: **household members** without an account — children, pets — to whom
events and tasks can be assigned; a **dark mode** that follows the phone's
setting; and an optional **[Claude connector](#claude-connector-optional)**,
through which Claude reads your meals, recipes and fridge, and plans the week
with you.

---

## How it fits together

```
browser ──HTTPS──► your reverse proxy ──HTTP──► <server>:8070
                     (TLS certificate)               │
                                                     ▼
                                              minka-web (nginx)
                                    /api/* ──────────┴──► minka-api:3000
                                    /*     ─────────────► React app
```

| Container | Role | Port |
| --- | --- | --- |
| `minka-web` | Serves the interface and relays `/api` | `APP_PORT` (8070) → 80 |
| `minka-api` | Node/Express API, SQLite database | internal only |

`minka-api` publishes no port: the API can only be reached through
`minka-web`, on the stack's own network. All the data lives in one SQLite
file, `data/minka.db`, next to its backups.

---

## Requirements

- **Docker with the Compose plugin** (`docker compose`). The images are built on
  your server, from the source; the first build takes a few minutes.
- **A domain name** — say `minka.example.com` — and **a reverse proxy** serving
  it over HTTPS, on the standard port: Caddy, nginx, Traefik, Nginx Proxy
  Manager… HTTPS is not optional. Signing in relies on a `Secure` cookie, and
  installing the app on a phone needs a service worker, which browsers only
  allow over HTTPS.

---

## Installation

### 1. Get the code and the settings file

```bash
git clone <repository URL> minka
cd minka
cp .env.example.en .env
```

### 2. Prepare the data folder

Do this before the first start. The API does not run as root: if Docker
creates `data/` itself, the folder belongs to root and the API cannot write its
database.

```bash
mkdir -p data
sudo chown -R 99:100 data
```

`99:100` is the default of `PUID` and `PGID` in `.env` (`nobody:users` on
unRAID). On another Linux host you may prefer your own user: set `PUID` and
`PGID` to what `id -u` and `id -g` print, and give the folder to that user
instead.

### 3. Fill in `.env`

Every variable is explained in the file. At the very least:

- `SESSION_SECRET`, generated with `openssl rand -base64 48`;
- the first account — `MINKA_USER1_USERNAME`, `MINKA_USER1_PASSWORD` (8
  characters at least) and `MINKA_USER1_NAME`, the name shown in the app — and
  the second one if there are two of you;
- `MINKA_CURRENCY` and `TZ`;
- `APP_PORT`, if 8070 is already taken on the server.

`MINKA_LANG=en` is already set by the English template.

### 4. Build and start

```bash
docker compose up -d --build
```

The database is created at the first start, in `data/minka.db`, together with
the accounts declared in `.env`. `minka-web` waits for the API to be healthy
before starting.

### 5. Check that everything runs

```bash
docker compose ps
curl http://127.0.0.1:8070/api/health
```

The expected answer is `{"status":"ok","uptime":…,"modules":[…]}`. If
`minka-api` keeps restarting, its log says why — every configuration error is
spelled out:

```bash
docker compose logs minka-api
```

Then point your reverse proxy at Minka ([below](#reverse-proxy)), and open
`https://minka.example.com`.

> `docker-compose.yml` is commented in French, and its `net.unraid.docker.*`
> labels are only read by unRAID's Docker page: elsewhere they do nothing. It
> needs no change, unless you want [more than two accounts](#accounts).

---

## Reverse proxy

Forward your domain to `http://<server address>:8070` (the `APP_PORT`), with an
HTTPS certificate. Minka's own nginx does the rest: it serves the app with the
right cache headers, and relays `/api` to the API. The proxy must:

- **keep the `Host` header**, or pass it on as `X-Forwarded-Host`. The API
  checks that every change comes from the domain it is called on; a proxy that
  rewrites `Host` makes every save fail with *"The request's origin does not
  match the application's domain."*;
- **send `X-Forwarded-For` and `X-Forwarded-Proto`**, as almost all do by
  default;
- **cache nothing**. Minka's nginx already sets the cache headers — immutable
  for the files whose name carries a hash, `no-cache` for `index.html`, `sw.js`
  and the manifest. A proxy cache would freeze phones on an old version of the
  app after each update.

HSTS, if you want it, is the proxy's job: Minka's nginx does not set it.

**Caddy**, certificate included:

```
minka.example.com {
	reverse_proxy 192.168.1.10:8070
}
```

**nginx**:

```nginx
server {
    listen 443 ssl;
    server_name minka.example.com;

    ssl_certificate     /etc/letsencrypt/live/minka.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minka.example.com/privkey.pem;

    location / {
        proxy_pass http://192.168.1.10:8070;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Nginx Proxy Manager**: a *Proxy Host* to `http`, the server's address and
port `8070`, with *Block Common Exploits*, a Let's Encrypt certificate, *Force
SSL*, *HTTP/2* and *HSTS* — and **without *Cache Assets***, which would cache
`index.html` and `sw.js`.

### `TRUST_PROXY`

The number of proxies between the visitor and the API, Minka's own nginx
included. The API needs it to find the visitor's real address, for the sign-in
rate limit (10 attempts in 15 minutes). If it is wrong, the limit applies to
the proxy's address — to everyone at once: a few failed attempts would lock the
whole household out.

- `2` — behind one reverse proxy (default);
- `1` — nothing in front of Minka's nginx;
- `3` — another proxy in front of yours: a CDN, or a tunnel that reaches your
  reverse proxy.

### Plain HTTP

Use the HTTPS address. On `http://<server address>:8070`, the pages load but
**signing in fails**, with *"The request's origin does not match the
application's domain."*: Minka's nginx passes the host name on without its
port, so the origin check cannot match. Behind your reverse proxy, on the
standard HTTPS port, the question does not arise. And over plain HTTP, the
browser would refuse the session cookie anyway: it is `Secure`, as
`SESSION_COOKIE_SECURE=true` requires.

The plain address is still handy to check that Minka answers:
`curl http://127.0.0.1:8070/api/health`.

---

## Accounts

Minka has no sign-up page: accounts are declared in `.env`, and created when
the API starts if they do not exist yet.

- After the first sign-in, everyone should replace the password written in
  `.env`: **My account**, top right → **Change password**.
- An existing account is never rewritten from `.env`: editing it later changes
  nothing, and a restart never brings an old password back.
- **More accounts**: continue the numbering in `.env` (`MINKA_USER3_USERNAME`,
  `MINKA_USER3_PASSWORD`, `MINKA_USER3_NAME`), add the same three variables to
  the `environment:` block of `minka-api` in `docker-compose.yml` — it only
  passes the first two on — then run `docker compose up -d`:

  ```yaml
        MINKA_USER3_USERNAME: ${MINKA_USER3_USERNAME:-}
        MINKA_USER3_PASSWORD: ${MINKA_USER3_PASSWORD:-}
        MINKA_USER3_NAME: ${MINKA_USER3_NAME:-}
  ```

- **Children, pets, anyone without an account** are household members, not
  accounts: add them from Calendar or Tasks → **Manage**. Events and tasks can
  then be assigned to them.

### Forgotten password

There is no reset by email. From the server, in the `minka` folder — replace
`alex` with the username:

```bash
read -rs -p 'New password: ' NEW_PASSWORD; echo
docker compose exec -e NEW_PASSWORD="$NEW_PASSWORD" minka-api node -e "
  const password = process.env.NEW_PASSWORD ?? '';
  if (password.length < 8) {
    console.error('The password must be at least 8 characters long.');
    process.exit(1);
  }
  const db = require('better-sqlite3')('/data/minka.db');
  const hash = require('bcryptjs').hashSync(password, 12);
  const { changes } = db
    .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
    .run(hash, process.argv[1]);
  console.log(changes === 1 ? 'Password changed.' : 'No such account.');
" alex
unset NEW_PASSWORD
```

The password is typed without being shown, and stays out of the shell history.
Sessions already open stay open; to sign every device out, change
`SESSION_SECRET` and run `docker compose up -d`.

---

## Language and currency

- `MINKA_LANG=en` — the interface, the API's messages, the logs and the Claude
  connector are in English. British English: the day comes before the month,
  "Monday 5 October".
- `MINKA_CURRENCY` — the budget's currency, as an ISO 4217 code (`GBP`, `EUR`,
  `USD`…). The budget counts in hundredths, so only currencies with two decimal
  places are accepted: the build refuses the yen, for instance.

The interface is compiled in the language of the instance, with its currency:
changing either means rebuilding, `docker compose up -d --build`. What has
already been entered does not change. What Minka creates at its first start —
the maintenance plan — is created in the language of the instance, and stays
that way.

What reads English:

- the **shopping list** sorts items with an English dictionary of some 580
  words and phrases — "apple juice" is a drink, "frozen peas" frozen food. An
  item in the wrong aisle can be moved, and the correction is learned;
- the **recipe import** reads recipes pasted from English-language websites —
  "Serves 4", "2 cloves of garlic", "1½ cups milk", "STEP 1";
- the **week import** reads "Monday", "Lunch: …", "Dinner: …" — or "Tea: …".

---

## Good to know

- **Maintenance** starts with 59 jobs: the English version of the author's own
  house, heating oil tank and loft bed included. Remove what does not apply,
  add what is missing.
- **On a phone**, open the site in the browser and add it to the home screen
  (Safari: Share → *Add to Home Screen*; Chrome: menu → *Install app* or *Add
  to Home screen*). It then opens like an app.
- **Offline**, the app opens and shows the last data it saw, with a banner
  saying how old it is. Changes made offline are not saved.
- **After an update**, the installed app shows *"A new version of Minka is
  available."* and an **Update** button.

---

## Backups

**Minka backs itself up**, every night at 3 a.m., and at startup if there is no
backup from that day yet — right after an update is when a recent copy is most
useful. The last 14 are kept, the oldest removed. Nothing to install.

The files land in `data/backups/`, named `minka-YYYY-MM-DD.db`. The time, the
number kept and the destination are set in `.env`. To check that they run:

```bash
docker compose logs minka-api | grep backup
```

To take one now, before a risky operation:

```bash
docker compose exec minka-api node -e "
  require('better-sqlite3')('/data/minka.db').prepare('VACUUM INTO ?').run(process.argv[1]);
" /data/minka-before-update.db
```

The copy lands in `data/`, next to the database, and stays there until you
delete it; the file name must not be taken yet.

### What this protects, and what it does not

By default the backups live on the same disk as the database: they cover
mistakes and failed updates, **not a disk failure**. To keep them elsewhere,
mount another folder in the `minka-api` service — `docker-compose.yml` has the
line to uncomment — and point `BACKUP_DIR` at it. The folder must be writable
by `PUID:PGID`.

### Restore

```bash
docker compose stop minka-api
cp -a data/backups/minka-2026-10-04.db data/minka.db
rm -f data/minka.db-wal data/minka.db-shm
docker compose start minka-api
```

The `-wal` and `-shm` files are the journals of the old database, unrelated to
the one just put back. A backup made by Minka is a complete, self-contained
file that needs neither.

Why not simply copy the database? It runs in WAL mode: recent writes live in
`minka.db-wal` until they are merged, and `minka.db` copied alone is a
truncated database. Minka's backups use SQLite's `VACUUM INTO`, which writes a
complete, consistent copy without stopping the service.

---

## Updating

```bash
git pull
docker compose up -d --build
```

The database migrations run by themselves at startup.

---

## Claude connector (optional)

In a Claude project on claude.ai, Claude can read what you have eaten lately,
your recipes and your fridge, suggest the week's meals and — once you agree —
put them in Minka, full recipes included: steps, servings and tags, ready for
cooking mode. No more copying and pasting. It goes through the MCP protocol, at
`/api/mcp`.

| Tool | What it does |
| --- | --- |
| `read_meal_plan` | The meal plan day by day, empty slots included. With no parameters: the past four weeks, the current week and the next one, and today's date |
| `list_recipes` | The recipe collection: exact titles, tags, ingredient names, and whether each recipe has its method |
| `read_recipe` | A whole recipe |
| `read_fridge` | The fridge's contents, the soonest dates first |
| `plan_meals` | Plans up to fourteen meals at once, recipes included |
| `save_recipe` | Saves a recipe to the collection without planning it |
| `edit_recipe` | Rewrites an existing recipe — only when explicitly asked |

A tool is only offered when the module it relies on is there. The JSON fields
the tools exchange keep their French names (`plat`, `creneau`,
`aPreparation`…): the connector's instructions explain them to Claude.

**Safeguards.** Claude suggests the week in the conversation first, and only
writes once you agree — its instructions say so, and claude.ai asks before
using a tool, by default. Then:

- **a slot already taken is never overwritten** unless you ask: `plan_meals`
  refuses everything and names the slot;
- **the household's recipe stands**: a recipe that already has its method is
  never rewritten by planning or saving — only `edit_recipe` changes it, at
  your explicit request;
- **everything is written in the name** of the person who connected Claude, as
  if they had typed it.

**Access is granted by your identity provider, not by Minka.** Claude signs in
to an OpenID Connect provider (OAuth, with PKCE) and presents the access token
it gets; the connector checks its signature, issuer, audience, expiry and,
optionally, a permission. `MCP_USERS` then maps the person to their Minka
account — and lists who may come in at all. Your provider must be able to:

- publish its discovery document (`/.well-known/openid-configuration`) and its
  signing keys;
- accept a **public client** — no secret — using **PKCE**;
- issue **access tokens as signed JWTs** whose audience (`aud`) is the
  connector's address — providers call this an API, a resource or an audience;
- be reachable from the internet, like Minka: Claude connects from Anthropic's
  servers.

Minka's author uses Pocket ID 2.x; other providers that meet these points
should work, but have not been tried.

| Variable | Role |
| --- | --- |
| `MCP_RESOURCE_URL` | The connector's public address, `https://minka.example.com/api/mcp` — also the audience expected in the tokens |
| `MCP_ISSUER` | The provider's public address, the `iss` of its tokens: `https://id.example.com` |
| `MCP_PERMISSION` | Optional: the permission the token must carry, in its `scope`, `scp` or `permissions` claim — `menus`, say |
| `MCP_USERS` | `<subject>=<Minka username>`, separated by commas |
| `MCP_JWKS_URL` | Optional: the provider's signing keys at an internal address, if the container cannot reach the public one |

With no `MCP_*` variable, the connector is off, and its address answers 503
saying so. Half configured, the API refuses to start: a connector on the
internet that checked its tokens badly would be the worst of trapdoors.

### Setting it up

**1. In your identity provider**, create:

- a client "Claude": **public** (no secret), PKCE on, with the callback URLs
  `https://claude.ai/api/mcp/auth_callback` and
  `https://claude.com/api/mcp/auth_callback` — Anthropic has announced that the
  second will one day replace the first;
- an API "Minka" whose identifier is exactly `MCP_RESOURCE_URL`, with one
  permission (`menus`, the value of `MCP_PERMISSION`), and the client "Claude"
  allowed to use it. With Pocket ID, requesting this permission is what puts
  Minka in the token's audience.

Declare the client by hand, unless your provider supports dynamic client
registration.

**2. In `.env`**, fill in the variables. A person's subject is their user id at
the provider (the `sub` of their tokens). If you cannot find it, the log gives
it at the first refused sign-in:

```
[mcp] unknown subject "…": add it to MCP_USERS to let it into Minka.
```

**3. Restart**, then check:

```bash
docker compose up -d
docker compose logs minka-api | grep '\[mcp\]'
curl https://minka.example.com/api/mcp/oauth-protected-resource
```

The log should read `[mcp] Claude connector active at …`. The container must
reach the provider to fetch its keys: if your router does not send a public
address called from inside the network back in ("hairpin NAT"), token checks
fail, and `MCP_JWKS_URL` gives the keys' internal address instead.

**4. In claude.ai**, *Customize → Connectors → Add custom connector*: the
`MCP_RESOURCE_URL` address, and in the advanced settings the client ID of
"Claude", with no secret. *Connect* opens your provider's sign-in; once back,
turn the connector on in your project (the **+** menu of a conversation →
*Connectors*). The reading tools can be allowed once and for all; the writing
ones are better asked each time.

Claude reaches both Minka and your provider from Anthropic's addresses,
`160.79.104.0/21`: an access list or a CrowdSec ban that blocks them shows up as
*"Couldn't reach the MCP server"*.

**What Claude should know about your household** — who eats, what you avoid,
how much time you have — belongs in the instructions of your Claude project.
How to read and write Minka, the connector tells Claude itself, at each
conversation. The author's own project instructions, in French, are in
[`docs/prompt-menus.md`](docs/prompt-menus.md), as an example.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Signing in fails on `http://<server address>:8070` | Minka needs its HTTPS address ([why](#plain-http)) |
| `minka-api` restarts in a loop | A configuration error, spelled out in `docker compose logs minka-api` — `[config] Cannot start: …` |
| `unable to open database file` in the API's log | `data/` does not belong to `PUID:PGID` ([Installation](#2-prepare-the-data-folder)) |
| Every save fails: *"The request's origin does not match the application's domain."* | The proxy rewrites the `Host` header, or the public address is not on the standard HTTPS port ([Reverse proxy](#reverse-proxy)) |
| *"Too many sign-in attempts"* for everyone at once | `TRUST_PROXY` does not match the number of proxies ([TRUST_PROXY](#trust_proxy)) |
| Phones stay on an old version | A cache in the proxy keeps `index.html` or `sw.js` |
| Claude: *"Couldn't reach the MCP server"* | Anthropic's addresses are blocked, or the identity provider cannot be reached from the internet |

---

## Development

Without Docker, in two terminals (Node 24):

```bash
cd backend
npm install
MINKA_LANG=en npm run dev
```

```bash
cd frontend
npm install
MINKA_LANG=en npm run dev
```

The interface is then on <http://localhost:5173>, and relays `/api` to
`localhost:3000`. `npm run dev` loads `backend/.env`, separate from the
deployment `.env`: that is where local test accounts live. `SESSION_SECRET` is
optional in development. `npm test` runs the tests on each side, both languages
included. Everything else — architecture, writing a module — is in
[README.md](README.md), in French.
