const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} = require("@discordjs/voice");

module.exports = {
  name: "play",
  cooldown: 3,
  description: "Joins and plays a video from youtube",
  async execute(message, args) {
    const { channel } = message.member.voice;

    const serverQueue = message.client.queue.get(message.guild.id);

    if (serverQueue && channel !== message.guild.me.voice.channel)
      return message.channel.send(
        "You need to be in the channel to execute this command!"
      );

    const permissions = channel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT"))
      return message.channel.send("You dont have the correct permission");
    if (!permissions.has("SPEAK"))
      return message.channel.send("You dont have the correct permission");

    if (!args.length)
      return message.channel.send("You need to send the secord argument!");

    const search = args.join(" ");
    const videoPattern =
      /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
    const playlistPattern = /^.*(list=)([^#\&\?]*).*/gi;
    const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
    const mobileScRegex = /^https?:\/\/(soundcloud\.app\.goo\.gl)\/(.*)$/;
    const url = args[0];
    const urlValid = videoPattern.test(args[0]);

    // // Start the playlist if playlist url was provided
    // if (!videoPattern.test(args[0]) && playlistPattern.test(args[0])) {
    //   return message.client.commands.get("playlist").execute(message, args);
    // } else if (scdl.isValidUrl(url) && url.includes("/sets/")) {
    //   return message.client.commands.get("playlist").execute(message, args);
    // }

    // if (mobileScRegex.test(url)) {
    //   try {
    //     https.get(url, function (res) {
    //       if (res.statusCode == "302") {
    //         return message.client.commands
    //           .get("play")
    //           .execute(message, [res.headers.location]);
    //       } else {
    //         return message
    //           .reply(i18n.__("play.songNotFound"))
    //           .catch(console.error);
    //       }
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     return message.reply(error.message).catch(console.error);
    //   }
    //   return message.reply("Following url redirection...").catch(console.error);
    // }

    const queueConstruct = {
      textChannel: message.channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: 100,
      muted: false,
      playing: true,
    };

    let songInfo = null;
    let song = null;

    if (urlValid) {
      try {
        songInfo = await ytdl.getInfo(url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds,
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    } else if (scRegex.test(url)) {
      try {
        const trackInfo = await scdl.getInfo(url, SOUNDCLOUD_CLIENT_ID);
        song = {
          title: trackInfo.title,
          url: trackInfo.permalink_url,
          duration: Math.ceil(trackInfo.duration / 1000),
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    } else {
      try {
        // const results = await youtube.searchVideos(search, 1, {
        //   part: "snippet",
        // });

        // if (!results.length) {
        //   message.reply(i18n.__("play.songNotFound")).catch(console.error);
        //   return;
        // }

        const videoFinder = async (query) => {
          const videoResult = await ytSearch(query);

          return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
        };

        const video = await videoFinder(args.join(" "));

        songInfo = await ytdl.getInfo(video.url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds,
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    }

    if (serverQueue) {
      serverQueue.songs.push(song);
      return serverQueue.textChannel
        .send(
          i18n.__mf("play.queueAdded", {
            title: song.title,
            author: message.author,
          })
        )
        .catch(console.error);
    }

    queueConstruct.songs.push(song);
    message.client.queue.set(message.guild.id, queueConstruct);

    async function connectToChannel(channel) {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        return connection;
      } catch (error) {
        connection.destroy();
        throw error;
      }
    }

    try {
      const connection = await connectToChannel(channel);
      connection.subscribe(player);
      await message.reply("Playing now!");
    } catch (error) {
      console.error(error);
    }

    // const connection = await voiceChannel.join();
    // const connection = await joinVoiceChannel({
    //   channelId: voiceChannel.id,
    //   guildId: message.guild.id,
    //   adapterCreator: message.guild.voiceAdapterCreator,
    // });

    // const videoFinder = async (query) => {
    //   const videoResult = await ytSearch(query);

    //   return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
    // };

    // const video = await videoFinder(args.join(" "));

    // if (video) {
    //   const stream = ytdl(video.url, { filter: "audioonly" });
    //   connection.play(stream, { seek: 0, volume: 1 }).on("finish", () => {
    //     voiceChannel.leave();
    //   });
    //   await message.reply(`:thumbsup: Now Playing ***${video.title}***`);
    // } else {
    //   message.channel.send("No video result found!");
    // }
  },
};
