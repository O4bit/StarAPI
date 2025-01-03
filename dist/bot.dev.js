"use strict";

require('dotenv').config();

var _require = require('child_process'),
    exec = _require.exec; // Import exec


var _require2 = require('discord.js'),
    Client = _require2.Client,
    GatewayIntentBits = _require2.GatewayIntentBits,
    REST = _require2.REST,
    Routes = _require2.Routes,
    EmbedBuilder = _require2.EmbedBuilder;

var axios = require('axios');

var client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var CLIENT_ID = process.env.CLIENT_ID;
var GUILD_ID = process.env.GUILD_ID;
var API_URL = process.env.API_URL;
var CHECK_INTERVAL = 60000; // Check every 60 seconds

var VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
client.once('ready', function () {
  console.log("Logged in as ".concat(client.user.tag, "!"));
  registerCommands();
  monitorServer();
});
client.on('interactionCreate', function _callee(interaction) {
  var commandName, token, response, guild, member, role, _guild, _member, status, _response, logs, embed, command, output;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (interaction.isCommand()) {
            _context.next = 2;
            break;
          }

          return _context.abrupt("return");

        case 2:
          commandName = interaction.commandName;

          if (!(commandName === 'verify')) {
            _context.next = 38;
            break;
          }

          _context.next = 6;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 6:
          token = interaction.options.getString('token');
          _context.prev = 7;
          _context.next = 10;
          return regeneratorRuntime.awrap(verifyToken(token));

        case 10:
          response = _context.sent;

          if (!response.verified) {
            _context.next = 28;
            break;
          }

          guild = client.guilds.cache.get(GUILD_ID);
          _context.next = 15;
          return regeneratorRuntime.awrap(guild.members.fetch(interaction.user.id));

        case 15:
          member = _context.sent;
          role = guild.roles.cache.get(VERIFIED_ROLE_ID);

          if (!role) {
            _context.next = 24;
            break;
          }

          _context.next = 20;
          return regeneratorRuntime.awrap(member.roles.add(role));

        case 20:
          _context.next = 22;
          return regeneratorRuntime.awrap(interaction.editReply('You have been verified and given access.'));

        case 22:
          _context.next = 26;
          break;

        case 24:
          _context.next = 26;
          return regeneratorRuntime.awrap(interaction.editReply('Role not found.'));

        case 26:
          _context.next = 30;
          break;

        case 28:
          _context.next = 30;
          return regeneratorRuntime.awrap(interaction.editReply('Invalid token. Verification failed.'));

        case 30:
          _context.next = 36;
          break;

        case 32:
          _context.prev = 32;
          _context.t0 = _context["catch"](7);
          _context.next = 36;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context.t0.message)));

        case 36:
          _context.next = 93;
          break;

        case 38:
          // Check if the user has the verified role
          _guild = client.guilds.cache.get(GUILD_ID);
          _context.next = 41;
          return regeneratorRuntime.awrap(_guild.members.fetch(interaction.user.id));

        case 41:
          _member = _context.sent;

          if (_member.roles.cache.has(VERIFIED_ROLE_ID)) {
            _context.next = 46;
            break;
          }

          _context.next = 45;
          return regeneratorRuntime.awrap(interaction.reply('You do not have the verified role to use this command.'));

        case 45:
          return _context.abrupt("return");

        case 46:
          if (!(commandName === 'status')) {
            _context.next = 56;
            break;
          }

          _context.next = 49;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 49:
          _context.next = 51;
          return regeneratorRuntime.awrap(getServerStatus());

        case 51:
          status = _context.sent;
          _context.next = 54;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [status]
          }));

        case 54:
          _context.next = 93;
          break;

        case 56:
          if (!(commandName === 'reboot')) {
            _context.next = 66;
            break;
          }

          _context.next = 59;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 59:
          _context.next = 61;
          return regeneratorRuntime.awrap(rebootServer());

        case 61:
          _response = _context.sent;
          _context.next = 64;
          return regeneratorRuntime.awrap(interaction.editReply(_response));

        case 64:
          _context.next = 93;
          break;

        case 66:
          if (!(commandName === 'logs')) {
            _context.next = 77;
            break;
          }

          _context.next = 69;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 69:
          _context.next = 71;
          return regeneratorRuntime.awrap(getServerLogs());

        case 71:
          logs = _context.sent;
          embed = new EmbedBuilder().setColor('#0099ff').setTitle('Server Logs').setDescription("Logs from the last hour: [View Logs](".concat(logs, ")")).setTimestamp().setFooter({
            text: 'Logs from the last hour'
          });
          _context.next = 75;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [embed]
          }));

        case 75:
          _context.next = 93;
          break;

        case 77:
          if (!(commandName === 'console')) {
            _context.next = 93;
            break;
          }

          _context.next = 80;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 80:
          command = interaction.options.getString('command');
          _context.prev = 81;
          _context.next = 84;
          return regeneratorRuntime.awrap(executeCommand(command));

        case 84:
          output = _context.sent;
          _context.next = 87;
          return regeneratorRuntime.awrap(sendLongMessage(interaction, output));

        case 87:
          _context.next = 93;
          break;

        case 89:
          _context.prev = 89;
          _context.t1 = _context["catch"](81);
          _context.next = 93;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context.t1.message)));

        case 93:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[7, 32], [81, 89]]);
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

                    if (status.description && status.description.includes('down')) {
                      channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

                      if (channel) {
                        channel.send({
                          embeds: [status]
                        });
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
  var response, uptimeResponse, embed;
  return regeneratorRuntime.async(function getServerStatus$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/systeminfo"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context4.sent;
          _context4.next = 6;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/health"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 6:
          uptimeResponse = _context4.sent;
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
          return _context4.abrupt("return", embed);

        case 11:
          _context4.prev = 11;
          _context4.t0 = _context4["catch"](0);
          return _context4.abrupt("return", new EmbedBuilder().setColor(0xff0000).setTitle('Server Status').setDescription('Server is down!').setTimestamp().setFooter({
            text: 'Server Status'
          }));

        case 14:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 11]]);
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
          return _context6.abrupt("return", response.data.url);

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

function executeCommand(command) {
  return regeneratorRuntime.async(function executeCommand$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          return _context7.abrupt("return", new Promise(function (resolve, reject) {
            exec(command, function (error, stdout, stderr) {
              if (error) {
                reject(new Error(stderr));
              } else {
                resolve(stdout);
              }
            });
          }));

        case 1:
        case "end":
          return _context7.stop();
      }
    }
  });
}

function sendLongMessage(interaction, message) {
  var maxLength, parts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, part;

  return regeneratorRuntime.async(function sendLongMessage$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          maxLength = 2000;

          if (!(message.length <= maxLength)) {
            _context8.next = 6;
            break;
          }

          _context8.next = 4;
          return regeneratorRuntime.awrap(interaction.editReply(message));

        case 4:
          _context8.next = 33;
          break;

        case 6:
          parts = message.match(new RegExp(".{1,".concat(maxLength, "}"), 'g'));
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context8.prev = 10;
          _iterator = parts[Symbol.iterator]();

        case 12:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context8.next = 19;
            break;
          }

          part = _step.value;
          _context8.next = 16;
          return regeneratorRuntime.awrap(interaction.followUp(part));

        case 16:
          _iteratorNormalCompletion = true;
          _context8.next = 12;
          break;

        case 19:
          _context8.next = 25;
          break;

        case 21:
          _context8.prev = 21;
          _context8.t0 = _context8["catch"](10);
          _didIteratorError = true;
          _iteratorError = _context8.t0;

        case 25:
          _context8.prev = 25;
          _context8.prev = 26;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 28:
          _context8.prev = 28;

          if (!_didIteratorError) {
            _context8.next = 31;
            break;
          }

          throw _iteratorError;

        case 31:
          return _context8.finish(28);

        case 32:
          return _context8.finish(25);

        case 33:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[10, 21, 25, 33], [26,, 28, 32]]);
}

function verifyToken(token) {
  var response;
  return regeneratorRuntime.async(function verifyToken$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/verify"), {
            token: token
          }, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context9.sent;
          return _context9.abrupt("return", response.data);

        case 7:
          _context9.prev = 7;
          _context9.t0 = _context9["catch"](0);
          throw new Error('Verification failed.');

        case 10:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function registerCommands() {
  var commands, rest;
  return regeneratorRuntime.async(function registerCommands$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
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
            name: 'verify',
            description: 'Verify your account with a bearer token',
            options: [{
              name: 'token',
              type: 3,
              // STRING
              description: 'The bearer token',
              required: true
            }]
          }];
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context10.prev = 2;
          console.log('Started refreshing application (/) commands.');
          _context10.next = 6;
          return regeneratorRuntime.awrap(rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: commands
          }));

        case 6:
          console.log('Successfully reloaded application (/) commands.');
          _context10.next = 12;
          break;

        case 9:
          _context10.prev = 9;
          _context10.t0 = _context10["catch"](2);
          console.error(_context10.t0);

        case 12:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[2, 9]]);
}

client.login(DISCORD_TOKEN);