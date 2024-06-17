# Sync Buddy Chrome Extension

_Sync Buddy_ is a Chrome extension that allows you to watch movies, shows, or any videos in sync with your friends or family. It also includes a chat functionality for real-time communication.

## Features

- Watch any video from any website in sync with others.
- Integrated chat functionality activated by pressing Shift+Enter.
- Reaction feature: Confetti blast on the screen with emojis (try typing "/laugh" or "/sad" in the chat).

## Limitations

- Cannot sync with embedded videos.

## Project Status

This is a personal project and not intended for production use or publication on any web store.

## Installation

To use _Sync Buddy_ on your own browser:

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/sync-buddy.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Firebase:

   - Open `src/background/background.ts` and `src/content/content.ts`.
   - Add your Firebase config details.

4. Build the extension:

   ```bash
   npm run build
   ```

5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable Developer Mode.
   - Click on "Load unpacked" and select the `public` directory within the cloned repository.

## Usage

1. Open the desired video in your browser (ensure it has a valid video tag).
2. Click on the video to prompt the extension to create a room.
3. Enter a room name.
4. Share the room name with your friends/family.
5. Your friends/family should repeat steps 1-3 and join the room using the same name.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Credits

This project is based on [svelte-chrome-extension-template](https://github.com/taishi55/svelte-chrome-extension-template) by [taishi55](https://github.com/taishi55). Thank you for the foundation!
