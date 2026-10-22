# Online Fix for Fluxer

Start by creating a application in your Fluxer account. This bot requires permissions to view channels, view and send messages and embed links.<br/>
Follow the oauth2 link that Fluxer has generated for you to add the bot to a guild.

Clone this repository:<br />
```git clone https://github.com/vulpeace/ofix-for-fluxer.git```<br />
and enable the .env file:<br />
```mv .env.example .env```

Set FLUXER_BOT_TOKEN and FLUXER_INSTANCE, if you self-host Fluxer. OFIX_BASE_URL is there in case they change the domain name.

The bot could be run with ```pnpm start``` or by using Docker.

Send a message that reads ```!online-fix.set``` to a channel where you want the bot to dump the online-fix feed to.
