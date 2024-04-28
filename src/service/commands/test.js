async function run(params, botHelper) {
  try {
    const chat = {chat: {id: botHelper.tgAdmin}, text: ''};

    const conf = botHelper.getConf('cron_test')
    const broadcastIsOn = botHelper.getConf('broadcast_val')

    // console.log('cnf = ', botHelper.showConfig());
    if (conf) {
      // console.log('cnf = ', conf);
      // await botHelper.sendAdmin('cron')
      // await botHelper.sendAdmin('cron test', process.env.TGGROUPLOGS);
    }
    if (broadcastIsOn) {
      botHelper.startBroad({message: {...chat, text: broadcastIsOn}, reply: (s) => {
          console.log(s)
          return {catch: (cb) => cb()}
        }})
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = {run};
