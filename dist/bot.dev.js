"use strict";

require('dotenv').config();

var _require = require('discord.js'),
    Client = _require.Client,
    GatewayIntentBits = _require.GatewayIntentBits,
    REST = _require.REST,
    Routes = _require.Routes,
    EmbedBuilder = _require.EmbedBuilder;

var axios = require('axios');

var mariadb = require('mariadb');

var client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var CLIENT_ID = process.env.CLIENT_ID;
var API_URL = process.env.API_URL;
var pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});
client.once('ready', function _callee() {
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log("Logged in as ".concat(client.user.tag, "!"));
          _context.next = 3;
          return regeneratorRuntime.awrap(clearCommands());

        case 3:
          _context.next = 5;
          return regeneratorRuntime.awrap(registerCommands());

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
});
client.on('interactionCreate', function _callee2(interaction) {
  var commandName, status, message, logsUrl, command, response, url, _response;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          console.log("Received interaction: ".concat(interaction.commandName));

          if (interaction.isCommand()) {
            _context2.next = 3;
            break;
          }

          return _context2.abrupt("return");

        case 3:
          commandName = interaction.commandName;

          if (!(commandName === 'status')) {
            _context2.next = 23;
            break;
          }

          _context2.next = 7;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 7:
          console.log('Fetching server status');
          _context2.prev = 8;
          _context2.next = 11;
          return regeneratorRuntime.awrap(getServerStatus());

        case 11:
          status = _context2.sent;
          _context2.next = 14;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [status]
          }));

        case 14:
          _context2.next = 21;
          break;

        case 16:
          _context2.prev = 16;
          _context2.t0 = _context2["catch"](8);
          console.error("Error fetching server status: ".concat(_context2.t0.message));
          _context2.next = 21;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t0.message)));

        case 21:
          _context2.next = 119;
          break;

        case 23:
          if (!(commandName === 'reboot')) {
            _context2.next = 42;
            break;
          }

          _context2.next = 26;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 26:
          console.log('Rebooting server');
          _context2.prev = 27;
          _context2.next = 30;
          return regeneratorRuntime.awrap(rebootServer());

        case 30:
          message = _context2.sent;
          _context2.next = 33;
          return regeneratorRuntime.awrap(interaction.editReply(message));

        case 33:
          _context2.next = 40;
          break;

        case 35:
          _context2.prev = 35;
          _context2.t1 = _context2["catch"](27);
          console.error("Error rebooting server: ".concat(_context2.t1.message));
          _context2.next = 40;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t1.message)));

        case 40:
          _context2.next = 119;
          break;

        case 42:
          if (!(commandName === 'logs')) {
            _context2.next = 61;
            break;
          }

          _context2.next = 45;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 45:
          console.log('Fetching server logs');
          _context2.prev = 46;
          _context2.next = 49;
          return regeneratorRuntime.awrap(getServerLogs());

        case 49:
          logsUrl = _context2.sent;
          _context2.next = 52;
          return regeneratorRuntime.awrap(interaction.editReply("Logs URL: ".concat(logsUrl)));

        case 52:
          _context2.next = 59;
          break;

        case 54:
          _context2.prev = 54;
          _context2.t2 = _context2["catch"](46);
          console.error("Error fetching server logs: ".concat(_context2.t2.message));
          _context2.next = 59;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t2.message)));

        case 59:
          _context2.next = 119;
          break;

        case 61:
          if (!(commandName === 'console')) {
            _context2.next = 91;
            break;
          }

          _context2.next = 64;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 64:
          command = interaction.options.getString('command');
          console.log("Executing command: ".concat(command));
          _context2.prev = 66;
          _context2.t3 = regeneratorRuntime;
          _context2.t4 = axios;
          _context2.t5 = "".concat(API_URL, "/execute");
          _context2.t6 = {
            command: command
          };
          _context2.next = 73;
          return regeneratorRuntime.awrap(getBotToken());

        case 73:
          _context2.t7 = _context2.sent;
          _context2.t8 = {
            'x-bot-token': _context2.t7
          };
          _context2.t9 = {
            headers: _context2.t8
          };
          _context2.t10 = _context2.t4.post.call(_context2.t4, _context2.t5, _context2.t6, _context2.t9);
          _context2.next = 79;
          return _context2.t3.awrap.call(_context2.t3, _context2.t10);

        case 79:
          response = _context2.sent;
          _context2.next = 82;
          return regeneratorRuntime.awrap(interaction.editReply("```".concat(response.data.output, "```")));

        case 82:
          _context2.next = 89;
          break;

        case 84:
          _context2.prev = 84;
          _context2.t11 = _context2["catch"](66);
          console.error("Error executing command: ".concat(_context2.t11.message));
          _context2.next = 89;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t11.message)));

        case 89:
          _context2.next = 119;
          break;

        case 91:
          if (!(commandName === 'website')) {
            _context2.next = 119;
            break;
          }

          _context2.next = 94;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 94:
          url = interaction.options.getString('url');
          console.log("Checking website status: ".concat(url));
          _context2.prev = 96;
          _context2.t12 = regeneratorRuntime;
          _context2.t13 = axios;
          _context2.t14 = "".concat(API_URL, "/websiteStatus");
          _context2.next = 102;
          return regeneratorRuntime.awrap(getBotToken());

        case 102:
          _context2.t15 = _context2.sent;
          _context2.t16 = {
            'x-bot-token': _context2.t15
          };
          _context2.t17 = {
            url: url
          };
          _context2.t18 = {
            headers: _context2.t16,
            params: _context2.t17
          };
          _context2.t19 = _context2.t13.get.call(_context2.t13, _context2.t14, _context2.t18);
          _context2.next = 109;
          return _context2.t12.awrap.call(_context2.t12, _context2.t19);

        case 109:
          _response = _context2.sent;
          _context2.next = 112;
          return regeneratorRuntime.awrap(interaction.editReply("Website status: ".concat(_response.data.status, ", Status code: ").concat(_response.data.statusCode)));

        case 112:
          _context2.next = 119;
          break;

        case 114:
          _context2.prev = 114;
          _context2.t20 = _context2["catch"](96);
          console.error("Error checking website status: ".concat(_context2.t20.message));
          _context2.next = 119;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t20.message)));

        case 119:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[8, 16], [27, 35], [46, 54], [66, 84], [96, 114]]);
});

function getServerStatus() {
  var response, uptimeResponse, embed;
  return regeneratorRuntime.async(function getServerStatus$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.t0 = regeneratorRuntime;
          _context3.t1 = axios;
          _context3.t2 = "".concat(API_URL, "/systeminfo");
          _context3.next = 6;
          return regeneratorRuntime.awrap(getBotToken());

        case 6:
          _context3.t3 = _context3.sent;
          _context3.t4 = {
            'x-bot-token': _context3.t3
          };
          _context3.t5 = {
            headers: _context3.t4
          };
          _context3.t6 = _context3.t1.get.call(_context3.t1, _context3.t2, _context3.t5);
          _context3.next = 12;
          return _context3.t0.awrap.call(_context3.t0, _context3.t6);

        case 12:
          response = _context3.sent;
          _context3.t7 = regeneratorRuntime;
          _context3.t8 = axios;
          _context3.t9 = "".concat(API_URL, "/health");
          _context3.next = 18;
          return regeneratorRuntime.awrap(getBotToken());

        case 18:
          _context3.t10 = _context3.sent;
          _context3.t11 = {
            'x-bot-token': _context3.t10
          };
          _context3.t12 = {
            headers: _context3.t11
          };
          _context3.t13 = _context3.t8.get.call(_context3.t8, _context3.t9, _context3.t12);
          _context3.next = 24;
          return _context3.t7.awrap.call(_context3.t7, _context3.t13);

        case 24:
          uptimeResponse = _context3.sent;
          embed = new EmbedBuilder().setColor(0x0099ff).setTitle('Server Status').addFields({
            name: 'CPU',
            value: "".concat(response.data.cpu.manufacturer, " ").concat(response.data.cpu.brand, " ").concat(response.data.cpu.speed, "GHz (").concat(response.data.cpu.cores, " cores)"),
            inline: true
          }, {
            name: 'RAM',
            value: "".concat((response.data.mem.total / 1073741824).toFixed(2), " GB total, ").concat((response.data.mem.free / 1073741824).toFixed(2), " GB free"),
            inline: true
          }, {
            name: 'OS',
            value: "".concat(response.data.osInfo.platform, " ").concat(response.data.osInfo.distro, " ").concat(response.data.osInfo.release, " (Kernel: ").concat(response.data.osInfo.kernel, ")"),
            inline: true
          }, {
            name: 'IP Address',
            value: response.data.networkInterfaces[0].ip4,
            inline: true
          }, {
            name: 'CPU Load',
            value: "".concat(response.data.currentLoad.currentLoad.toFixed(2), "%"),
            inline: true
          }, {
            name: 'Uptime',
            value: uptimeResponse.data.uptime,
            inline: true
          }).setTimestamp().setFooter({
            text: 'Server Status'
          });
          return _context3.abrupt("return", embed);

        case 29:
          _context3.prev = 29;
          _context3.t14 = _context3["catch"](0);
          console.error("Error getting server status: ".concat(_context3.t14.message));
          return _context3.abrupt("return", new EmbedBuilder().setColor(0xff0000).setTitle('Server Status').setDescription('Server is down!').setTimestamp().setFooter({
            text: 'Server Status'
          }));

        case 33:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 29]]);
}

function rebootServer() {
  var response;
  return regeneratorRuntime.async(function rebootServer$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.t0 = regeneratorRuntime;
          _context4.t1 = axios;
          _context4.t2 = "".concat(API_URL, "/reboot");
          _context4.t3 = {};
          _context4.next = 7;
          return regeneratorRuntime.awrap(getBotToken());

        case 7:
          _context4.t4 = _context4.sent;
          _context4.t5 = {
            'x-bot-token': _context4.t4
          };
          _context4.t6 = {
            headers: _context4.t5
          };
          _context4.t7 = _context4.t1.post.call(_context4.t1, _context4.t2, _context4.t3, _context4.t6);
          _context4.next = 13;
          return _context4.t0.awrap.call(_context4.t0, _context4.t7);

        case 13:
          response = _context4.sent;
          return _context4.abrupt("return", response.data.message);

        case 17:
          _context4.prev = 17;
          _context4.t8 = _context4["catch"](0);
          console.error("Error rebooting server: ".concat(_context4.t8.message));
          return _context4.abrupt("return", 'Failed to reboot the server!');

        case 21:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 17]]);
}

function getServerLogs() {
  var response;
  return regeneratorRuntime.async(function getServerLogs$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.t0 = regeneratorRuntime;
          _context5.t1 = axios;
          _context5.t2 = "".concat(API_URL, "/logs");
          _context5.next = 6;
          return regeneratorRuntime.awrap(getBotToken());

        case 6:
          _context5.t3 = _context5.sent;
          _context5.t4 = {
            'x-bot-token': _context5.t3
          };
          _context5.t5 = {
            headers: _context5.t4
          };
          _context5.t6 = _context5.t1.get.call(_context5.t1, _context5.t2, _context5.t5);
          _context5.next = 12;
          return _context5.t0.awrap.call(_context5.t0, _context5.t6);

        case 12:
          response = _context5.sent;
          return _context5.abrupt("return", response.data.url);

        case 16:
          _context5.prev = 16;
          _context5.t7 = _context5["catch"](0);
          console.error("Error getting server logs: ".concat(_context5.t7.message));
          return _context5.abrupt("return", 'Failed to retrieve logs!');

        case 20:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 16]]);
}

function getBotToken() {
  var conn, rows;
  return regeneratorRuntime.async(function getBotToken$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _context6.next = 3;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 3:
          conn = _context6.sent;
          _context6.next = 6;
          return regeneratorRuntime.awrap(conn.query("SELECT token FROM bot_tokens WHERE id = 1"));

        case 6:
          rows = _context6.sent;
          return _context6.abrupt("return", rows[0].token);

        case 10:
          _context6.prev = 10;
          _context6.t0 = _context6["catch"](0);
          console.error("Error fetching bot token: ".concat(_context6.t0.message));
          throw new Error('Failed to fetch bot token');

        case 14:
          _context6.prev = 14;
          if (conn) conn.release();
          return _context6.finish(14);

        case 17:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 10, 14, 17]]);
}

function clearCommands() {
  var rest, commands, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, command;

  return regeneratorRuntime.async(function clearCommands$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context7.prev = 1;
          console.log('Started clearing application (/) commands.');
          _context7.next = 5;
          return regeneratorRuntime.awrap(rest.get(Routes.applicationCommands(CLIENT_ID)));

        case 5:
          commands = _context7.sent;
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context7.prev = 9;
          _iterator = commands[Symbol.iterator]();

        case 11:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context7.next = 18;
            break;
          }

          command = _step.value;
          _context7.next = 15;
          return regeneratorRuntime.awrap(rest["delete"](Routes.applicationCommand(CLIENT_ID, command.id)));

        case 15:
          _iteratorNormalCompletion = true;
          _context7.next = 11;
          break;

        case 18:
          _context7.next = 24;
          break;

        case 20:
          _context7.prev = 20;
          _context7.t0 = _context7["catch"](9);
          _didIteratorError = true;
          _iteratorError = _context7.t0;

        case 24:
          _context7.prev = 24;
          _context7.prev = 25;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 27:
          _context7.prev = 27;

          if (!_didIteratorError) {
            _context7.next = 30;
            break;
          }

          throw _iteratorError;

        case 30:
          return _context7.finish(27);

        case 31:
          return _context7.finish(24);

        case 32:
          console.log('Successfully cleared application (/) commands.');
          _context7.next = 38;
          break;

        case 35:
          _context7.prev = 35;
          _context7.t1 = _context7["catch"](1);
          console.error("Error clearing commands: ".concat(_context7.t1.message));

        case 38:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[1, 35], [9, 20, 24, 32], [25,, 27, 31]]);
}

function registerCommands() {
  var commands, rest;
  return regeneratorRuntime.async(function registerCommands$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          commands = [{
            name: 'status',
            description: 'Get the server status'
          }, {
            name: 'reboot',
            description: 'Reboot the server'
          }, {
            name: 'logs',
            description: 'Get the server logs'
          }, {
            name: 'console',
            description: 'Execute a command on the server',
            options: [{
              name: 'command',
              type: 3,
              // STRING
              description: 'The command to execute',
              required: true
            }]
          }, {
            name: 'website',
            description: 'Check the status of a website',
            options: [{
              name: 'url',
              type: 3,
              // STRING
              description: 'The URL of the website to check',
              required: true
            }]
          }];
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context8.prev = 2;
          console.log('Started refreshing application (/) commands.');
          _context8.next = 6;
          return regeneratorRuntime.awrap(rest.put(Routes.applicationCommands(CLIENT_ID), // Register global commands
          {
            body: commands
          }));

        case 6:
          console.log('Successfully reloaded application (/) commands.');
          _context8.next = 12;
          break;

        case 9:
          _context8.prev = 9;
          _context8.t0 = _context8["catch"](2);
          console.error("Error registering commands: ".concat(_context8.t0.message));

        case 12:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[2, 9]]);
}

client.login(DISCORD_TOKEN);