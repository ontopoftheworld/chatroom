var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),
    anyDB           = require('any-db'),
    conn            = anyDB.createConnection('sqlite3://chatroom.db'),
    path            = require('path')
    app.use(express.static(path.join(__dirname, 'css')));
    app.use(bodyParser.urlencoded({extended:false}));
    app.use(bodyParser.json());
    app.set("view engine", "ejs");

    //Database schema:
    var chatroomsql = `CREATE TABLE IF NOT EXISTS chatrooms(
                        room_id TEXT PRIMARY KEY);`

    var messagesql = `CREATE TABLE IF NOT EXISTS messages (
                        msg_id INTEGER PRIMARY KEY AUTOINCREMENT, 
                        room TEXT, 
                        nickname TEXT,
                        body TEXT);`

    conn.query(chatroomsql, function (err){
        if (err) console.error(err);
    });
    
    conn.query(messagesql, function (err){
        if (err) console.error(err);
    });

    //Generate random room ID
    function generateRoomIdentifier(){
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var result = '';
        for (var i = 0; i < 6; i++)
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }

    //Function to check if room_id is unique
    function isUnique(gen_id){
        conn.query("SELECT * FROM chatrooms WHERE room_id=$1", [gen_id], function (err, row) {
            if (err) console.log(err);
            else {
                if (row.rowCount > 0) {
                    console.log('Not Unique - generating new Chatroom ID');
                    isUnique(generateRoomIdentifier());
                } else {
                    conn.query('INSERT INTO chatrooms VALUES($1);', [gen_id], function (err, row) {
                        if (err) console.error(err);
                    });
                    return true;
                }
            }
        });
    }

    app.use((req, res, next) => {
        const test = /\?[^]*\//.test(req.url);
        if (req.url.substr(-1) === '/' && req.url.length > 1 && !test || req.url.substr(-1) === '?' && req.url.length > 1 && !test)
          res.redirect(301, req.url.slice(0, -1));
        else
          next();
      });

    app.get("/", function(req, res){
        res.render("index");
    });

    app.post("/", function(req, res){
        chatroom_id = generateRoomIdentifier();
        if(!isUnique(chatroom_id)) {
            res.redirect("/" + chatroom_id);
        }
    });

    app.get("/:room_id", function(req, res){
        var roomid = req.params.room_id;
        conn.query("SELECT * FROM chatrooms WHERE room_id=$1", [roomid], function (err, row) {
            if (err) console.log(err);
            else {
                if (row.rowCount > 0) {
                    res.render("chatroom", {roomid: roomid});
                } else {
                    res.redirect("/");
                }
            }
        });
    });

    app.get('/:room_id/messages', function(req, res){
        var roomid = req.params.room_id;
        conn.query(`SELECT nickname, body, msg_id FROM messages WHERE room=$1 ORDER BY msg_id;`, [roomid], function (err, row) {
            if (err) console.error(err);
            else res.json(row.rows);
        })
    });

    app.post('/:room_id/messages', function(req, res) {
        var nick = req.body.nickname;
        var body = req.body.message;
        var roomid = req.params.room_id;
        conn.query('INSERT INTO messages VALUES(NULL, $2, $3, $4)', [roomid, nick, body], function (err, data) {
            if (err) {
                console.error(err);
                res.end();
            }
            else res.end();
        })
    });

    app.all('*', function(req, res) {
        res.redirect("/");
    });

    app.on('SIGINT', function() {
        conn.end();
    });

    app.listen(8080, function(){
        console.log('- Server listening on port 8080');
    });