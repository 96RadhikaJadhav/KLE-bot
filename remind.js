const { MessageEmbed } = require("discord.js");
const mongo = require("./mongo");
const Event = require("./models/event.model");

const getDateAndTime = (dateObj) => {
  dateObj = dateObj.toString();
  const pos = dateObj.indexOf(":") - 2;
  return [dateObj.substring(4, pos), dateObj.substring(pos)];
};

const formatDate = (date) => {
  let dd = String(date.getDate()).padStart(2, "0");
  let mm = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = date.getFullYear();

  const resDate = yyyy + "/" + mm + "/" + dd;
  return resDate;
};

const diffLessThanHour = (currTime, eventTime) => {
  let diff = eventTime - currTime;
  return diff <= 3600000 && diff >= 0 ? true : false;
};

const compute = (eventObjects) => {
  const events = [];
  for (let index in eventObjects) {
    const elem = eventObjects[index];

    index = String(parseInt(index) + 1);
    const dateAndTime = getDateAndTime(elem.date);

    events.push({
      name: `${index}. ${elem.title}`,
      value: `**Date:** ${dateAndTime[0]}
               **Time:** ${dateAndTime[1]}  
               **Venue:** ${elem.venue}`,
      inline: false,
    });
  }

  return events;
};

module.exports = async (bot) => {
  const channels = await bot.channels.cache;

  let channel;
  channels.forEach((ch) => {
    if (ch.name === "general") {
      channel = ch;
    }
  });
  await mongo().then(async (mongoose) => {
    try {
      await Event.find()
        .sort("date")
        .then((response) => {
          let events = [];
          let today = new Date();
          for (let index in response) {
            if (formatDate(response[index].date) === formatDate(today)) {
              let currTime = today.getTime();
              let eventTime = response[index].date.getTime();
              if (diffLessThanHour(currTime, eventTime)) {
                events.push(response[index]);
              }
            }
          }

          let eventFormatted = compute(events);
          if (eventFormatted.length) {
            const embed = new MessageEmbed()
              .setTitle("Reminder!")
              .setColor(0xff0000)
              .setDescription(
                "Hello, the following events are scheduled to occur in less than an hour!"
              )
              .addFields(eventFormatted);
            channel.send(embed);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } finally {
      mongoose.connection.close();
    }
  });
};
