# git-aux
soundtrack for your github org

Plays a video and sound on a shared screen every time someone merges a pull request.

## Status

Early. The celebration screen works with test merges. GitHub is not connected yet.

## Run it locally

```sh
pnpm install
pnpm dev
```

Open the address it prints, click once to turn sound on, then use the test buttons.

## Clips

Clips live in `public/media/`. `src/clips.json` says who gets which clip:

```json
{
  "defaultClipFileName": "default.mp3",
  "clipFileNameByGithubLogin": {
    "octocat": "sample.mp4"
  }
}
```

- `.mp4` and `.webm` files play as video. Anything else plays as sound over a default card.
- Clips are cut off after 15 seconds.
- Only add clips you have the right to share.

## Checks

```sh
pnpm typecheck
pnpm test
```
