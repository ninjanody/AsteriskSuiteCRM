var webSocket = new require("ws");
var AmiIo = require("ami-io");
var mysql = require("mysql");
var http = require("http");
var querystring = require("querystring");

var host_mysql = "localhost";
var user_mysql = "root";
var password_mysql = "123qws";
var db_mysql = "crm";

var connection;

function handleDisconnect() {
    connection = mysql.createConnection({host: host_mysql, user: user_mysql, password: password_mysql, database: db_mysql});
    connection.connect(function(err) {
        if(err) {
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000);
        }
    });
    connection.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}
handleDisconnect();


var host = "localhost";
var option_for_request = {                    // option for request to add new call
     path: "/index.php?entryPoint=add_new_call",
     method: "POST",
     headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
     }
};

var sip_array = [];
//silentLogger = new AmiIo.SilentLogger();
var aio = AmiIo.createClient({host: "217.66.107.20", port: "5038", login: "crm", password: "b76r67rH"});

var clients = {};
var webSocketServer = new webSocket.Server({port: 8081, path: '/ws'});
webSocketServer.on("connection", function(ws){
    var id = Math.random();
    clients[id] = ws;
    console.log("Connection is established: " + id);

    var sips_sql = "SELECT * FROM users_cstm WHERE sip_c IS NOT NULL";
    sips_query = connection.query(sips_sql, function (error, results, fields) {
        if(error) throw error;
        for(q = 0; q < results.length; q++)
          {
             if(results[q].sip_c != "" && results[q].sip_c != null && sip_array.indexOf(results[q].sip_c) == -1)
               sip_array.push(results[q].sip_c);
          }
    });
      //  console.log("#####################################################"+sip_array);
        ws.on("message", function incoming(message) {
        console.log("//////////////Recived :" + message);
        message = JSON.parse(message);
         if(message.action == "Originate")
            {
               originate = new AmiIo.Action.Originate();
               originate.Channel = 'SIP/' + message.sip;
               originate.Context = 'from-internal';
               originate.Exten = message.number.substr(3);
               originate.Priority = 1;
               originate.Async = true;
               originate.WaitEvent = true;
               aio.send(originate, function (err, data) {
                   if(err)
                       console.log("!!!!!!!!!!!!!!!! Error while originate: " + err);
                   else {
                       console.log("///////////////////////  Originate callback: " + data);
                   }
               })

            }
         else if(message.action = "Redirect") {
               redirect = new AmiIo.Action.Redirect();
               redirect.Context = 'default';
               redirect.Channel = message.channel;
               redirect.Exten = "SIP/"+message.number;
               redirect.Priority = 1;
             aio.send(redirect, function (err, data) {
                 if(err)
                     console.log("!!!!!!!!!!!!!!!!!!!!!!!!!! Error while redirect: " + err);

             });
         }
    });
    
    ws.on('close', function(){
       console.log("Connection is closed: " + id);
       delete clients[id];
    });
});


aio.on("incorrectServer", function(){
    aio.logger.error("Invalid AMI welcome message. Are you sure if this is AMI?");
    console.log("Invalid AMI welcome message. Are you sure if this is AMI?");
    connection.destroy();
    process.exit();
});

aio.on("connectionRefused", function(){
    aio.logger.error("Connection refused.");
    console.log("Connection refused.");
    connection.destroy();
    process.exit();
});

aio.on("incorrectLogin", function(){
    aio.logger.error("Incorrect login or password");
    console.log("Incorrect login or password");
    connection.destroy();
    process.exit();
});

aio.on("event", function(evt){
    if(sip_array.indexOf(evt.dialstring) > -1 || (evt.channel != null && sip_array.indexOf(evt.channel.substring(4).split('-')[0]) > -1)) {
       // aio.logger.info("Event: ", evt);
        if (evt.event == "Dial" && evt.subevent != "End") {
            send_arr = {};
            var type_of_call = "Inbound";
            var phone = evt.calleridnum;
            if(evt.dialstring.length <= 6) {
                console.log(evt.dialstring, "<<<<<<<<<<<<<<<<<<<<<<SIP");
                type_of_call = "Inbound";
                phone = evt.calleridnum;
                send_arr['sip'] = evt.dialstring;
                send_arr["call"] = "Входящий";
                console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<before include");
                if(phone.includes("681997920") || phone.includes("950456984"))
                  {
                      console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<include");
                      redirect = new AmiIo.Action.Redirect();
                      redirect.Context = 'default';
                      redirect.Channel = evt.channel;
                      redirect.Exten = "SIP/1644";
                      redirect.Priority = 1;
                      aio.send(redirect, function (err, data) {
                          if(err)
                              console.log("!!!!!!!!!!!!!!!!!!!!!!!!!! Error while redirect: " + err);
                      });
                  }

            }
            else {
                type_of_call = "Outbound";
                phone = evt.dialstring.substring(6);
                if(phone.includes("681997920") || phone.includes("950456984"))
                {
                    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<include");
                    redirect = new AmiIo.Action.Redirect();
                    redirect.Context = 'default';
                    redirect.Channel = evt.channel;
                    redirect.Exten = "1644";
                    redirect.Priority = 1;
                    aio.send(redirect, function (err, data) {
                        if(err)
                            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!! Error while redirect: " + err);
                    });
                }
                send_arr['sip'] = evt.channel.substring(4).split('-')[0];
                send_arr["call"] = "Исходящий";
            }
            var phonewithprefix = phone;
            if (phone.length <= 10) {
                phonewithprefix = "+38" + phone;
            }
            send_arr["phone"] = phone;
            send_arr['linked_id'] = null;
            send_arr['uniq_id'] = evt.uniqueid;
            send_arr['event'] = evt.event;
            send_arr['channel'] = evt.channel;
            var sql = "SELECT id, first_name, last_name FROM leads WHERE deleted = 0 AND (phone_mobile LIKE '%" + phone + "%' OR phone_work LIKE '%" + phone + "%' OR phone_mobile LIKE '%" + phonewithprefix + "%' OR phone_work LIKE '%" + phonewithprefix + "%')";
            sql += " UNION SELECT id, first_name, last_name FROM contacts WHERE deleted = 0 AND (phone_mobile LIKE '%" + phone + "%' OR phone_work LIKE '%" + phone + "%' OR phone_mobile LIKE '%" + phonewithprefix + "%' OR phone_work LIKE '%" + phonewithprefix + "%')";
            sql += " UNION SELECT id, name, description FROM accounts WHERE deleted = 0 AND (phone_office LIKE '%" + phone + "%' OR phone_office LIKE '%" + phonewithprefix + "%')";
            var query = connection.query(sql, function (error, results, fields) {
                if (error) throw error;
                if (results.length > 0) {
                    send_arr['linked_id'] = results[0].id;
                    var releted_to = results[0].id;
                    send_arr['linked_name'] = results[0].first_name + " " + results[0].last_name;
                    for (k = 1; k < results.length; k++) {
                        send_arr['linked_id'] += "^|^" + results[k].id;
                        send_arr['linked_name'] += "^|^" + results[k].first_name + " " + results[k].last_name;
                    }

                }
                var req = http.request(option_for_request, function (res) {
                    res.setEncoding('utf8');
                    res.on('data', function (body) {
                        send_arr['call_id'] = body.split("^|^")[0];
                        send_arr['linked_type'] = body.split("^|^")[1];
                        if(evt.dialstring.length <= 6) {    // bug with sip
                            send_arr['sip'] = evt.dialstring;
                        }
                        else {
                            send_arr['sip'] = evt.channel.substring(4).split('-')[0];
                        }
                        for (var key in clients) {
                            clients[key].send(JSON.stringify(send_arr));
                        }
                    });

                });
                req.on('error', function (err) {
                    console.log("Error in request: " + err);
                });
                req.write(querystring.stringify({
                    phone: phone,
                    releted_to: releted_to,
                    type: type_of_call,
                    sip: send_arr['sip'],
                    linked_id: send_arr['linked_id'],
                    uniq_id: send_arr['uniq_id']
                }));
                req.end();
            });
        }
        else if (evt.event == "Hangup" || evt.event == "SoftHangupRequest") {
            send_arr = {};
            send_arr['sip'] = evt.dialstring;
            send_arr["event"] = "Hangup";
            send_arr['uniq_id'] = evt.uniqueid;
            send_arr['call_id'] = "be01ced2-19df-558a-41fa-5900688c0f58"; // this is variable for client side checking, it can be any< but only 32 char
            for (var key in clients) {
                clients[key].send(JSON.stringify(send_arr));
            }
        }
        else if(evt.event == "Dial" && evt.subevent != "End" && evt.channel.includes('Local'))
          {
              console.log("     asdadasdasdasd?????????????????????????????????????????????????????????????????");
          }
      }
    });



aio.on("connected", function(){
    aio.logger.info("You are successful connenct. AMI is working");
    console.log("connected");
});

aio.on("disconnected", function(){
    aio.logger.info("You were disconnected from AMI");
    aio = AmiIo.createClient({host: "217.66.107.20", port: "5038", login: "crm", password: "b76r67rH"});
    while(!aio['connected'])
     {
         aio = AmiIo.createClient({host: "217.66.107.20", port: "5038", login: "crm", password: "b76r67rH"});
     }
});

aio.connect(true, 2000);



