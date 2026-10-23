# Online Fix for Fluxer

Start by creating an application in your Fluxer account. This bot requires permissions to view channels, send messages and embed links.<br/>
It will output the oauth2 link for adding the bot to guilds to the console on each startup.

Set FLUXER_BOT_TOKEN and FLUXER_INSTANCE, if you self-host Fluxer, in the .env file. OFIX_BASE_URL is there in case they change the domain name.

The bot could be run with ```pnpm start``` or by using Docker.<br />
Here's an example of a compose.yaml file:
```
services:
   ofix:
     image: ghcr.io/vulpeace/ofix-for-fluxer:latest
     container_name: ofix-for-fluxer
     restart: unless-stopped
     network_mode: host
     environment:
       FLUXER_BOT_TOKEN: 12345
       FLUXER_INSTANCE: https://fluxer.com
     volumes:
       - ofix-data:/app/data

 volumes:
   ofix-data:
     name: ofix-data
```

Send a message that reads ```!online-fix.set``` to a channel where you want the bot to pipe the online-fix feed to.
