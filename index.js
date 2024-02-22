const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = 3000;

let userSessions = new Map();

class CustomAuth extends LocalAuth {
    async retrieveCredentials(clientId) {
        return userSessions.get(clientId);
    }

    async saveCredentials(clientId, credentials) {
        userSessions.set(clientId, credentials);
    }
}

const authenticateClient = async (userId) => {
    console.log(`\nVerificando se tem autenticação salva - userId-${userId} ...`)
    let loadingStartTime;

    const client = new Client({
        authStrategy: new CustomAuth({ clientId: userId }),
    });    

    client.on('loading_screen', (percent, message) => {
        if(percent == 0){
            console.log(`\nIniciando autenticação...`);
            loadingStartTime = Date.now();
        } else {
            const loadingTime = (Date.now() - loadingStartTime)/1000;
            console.log(`WhatsApp terminou de carregar. Tempo de carregamento: ${loadingTime}s`);
        }
    });

    client.on('auth_failure', (message) => {
        console.log(`\nErro ao autenticar - userId ${userId}`);
        console.log(`Erro: ${message}`);
    });

    client.on('authenticated', (session) => {
        console.log(`\nAutenticado pelo userId ${userId}`);
        console.log(`ClientId: ${client.options.authStrategy.clientId}`);
    });

    client.on('disconnected', (reason) => {
        console.log(`\nSessão desconectada userId ${userId}`);
        console.log(`Reason: ${reason}`);
        client.destroy();
    });

    client.on('qr', qr => {
        console.log(`\nAutenticação não encontrada.`)
        console.log(`Scaneie o qrCode. UserId - ${userId}`);
        qrcode.generate(qr, { small: true });
    });

    client.on('message', message => {
        if(message.from.includes('@c.us') && !message.hasMedia && message.body !== ''){
            console.log('\nNova mensagem recebida:', message.body);
            console.log('From: ', message.from);
            console.log('To: ', message.to);
            console.log(client.options.authStrategy.clientId);
        }
    })

    client.initialize();
};


app.post('/newClient/:id', (req, res) => {
    const userId = req.params.id;
    if (userSessions.has(userId)) {
        res.send('Usuário já está autenticado.');
    } else {
        authenticateClient(userId);
        res.send('Autenticação iniciada.');
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
