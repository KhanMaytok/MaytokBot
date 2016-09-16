'use strict';

const _ = require('lodash');
const Script = require('smooch-bot').Script;
var http = require('http');
var apagado = {
  host: '54.149.121.113',
  path: '/',
  port: '4568'
};
var encendido = {
  host: '54.149.121.113',
  path: '/enciende',
  port: '4568'
};
var reinicia_base = {
  host: '54.149.121.113',
  path: '/reinicia-base',
  port: '4568'
};


const scriptRules = require('./script.json');

module.exports = new Script({
    processing: {
        //prompt: (bot) => bot.say('Beep boop...'),
        receive: () => 'processing'
    },

    start: {
        receive: (bot) => {
            return bot.say('Hola hola! Bienvenido.')
                .then(() => 'speak');
        }
    },

    speak: {
        receive: (bot, message) => {

            let upperText = message.text.trim().toUpperCase();

            function updateSilent() {
                switch (upperText) {
                    case "APAGA LA BASE":
                        http.request(apagado, function(){}).end();
                        return Promise.resolve();
                    case "ENCIENDE LA BASE":
                        http.request(encendido, function(){}).end();
                        return Promise.resolve();
                    case "REINICIA LA BASE":
                        http.request(reinicia_base, function(){}).end();
                        return Promise.resolve();
                    case "CONNECT ME":
                        return bot.setProp("silent", true);
                    case "DISCONNECT":
                        return bot.setProp("silent", false);
                    default:
                        return Promise.resolve();
                }
            }

            function getSilent() {
                return bot.getProp("silent");
            }

            function processMessage(isSilent) {
                if (isSilent) {
                    return Promise.resolve("speak");
                }

                if (!_.has(scriptRules, upperText)) {
                    return bot.say(`Lo siento, parece que mi creador aun no me enseña cómo responder a tu pedido.`).then(() => 'speak');
                }

                var response = scriptRules[upperText];
                var lines = response.split('\n');

                var p = Promise.resolve();
                _.each(lines, function(line) {
                    line = line.trim();
                    p = p.then(function() {
                        console.log(line);
                        return bot.say(line);
                    });
                })

                return p.then(() => 'speak');
            }

            return updateSilent()
                .then(getSilent)
                .then(processMessage);
        }
    }
});
