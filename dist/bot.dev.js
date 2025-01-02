"use strict";

require('dotenv').config();

var _require = require('discord.js'),
    Client = _require.Client,
    Intents = _require.Intents;

var axios = require('axios');

var client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var API_URL = process.env.API_URL;
var CHECK_INTERVAL = 60000; // Check every 60 seconds

client.once('ready', function () {
  console.log("Logged in as ".concat(client.user.tag, "!"));
  monitorServer();
});
client.on('messageCreate', function _callee(message) {
  var status, response, logs;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (!(message.content === '!status')) {
            _context.next = 7;
            break;
          }

          _context.next = 3;
          return regeneratorRuntime.awrap(getServerStatus());

        case 3:
          status = _context.sent;
          message.channel.send(status);
          _context.next = 19;
          break;

        case 7:
          if (!(message.content === '!reboot')) {
            _context.next = 14;
            break;
          }

          _context.next = 10;
          return regeneratorRuntime.awrap(rebootServer());

        case 10:
          response = _context.sent;
          message.channel.send(response);
          _context.next = 19;
          break;

        case 14:
          if (!(message.content === '!logs')) {
            _context.next = 19;
            break;
          }

          _context.next = 17;
          return regeneratorRuntime.awrap(getServerLogs());

        case 17:
          logs = _context.sent;
          message.channel.send(logs);

        case 19:
        case "end":
          return _context.stop();
      }
    }
  });
});

function monitorServer() {
  return regeneratorRuntime.async(function monitorServer$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          setInterval(function _callee2() {
            var status, channel;
            return regeneratorRuntime.async(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(getServerStatus());

                  case 2:
                    status = _context2.sent;

                    if (status.includes('down')) {
                      channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

                      if (channel) {
                        channel.send(status);
                      }
                    }

                  case 4:
                  case "end":
                    return _context2.stop();
                }
              }
            });
          }, CHECK_INTERVAL);

        case 1:
        case "end":
          return _context3.stop();
      }
    }
  });
}

function getServerStatus() {
  var response;
  return regeneratorRuntime.async(function getServerStatus$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/health"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context4.sent;
          return _context4.abrupt("return", "Server is up. Uptime: ".concat(response.data.uptime, ", Request Count: ").concat(response.data.requestCount));

        case 7:
          _context4.prev = 7;
          _context4.t0 = _context4["catch"](0);
          return _context4.abrupt("return", 'Server is down!');

        case 10:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function rebootServer() {
  var response;
  return regeneratorRuntime.async(function rebootServer$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/reboot"), {}, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context5.sent;
          return _context5.abrupt("return", response.data.message);

        case 7:
          _context5.prev = 7;
          _context5.t0 = _context5["catch"](0);
          return _context5.abrupt("return", 'Failed to reboot the server!');

        case 10:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function getServerLogs() {
  var response;
  return regeneratorRuntime.async(function getServerLogs$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _context6.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/logs"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context6.sent;
          return _context6.abrupt("return", "Logs from the last hour:\n".concat(response.data.logs));

        case 7:
          _context6.prev = 7;
          _context6.t0 = _context6["catch"](0);
          return _context6.abrupt("return", 'Failed to retrieve logs!');

        case 10:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

client.login(DISCORD_TOKEN);