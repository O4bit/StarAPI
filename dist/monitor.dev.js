"use strict";

require('dotenv').config();

var axios = require('axios');

var _require = require('child_process'),
    exec = _require.exec;

var API_URL = process.env.API_URL;
var API_TOKEN = process.env.API_TOKEN;
var DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function checkServerStatus() {
  var response;
  return regeneratorRuntime.async(function checkServerStatus$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/health"), {
            headers: {
              Authorization: "Bearer ".concat(API_TOKEN)
            }
          }));

        case 3:
          response = _context.sent;

          if (!(response.data.status !== 'OK')) {
            _context.next = 9;
            break;
          }

          _context.next = 7;
          return regeneratorRuntime.awrap(sendDiscordNotification('Server is down!'));

        case 7:
          _context.next = 9;
          return regeneratorRuntime.awrap(rebootServer());

        case 9:
          _context.next = 15;
          break;

        case 11:
          _context.prev = 11;
          _context.t0 = _context["catch"](0);
          _context.next = 15;
          return regeneratorRuntime.awrap(sendDiscordNotification('Failed to check server status!'));

        case 15:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 11]]);
}

function checkWebsiteStatus() {
  var response;
  return regeneratorRuntime.async(function checkWebsiteStatus$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/websiteStatus?url=https://orbit.deepspaceproductions.net"), {
            headers: {
              Authorization: "Bearer ".concat(API_TOKEN)
            }
          }));

        case 3:
          response = _context2.sent;

          if (!(response.data.status !== 'up')) {
            _context2.next = 7;
            break;
          }

          _context2.next = 7;
          return regeneratorRuntime.awrap(sendDiscordNotification('Website is down!'));

        case 7:
          _context2.next = 13;
          break;

        case 9:
          _context2.prev = 9;
          _context2.t0 = _context2["catch"](0);
          _context2.next = 13;
          return regeneratorRuntime.awrap(sendDiscordNotification('Failed to check website status!'));

        case 13:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 9]]);
}

function rebootServer() {
  var response;
  return regeneratorRuntime.async(function rebootServer$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/reboot"), {}, {
            headers: {
              Authorization: "Bearer ".concat(API_TOKEN)
            }
          }));

        case 3:
          response = _context3.sent;
          _context3.next = 6;
          return regeneratorRuntime.awrap(sendDiscordNotification(response.data.message));

        case 6:
          _context3.next = 12;
          break;

        case 8:
          _context3.prev = 8;
          _context3.t0 = _context3["catch"](0);
          _context3.next = 12;
          return regeneratorRuntime.awrap(sendDiscordNotification('Failed to reboot the server!'));

        case 12:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 8]]);
}

function sendDiscordNotification(message) {
  return regeneratorRuntime.async(function sendDiscordNotification$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(axios.post(DISCORD_WEBHOOK_URL, {
            content: message
          }));

        case 3:
          _context4.next = 8;
          break;

        case 5:
          _context4.prev = 5;
          _context4.t0 = _context4["catch"](0);
          console.error('Failed to send Discord notification:', _context4.t0);

        case 8:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 5]]);
}

function monitor() {
  return regeneratorRuntime.async(function monitor$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(checkServerStatus());

        case 2:
          _context5.next = 4;
          return regeneratorRuntime.awrap(checkWebsiteStatus());

        case 4:
        case "end":
          return _context5.stop();
      }
    }
  });
}

monitor();