# Wilber World: Refueled

Wilber World: Refueled is the follow-up/remastered branch of the original portrait 2D highway driving game. The baseline preserves the classic loop: dodge traffic, survive the timer, and reach Wilber World.

This repo is intended for new features, polish, and gameplay experiments while keeping the stabilized original remake separate.

## Run Locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The game keeps the original 1080x1920 layout and scales to fit the browser window.

For phone testing on the same Wi-Fi:

```sh
npm run dev -- --host 0.0.0.0 --port 8026
```

Then visit `http://YOUR-PC-IP:8026/` from the phone.

## Assets

- Art files live in `assets/art`.
- Audio files live in `assets/sounds`.

## Desktop Controls

- Move: Arrow keys, WASD
- Start: Space bar
- Honk: Space bar during gameplay
- Retry after game over: R

## Mobile Controls

- Start: Tap the title screen
- Move: Touch D-pad
- Honk: Honk button during gameplay
- Retry after game over: Tap the retry prompt
