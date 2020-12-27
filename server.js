const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const bodyParser = require('body-parser');
const port = 8080;

var key = fs.readFileSync(__dirname + '\\certs\\server.key');
var cert = fs.readFileSync(__dirname + '\\certs\\server.crt');
var options = {
    key: key,
    cert: cert
};

app = express()
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/resources'));
app.use(express.static(__dirname + '/roms'));
app.use(bodyParser.raw({ limit: "50mb", extended: true }));
app.use('/', router);

router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/mobile.html')); // mobile browser
});

router.get('/rom_list', function (req, res) {
    var rom_list = fs.readdirSync(__dirname + '\\roms');
    var str_rom_list = rom_list
        .map(function (rom_path) { return path.basename(rom_path); })
        .filter(function (rom_path) { return rom_path.split('.').length > 1 })
        .join(',');

    console.log('request(rom_list) -->', str_rom_list);

    res.set('Content-Type', 'text/plain');
    res.send(str_rom_list);
});

router.post('/save', function (req, res) {
    var body = req.body;
    var rom_name = req.header('$rom_name');
    var save_rom_path = __dirname + '\\roms\\save\\' + rom_name + '.sav';

    fs.writeFile(save_rom_path, body, 'binary', function (err) {
        if (err) {
            console.log('request(save) --> Error: ', err);
        } else {
            console.log('request(save) -->', save_rom_path);
        }

        res.send();
    });
});

var server = https.createServer(options, app);

server.listen(port, () => {
    console.log("server starting on port : " + port)
});