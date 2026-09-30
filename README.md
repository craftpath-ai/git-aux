# git-aux
soundtrack for your github org

Plays a video or sound on a shared screen when things happen on GitHub:
a pull request is merged, opened, or approved, or its checks fail.

## Status

Early. Clips, rules, and the celebration screen work with test events.
You can sign in to GitHub and pick people from your organization, but git-aux does not
watch GitHub for real events yet.

## Run it locally

```sh
pnpm install
pnpm dev
```

Open the page address it prints (http://localhost:5173), click once to turn sound on,
then open **settings**.

To run it the way a real screen would:

```sh
pnpm build
pnpm start
```

Then open http://localhost:4242.

## Clips and rules

On the settings page you can:

- Upload sound files (`.mp3`, `.wav`, `.ogg`, `.m4a`) and video files (`.mp4`, `.webm`), up to 50 MB each.
- Add rules that say which clip plays for which event, for one person or for anyone.
- Press **test** on a rule to hear it.

A rule for one person beats a rule for anyone. When no rule matches, the built-in chime plays.
Clips are cut off after 15 seconds. Only upload clips you have the right to use.

## Connect GitHub

On the settings page, press **sign in with GitHub**. git-aux shows a short code; enter it at
github.com/login/device on any device. Then pick your organization, and the "who" field on
rules becomes a list of its members.

git-aux asks GitHub for read-only access, and only to organizations where the git-aux
GitHub App is installed. If your organization is not listed, an admin of it needs to
install the app from the link on the settings page.

Only enter a code you started yourself. Someone who sends you a code is asking to be
signed in as you.

**Signing out** deletes the token from this machine. To also cancel it on GitHub's side,
go to GitHub **Settings > Applications > Authorized GitHub Apps** and revoke git-aux.

### Using your own GitHub App

By default git-aux signs in through the shared git-aux app, so you do not need to set
anything up. If you would rather not trust it, register your own:

1. On GitHub, open your organization's **Settings > Developer settings > GitHub Apps > New GitHub App**.
2. Give it any name and homepage URL. Untick **Webhook > Active**. Tick **Enable Device Flow**.
3. Under permissions, give read-only access to **Organization > Members**, and to
   **Repository > Pull requests**, **Checks**, and **Metadata**.
4. Create it, then install it on your organization.
5. Start git-aux with its client ID and name:

```sh
GIT_AUX_GITHUB_CLIENT_ID=Iv1.yourclientid GIT_AUX_GITHUB_APP_SLUG=your-app-name pnpm start
```

## Where your data lives

Settings and uploaded clips are saved in `~/.git-aux/` on your machine, outside this repo.
The GitHub token is saved there too, in `github-token.json`, readable only by your user
account. The web page never sees it.
Set `GIT_AUX_DATA_DIRECTORY` to use a different folder.

The server only accepts connections from the machine it runs on, and only answers
requests addressed to `localhost` or `127.0.0.1`. That second check stops other
websites open in your browser from reaching it.

## Checks

```sh
pnpm typecheck
pnpm test
```
