"use strict";

require('dotenv').config();

var _require = require('discord.js'),
    Client = _require.Client,
    GatewayIntentBits = _require.GatewayIntentBits,
    REST = _require.REST,
    Routes = _require.Routes,
    EmbedBuilder = _require.EmbedBuilder;

var axios = require('axios');

var client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var CLIENT_ID = process.env.CLIENT_ID;
var API_URL = process.env.API_URL;
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
  var commandName, status, message, logsUrl, command, response;
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
          _context2.next = 79;
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
          _context2.next = 79;
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
          _context2.next = 79;
          break;

        case 61:
          if (!(commandName === 'console')) {
            _context2.next = 79;
            break;
          }

          _context2.next = 64;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 64:
          command = interaction.options.getString('command');
          console.log("Executing command: ".concat(command));
          _context2.prev = 66;
          _context2.next = 69;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/execute"), {
            command: command
          }, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 69:
          response = _context2.sent;
          _context2.next = 72;
          return regeneratorRuntime.awrap(interaction.editReply("```".concat(response.data.output, "```")));

        case 72:
          _context2.next = 79;
          break;

        case 74:
          _context2.prev = 74;
          _context2.t3 = _context2["catch"](66);
          console.error("Error executing command: ".concat(_context2.t3.message));
          _context2.next = 79;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t3.message)));

        case 79:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[8, 16], [27, 35], [46, 54], [66, 74]]);
});

function getServerStatus() {
  var response, uptimeResponse, embed;
  return regeneratorRuntime.async(function getServerStatus$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/systeminfo"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context3.sent;
          _context3.next = 6;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/health"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 6:
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

        case 11:
          _context3.prev = 11;
          _context3.t0 = _context3["catch"](0);
          console.error("Error getting server status: ".concat(_context3.t0.message));
          return _context3.abrupt("return", new EmbedBuilder().setColor(0xff0000).setTitle('Server Status').setDescription('Server is down!').setTimestamp().setFooter({
            text: 'Server Status'
          }));

        case 15:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 11]]);
}

function rebootServer() {
  var response;
  return regeneratorRuntime.async(function rebootServer$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/reboot"), {}, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context4.sent;
          return _context4.abrupt("return", response.data.message);

        case 7:
          _context4.prev = 7;
          _context4.t0 = _context4["catch"](0);
          console.error("Error rebooting server: ".concat(_context4.t0.message));
          return _context4.abrupt("return", 'Failed to reboot the server!');

        case 11:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function getServerLogs() {
  var response;
  return regeneratorRuntime.async(function getServerLogs$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/logs"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context5.sent;
          return _context5.abrupt("return", response.data.url);

        case 7:
          _context5.prev = 7;
          _context5.t0 = _context5["catch"](0);
          console.error("Error getting server logs: ".concat(_context5.t0.message));
          return _context5.abrupt("return", 'Failed to retrieve logs!');

        case 11:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function clearCommands() {
  var rest, commands, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, command;

  return regeneratorRuntime.async(function clearCommands$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context6.prev = 1;
          console.log('Started clearing application (/) commands.');
          _context6.next = 5;
          return regeneratorRuntime.awrap(rest.get(Routes.applicationCommands(CLIENT_ID)));

        case 5:
          commands = _context6.sent;
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context6.prev = 9;
          _iterator = commands[Symbol.iterator]();

        case 11:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context6.next = 18;
            break;
          }

          command = _step.value;
          _context6.next = 15;
          return regeneratorRuntime.awrap(rest["delete"](Routes.applicationCommand(CLIENT_ID, command.id)));

        case 15:
          _iteratorNormalCompletion = true;
          _context6.next = 11;
          break;

        case 18:
          _context6.next = 24;
          break;

        case 20:
          _context6.prev = 20;
          _context6.t0 = _context6["catch"](9);
          _didIteratorError = true;
          _iteratorError = _context6.t0;

        case 24:
          _context6.prev = 24;
          _context6.prev = 25;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 27:
          _context6.prev = 27;

          if (!_didIteratorError) {
            _context6.next = 30;
            break;
          }

          throw _iteratorError;

        case 30:
          return _context6.finish(27);

        case 31:
          return _context6.finish(24);

        case 32:
          console.log('Successfully cleared application (/) commands.');
          _context6.next = 38;
          break;

        case 35:
          _context6.prev = 35;
          _context6.t1 = _context6["catch"](1);
          console.error("Error clearing commands: ".concat(_context6.t1.message));

        case 38:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[1, 35], [9, 20, 24, 32], [25,, 27, 31]]);
}

function registerCommands() {
  var commands, rest;
  return regeneratorRuntime.async(function registerCommands$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
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
          }];
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context7.prev = 2;
          console.log('Started refreshing application (/) commands.');
          _context7.next = 6;
          return regeneratorRuntime.awrap(rest.put(Routes.applicationCommands(CLIENT_ID), // Register global commands
          {
            body: commands
          }));

        case 6:
          console.log('Successfully reloaded application (/) commands.');
          _context7.next = 12;
          break;

        case 9:
          _context7.prev = 9;
          _context7.t0 = _context7["catch"](2);
          console.error("Error registering commands: ".concat(_context7.t0.message));

        case 12:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[2, 9]]);
}

client.login(DISCORD_TOKEN);