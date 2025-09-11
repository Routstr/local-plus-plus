# Local AI + Routstr Chat App

React Native chat app that runs local LLMs on-device and can switch to Routstr cloud models for remote inference. The UI is optimized for a chat-first workflow with a side drawer for model selection.

## Features

- **Local models (on-device)**: GGUF models loaded via `llama.rn` with streaming output and a Stop button.
- **Routstr cloud models**: Call `https://api.routstr.com/v1/chat/completions` with standard Chat Completions and SSE streaming.
- **Single chat UI**: Toggle the side menu to pick models; the header shows the selected model.
- **Download manager**: Built-in model downloader for local models.
- **Persistent params**: Context/completion params loaded from storage.

## Where things live

- Chat screen and drawer: `src/screens/SimpleChatScreen.tsx`
- Model cards (download/init): `src/components/ModelDownloadCard.tsx`
- LLM providers (abstraction):
  - `src/services/llm/LLMProvider.ts` – shared interface
  - `src/services/llm/LocalLLMProvider.ts` – local inference via `llama.rn`
  - `src/services/llm/RoutstrProvider.ts` – Routstr remote via SSE
- Model constants: `src/utils/constants.ts`

## How the provider system works

We use an `LLMProvider` interface with `initialize`, `sendChat`, `stop`, and `release` methods. The chat screen holds a single provider instance (`llm`) and delegates message generation to it.

- Local provider streams via `llama.rn` callbacks.
- Routstr provider streams via XHR Server-Sent Events, parsing `data:` lines and accumulating deltas without duplication.
- The Stop button is shown only for the local provider and calls `stop()`.

## Setup

```bash
npm install
```

### iOS

```bash
npm run pods
npm run ios
# To target a device
npm run ios -- --device "<device name>"
# Release
npm run ios -- --mode Release
```

### Android

```bash
npm run android
# Release
npm run android -- --mode release
```

## Configure Routstr

Edit `src/screens/SimpleChatScreen.tsx` and set:

- `ROUTSTR_API_KEY`: your API key (Bearer token)
- `ROUTSTR_CHAT_MODEL`: e.g. `qwen/qwen3-max`
- `ROUTSTR_MODEL_NAME`: UI label shown in the drawer header

## Using the app

1) Launch the app; open the drawer (hamburger) in the chat header.
2) Pick a default local model. It will download if missing, then initialize and stream.
3) Or choose the Routstr model; no download necessary. Messages stream from the Routstr API.
4) Switch models anytime; we prevent duplicate welcome messages and keep the chat input disabled until ready.

## Notes

- Local streaming is handled by `llama.rn`; remote streaming uses XHR SSE parsing for React Native compatibility.
- If you change providers frequently, we release the previous provider/context before initializing the next.
