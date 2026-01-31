# Jarvis Desktop Widget 🤖

Minimalist robot companion for Windows desktop.

## Features

✨ **Minimalist Robot Design** - Clean, modern, blue robot character
🎭 **Animations** - Blinking, talking, idle movements
💬 **Speech Bubbles** - Shows thoughts and messages
🖱️ **Interactive** - Click, drag, double-click to interact
🪟 **Always on Top** - Stays visible above other windows
👻 **Transparent** - Blends with your desktop

## Installation

### Windows

1. Install Python 3.8+ from [python.org](https://www.python.org/downloads/)
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. **Configure Clawdbot connection:**
   - Edit `config.json` with your Clawdbot gateway URL and token
   - Example:
   ```json
   {
     "gateway_url": "http://localhost:3000",
     "token": "your-actual-token"
   }
   ```

4. Run Jarvis:
```bash
python jarvis_widget.py
```

## Usage

### Desktop Widget
- **Left Click + Drag**: Move Jarvis around your desktop
- **Double Click**: Open chat input (if connected to Clawdbot)
- **Right Click**: Quick interaction
- **Idle**: Jarvis will blink and occasionally show thoughts

### System Tray
- **Left Click Icon**: Show/hide Jarvis
- **Right Click Icon**: Menu (show, hide, chat, quit)

### Chatting with Jarvis
1. Double-click Jarvis to open input field
2. Type your message and press Enter or click 📤
3. Jarvis will think and respond
4. Input field auto-hides after response

## Customization

Edit `jarvis_widget.py` to customize:
- Colors (line 118-119)
- Size (line 41)
- Position (line 45)
- Speech messages (line 215-221, 227-233)
- Animation timing (line 52, 57)

## Planned Features

- [ ] Integration with Clawdbot for real conversations
- [ ] System tray icon and menu
- [ ] Voice interaction
- [ ] More animations (thinking, working, etc.)
- [ ] Settings window
- [ ] Startup with Windows

## Requirements

- Windows 7+
- Python 3.8+
- PyQt5

---

Made with 💙 by Jarvis
