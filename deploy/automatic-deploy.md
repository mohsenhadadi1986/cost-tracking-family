# Automatic deploy

How these three apps update the VPS after a push to GitHub.

This is the setup we built. Read it when you forget a step, or when you add another app the same way.

## The idea

You push code to the production branch. GitHub Actions logs into the VPS as the user `deploy`, pulls that repo, and rebuilds only that app's containers. The sites stay on the same server they use today.

```text
your laptop
    git push  →  GitHub (production branch)
                      │
                      ▼
               GitHub Actions
                      │  SSH with VPS_SSH_KEY
                      ▼
               VPS user: deploy
                      │  git pull, using the server's GitHub key
                      ▼
               docker compose up -d --build
                      │
                      ▼
               health check. Red job = deploy failed
```

One VPS, one public proxy, three apps:

| App | Folder on the VPS | Branch that deploys | Public site |
|---|---|---|---|
| QuickDish | `/opt/apps/QuickDish` | `main` | `https://quickdishapp.com` |
| cost-tracking-family | `/opt/apps/cost-tracking-family` | `main` | `https://ai-eos.it` |
| zenner-heating-monitor | `/opt/apps/zenner-heating-monitor` | `raspberry-integration` | `https://zenner.ai-eos.it` |

QuickDish owns nginx on ports 80 and 443. Family and Zenner join the Docker network `quickdish_default`. A family or Zenner deploy does not restart nginx. A QuickDish deploy rebuilds `frontend` and `backend`, then runs `deploy/run-migration.sh`. It does not run `./deploy-prod.sh`, because that script stops the whole stack, including the proxy the other two sites use.

A push to any other branch does nothing. The workflow file only listens to the branch in the table.

## Two different SSH keys

These keys are easy to mix up. They do different jobs.

| Key | Where it lives | Who uses it | For what |
|---|---|---|---|
| `~/.ssh/github-actions-vps` on your laptop | Laptop, and GitHub secret `VPS_SSH_KEY` | GitHub Actions | Log into the VPS as `deploy` |
| `/home/deploy/.ssh/id_ed25519` on the VPS | Copied from `/root/.ssh/id_ed25519` | The `deploy` user | `git pull` from GitHub |

The public half of the laptop key is in `/home/deploy/.ssh/authorized_keys`. The private half is only on the laptop and in the GitHub secret. Do not commit either private key. Do not paste them into chat.

`deploy` has no password. That is why `ssh-copy-id deploy@...` asked for a password and then refused it. The public key was installed from a `root` session instead.

## One-time server setup

Do this once per VPS. It is already done on `89.167.48.181`.

### 1. Create the deploy user

As `root`:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
```

Log in as `deploy` and check Docker:

```bash
ssh -i ~/.ssh/github-actions-vps deploy@89.167.48.181
docker ps
```

You should see `nginx-proxy` and the app containers. If `docker ps` says permission denied, log out and SSH in again so the `docker` group applies.

### 2. Install the GitHub Actions public key

`deploy` cannot type a password, so install the key as `root`. On the laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-vps -C "github-actions-deploy" -N ""
cat ~/.ssh/github-actions-vps.pub
```

On the server as `root`, paste that one public line:

```bash
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
echo 'PASTE_THE_PUBLIC_LINE' > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Test from the laptop:

```bash
ssh -i ~/.ssh/github-actions-vps deploy@89.167.48.181
```

No password prompt means this key works.

### 3. Let `deploy` own the app folders

Git refuses to run when the folder belongs to another user (`dubious ownership`). `git pull` would also fail later, because `deploy` must be allowed to write. As `root`:

```bash
chown -R deploy:deploy /opt/apps/QuickDish /opt/apps/cost-tracking-family /opt/apps/zenner-heating-monitor
```

### 4. Let `deploy` pull from GitHub

`root` already had a GitHub key. Copy it to `deploy`. As `root`:

```bash
ssh -T git@github.com
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/id_ed25519 /home/deploy/.ssh/id_ed25519
```

`Hi mohsenhadadi1986!` from the first command means the key is valid. GitHub also says it does not provide a shell. That is normal.

Then as `deploy`:

```bash
su - deploy
ssh -T git@github.com
cd /opt/apps/QuickDish && git pull
cd /opt/apps/cost-tracking-family && git pull
cd /opt/apps/zenner-heating-monitor && git pull
```

Each pull should end with `Already up to date` or a fast-forward. Check the branch too:

```bash
git rev-parse --abbrev-ref HEAD
```

The server must already be on the production branch from the table above. The workflow will `git checkout` that branch and `git pull --ff-only`. A dirty tree or a local commit the server made by hand makes the job fail on purpose.

Leave `deploy/.env` and the QuickDish app `.env` files on the server. The workflow does not create or overwrite them.

## GitHub secrets

Each repo has the same four secrets. GitHub path: **Settings → Secrets and variables → Actions**.

| Secret | Value |
|---|---|
| `VPS_HOST` | `89.167.48.181` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Full contents of the laptop file `~/.ssh/github-actions-vps`, including the `BEGIN` and `END` lines |
| `VPS_APP_PATH` | That repo's folder from the table above |

`VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY` are the same in every repo. `VPS_APP_PATH` is the only one that changes.

`VPS_SSH_KEY` is the laptop key GitHub uses to enter the server. It is not `/root/.ssh/id_ed25519`.

## The workflow file

Each repo has `.github/workflows/deploy.yml`. GitHub reads that file from the branch you push. For Zenner, the file has to be on `raspberry-integration`. A copy that exists only on `multi-tenants` will not deploy the server.

What the job does:

1. SSH in as `deploy`.
2. `cd` to `VPS_APP_PATH`.
3. `git fetch`, `git checkout` the production branch, `git pull --ff-only`.
4. Rebuild containers from the `deploy/` directory, so Compose loads `deploy/.env`.
5. Check that the app answers. A failed check fails the GitHub job.

Commands, per app:

**cost-tracking-family**

```bash
cd /opt/apps/cost-tracking-family/deploy
docker compose -f docker-compose-prod.yml up -d --build
```

Then it asks the backend container for `http://127.0.0.1:3000/api/health`. The public site asks for Basic Auth, so the check talks to the container directly.

**zenner-heating-monitor**

```bash
cd /opt/apps/zenner-heating-monitor/deploy
docker compose -f docker-compose-prod.yml up -d --build
```

Compose runs Alembic in `zenner-migrate` before it starts the API. The check calls `https://zenner.ai-eos.it/api/v1/health`. That URL has no Basic Auth. The Raspberry Pi does not need a restart.

**QuickDish**

```bash
cd /opt/apps/QuickDish/deploy
docker compose -f docker-compose-prod.yml up --build -d frontend backend
bash ./run-migration.sh
```

Then it checks `https://quickdishapp.com`, and checks that family and Zenner still answer. Family may return `401` because of Basic Auth. `200` and `401` both mean nginx is still routing that host.

Only one deploy of a given repo runs at a time. A second push waits for the first job to finish.

## Day to day

1. Work on a feature branch.
2. Merge or push to the production branch in the table.
3. Open the repo on GitHub → **Actions** → the **Deploy** run.
4. Green means the pull, rebuild, and health check succeeded.
5. Open the site and confirm the change you expected.

Push the repos one at a time the first time you turn this on. Order: family, then Zenner, then QuickDish. Family is the smallest stack. A failed family deploy does not take down QuickDish or Zenner.

## What a deploy will not do

- It will not deploy a branch that is not in the table.
- It will not run `docker compose down` or `down -v`.
- It will not delete database volumes.
- It will not restart `nginx-proxy`.
- It will not change `.env` files or Basic Auth passwords.
- It will not restart the Zenner collector on the Raspberry Pi.

Change nginx by hand, and include every live overlay, or the hostname you leave out disappears:

```bash
cd /opt/apps/QuickDish/deploy
docker compose -f docker-compose-prod.yml \
  -f docker-compose.family.yml \
  -f docker-compose.zenner.yml \
  up -d nginx
```

## When a job is red

Open the failed step in **Actions** and read the last lines.

| Log line | What it means | What to do |
|---|---|---|
| `Permission denied (publickey)` during SSH | GitHub's key was rejected | Check secret `VPS_SSH_KEY` is the laptop private key, and that its `.pub` line is in `/home/deploy/.ssh/authorized_keys` |
| `Permission denied (publickey)` during `git pull` | `deploy` cannot talk to GitHub | Repeat the copy of `/root/.ssh/id_ed25519` to `/home/deploy/.ssh/` |
| `dubious ownership` | The repo folder is not owned by `deploy` | `chown -R deploy:deploy` that folder |
| `Not possible to fast-forward` | The server has local commits or a dirty git state | On the server as `deploy`, `cd` to the repo, `git status`. Get back to a clean production branch, then re-run the job |
| Health check failed | The new containers did not answer | On the server: `docker ps` and `docker compose -f docker-compose-prod.yml logs` from that app's `deploy/` folder |
| QuickDish migration error | The new backend is up, the migration script exited non-zero | Read the migration output in the Actions log. Fix forward with another commit. Do not run `down -v` |

To put an app back on the last good commit, SSH in as `deploy`, `cd` to that repo, `git checkout <last-good-sha>`, then run the same `docker compose` command the workflow uses. Push a revert to the production branch when you want GitHub to match the server again.

## Files

| Path | Role |
|---|---|
| `.github/workflows/deploy.yml` | The job GitHub runs on push |
| `deploy/automatic-deploy.md` | This note |
| `deploy/README.md` | Manual first-time install, TLS, and nginx |
| `deploy/.env` | Production secrets. On the server only. Not in git |
