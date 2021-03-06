'use strict';

const smoochBot = require('smooch-bot');
const MemoryLock = smoochBot.MemoryLock;
const SmoochApiStore = smoochBot.SmoochApiStore;
const SmoochApiBot = smoochBot.SmoochApiBot;
const StateMachine = smoochBot.StateMachine;
const app = require('../app');
const script = require('../script');
const SmoochCore = require('smooch-core');
const jwt = require('../jwt');
const fs = require('fs');

class BetterSmoochApiBot extends SmoochApiBot {
    constructor(options) {
        super(options);
    }

    sendImage(imageFileName) {
        const api = this.store.getApi();
        let message = Object.assign({
            role: 'appMaker'
        }, {
            name: this.name,
            avatarUrl: this.avatarUrl
        });
        var real = fs.realpathSync(imageFileName);
        let source = fs.readFileSync(real);

        return api.conversations.uploadImage(this.userId, source, message);
    }
}

const name = 'SmoochBot';
const avatarUrl = 'https://s.gravatar.com/avatar/f91b04087e0125153623a3778e819c0a?s=80';
const store = new SmoochApiStore({
    jwt
});
const lock = new MemoryLock();

function createWebhook(smoochCore, target) {
    return smoochCore.webhooks.create({
            target,
            triggers: ['message:appUser']
        })
        .then((res) => {
            console.log('Smooch webhook created at target', res.webhook.target);
            return smoochCore.webhooks.create({
                        target,
                        triggers: ['postback']
                    })
                    .then((res) => {
                        console.log('Smooch postback webhook created at target', res.webhook.target);
                    })
                    .catch((err) => {
                        console.error('Error creating Smooch webhook:', err);
                        console.error(err.stack);
                    });
            }            
        )
        .catch((err) => {
            console.error('Error creating Smooch webhook:', err);
            console.error(err.stack);
        });
}

// Create a webhook if one doesn't already exist
if (process.env.SERVICE_URL) {
    const target = process.env.SERVICE_URL.replace(/\/$/, '') + '/webhook';
    const smoochCore = new SmoochCore({
        jwt
    });
    smoochCore.webhooks.list()
        .then((res) => {
            if (!res.webhooks.some((w) => w.target === target)) {
                createWebhook(smoochCore, target);
            }
        });
}

app.post('/webhook', function(req, res, next) {
    console.log('Hemos recibido un WebHook');
    var smoochPayload = '';
    const smoochApi = new SmoochCore({
        jwt
    });
    
    

    var isPostback = req.body.trigger == "postback";
    var msg = '';

    const appUser = req.body.appUser;
    const userId = appUser.userId || appUser._id;
    
    if(isPostback){
        console.log("\n\n\n\nES POSTBACK\n\n\n\nES POSTBACK\n\n\n\nES POSTBACK\n\n\n\nES POSTBACK");
        smoochPayload = req.body.postbacks[0].action.payload;
        console.log("\n\n\nEL PAYLOAD ES:" , smoochPayload);
        //Sending Reply
        //image http://i.imgur.com/mhNE5f3.png
        if (smoochPayload === 'comprar') {
            console.log("\n\n\nVAMOS A COMPRAR\n\n\n");
            smoochApi.conversations.sendMessage('userId', {
                text: 'Quiero comprar zapatos',
                role: 'appMaker',
                actions: [
                  {
                    type: 'buy',
                    text: 'Los quiero ahora',
                    amount: 8000
                  }
                ]
            });
            smoochApi.conversations.sendMessage(userId, {
                text: 'Así que quieres comprar sneakers. ¿Te gustan estos?',
                role: 'appMaker',
                mediaUrl: 'http://imgur.com/mhNE5f3.png',
                mediaType: 'image/jpeg'
            });
            res.end();
        } else if (smoochPayload === 'RESERVE_MONDAY') {
            CalendarController.reserve(userId, 'monday');
            res.end();
        }
    }
    
    const stateMachine = new StateMachine({
        script,
        bot: new BetterSmoochApiBot({
            name,
            avatarUrl,
            lock,
            store,
            userId
        })
    });    

    if(!isPostback) {
        const messages = req.body.messages.reduce((prev, current) => {
            if (current.role === 'appUser') {
                prev.push(current);
            }
            return prev;
        }, []);

        if (messages.length === 0 && !isTrigger) {
            return res.end();
        }

        msg = messages[0];
    } else {
        msg = req.body.postbacks[0];
        msg.text = msg.action.text;
    }

    stateMachine.receiveMessage(msg)
        .then(() => res.end())
        .catch((err) => {
            console.error('SmoochBot error:', err);
            console.error(err.stack);
            res.end();
        });
});

var server = app.listen(process.env.PORT || 8000, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Smooch Bot listening at http://%s:%s', host, port);
});
