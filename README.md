# git-aux
soundtrack for your github org

Plays a video or sound on a shared screen when things happen on GitHub:
a pull request is merged, opened, or approved, or its checks fail.

## Status

Early. Clips, rules, and the celebration screen work with test events.
GitHub is not connected yet.

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

## Where your data lives

Settings and uploaded clips are saved in `~/.git-aux/` on your machine, outside this repo.
Set `GIT_AUX_DATA_DIRECTORY` to use a different folder.

The server only accepts connections from the machine it runs on.

## Checks

```sh
pnpm typecheck
pnpm test
```
