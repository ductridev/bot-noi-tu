# 🚀 Quick Start Guide

## 1. Prerequisites
- Node.js 18 or higher
- MongoDB database (local or cloud)
- Discord bot token

## 2. Installation Steps

```bash
# Clone the repository
git clone https://github.com/ductridev/bot-noi-tu.git
cd bot-noi-tu

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start the bot
npm start
```

## 3. Required Configuration

Edit `.env` file:
```env
BOT_TOKEN=your_discord_bot_token
MONGO_URI=your_mongodb_connection_string
REPORT_CHANNEL=channel_id_for_suggestions
```

## 4. Discord Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the token
3. Invite bot to your server with these permissions:
   - Send Messages
   - Use Slash Commands
   - Add Reactions
   - Embed Links
   - Read Message History

## 5. First Usage

```bash
# Set up a Vietnamese word chain channel
/set-channel channel:#vietnamese-games language:vi

# Set up an English word chain channel  
/set-channel channel:#english-games language:en

# Start playing!
!start                    # Start word chain game
/sicbo                   # Start Sic Bo dice game
/me                      # Check your stats
```

## 6. Testing Individual Games

To test only specific features, edit `.env`:

```env
# Test only Sic Bo game
ENABLE_WORD_CHAIN=false
ENABLE_SICBO=true
ENABLE_WORD_SUGGESTIONS=false
```

Then restart the bot.

## 7. Troubleshooting

**Bot not responding?**
- Check bot permissions in Discord
- Verify `.env` file is configured correctly
- Check console for error messages

**Commands not working?**
- Use `/set-channel` to configure the channel first
- Ensure bot has slash command permissions
- Try `/ping` to test basic connectivity

**Need help?**
- Check the full README.md for detailed documentation
- Review console logs for error messages
- Verify MongoDB connection is working

---

**🎉 You're ready to start playing!**
