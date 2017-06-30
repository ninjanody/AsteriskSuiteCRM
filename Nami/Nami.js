$('head').append('<link type="text/css" rel="stylesheet" href="custom/modules/Nami/card.css">');
function websocket_connection() {
    if($('#websocket').length > 0)
        return false;

    socket = new WebSocket("ws:89.184.66.252:8081/ws");

    socket.onopen = function(){
      createCardFromStorage();
    };

    socket.onclose = function(){
        console.log("Socket closed");
    };

    socket.onerror = function(err){
        console.log("Error: " + err.data);
    };
    socket.onmessage = function(msg){
      cardListener(msg);
    };

};
websocket_connection();

var card_listeners = function() {
    if($('#websocket').length > 0)
        return false;

    $(".hide_card").live("click", function(){
        current_popup_top = $(this).offset().top;
        if($(this).parent().next().next().css('display') == "none") {
            $(".call_popup").each(function(){
                if($(this).offset().top < current_popup_top) {
                    $(this).css({"bottom": parseInt($(this).css('bottom').slice(0, -2)) + "px"});
                }
            });
            $(this).parent().parent().css({'height': '220px'});
            $(this).parent().parent().css({'padding-top': '10px'});
            $(this).parent().next().next().show(500);

        }
        else {
            $(this).parent().parent().css({'height': '40px'});
            $(this).parent().parent().css({'padding-top': '0px'});
            $(this).parent().next().next().hide(500);
            $(".call_popup").each(function(){
                if($(this).offset().top > current_popup_top) {
                    $(this).css({"bottom": parseInt($(this).css('bottom').slice(0, -2)) + "px"});
                }
            });
        }

    });

    $(".delete_card").live("click", function(){
        deleteCard($(this).attr('id'));
    });

    $(".create_memo").live("click", function(){
        console.log($(this).prev().val());
        var textarea = $(this).parent().prev();
        $.ajax({
            type: "POST",
            url: "/index.php?entryPoint=add_new_call",
            data: {user_id: '{$current_user->id}', memo: $(this).parent().prev().val(), call_id: $(this).parent().parent().parent().attr('id')},
            success: function(data)
            {
                textarea.val(" ");
                console.log('success memo created');
            }

        });
    });

    $(".redirect_call").live("click", function(){
        var person = prompt("Введите SIP юзера:", null);
        if(person != null && person != "")
        {
            socket.send(JSON.stringify({sip: person, channel: $(this).attr('channel-id'), action: 'Redirect', number: '300'}));
        }
    });

    $(".call_asterisk").on('click', function(){
        console.log("Call to number: " + $(this).context.previousSibling.data.trim());
        socket.send(JSON.stringify({sip: $current_user->sip_c, number: $(this).context.previousSibling.data.trim(), action: 'Originate'}));
    });


    var deleteCard = function(id)
    {
        $('.call_popup').each(function(){
            if($(this).offset().top < $("#"+id).offset().top)
            {
                $(this).css({'bottom': parseInt($(this).css('bottom').slice(0, -2)) - 30 + 'px'});
            }
        });
        $("#"+id).remove();
        delete localStorage['time-'+id];
        delete localStorage[id];
    }
}
card_listeners();



function start_time(key) {
    var boolean_first_start = false;
    $('.timer-'+key).text('00:00:00');
    if(localStorage.getItem('time-'+key) != null) {
        $('.timer-'+key).text(JSON.parse(localStorage.getItem('time-'+key)).time);
        times = JSON.parse(localStorage.getItem('time-'+key)).time.split(':');
        boolean_first_start = true;
        var hour_stor = parseInt(times[0]);
        var minutes_stor = parseInt(times[1]);
        var sec_stor = parseInt(times[2]);
        if(times[0].toString().length == 2) hour_stor = parseInt(times[0].slice(1));
        if(times[1].toString().length == 2) minutes_stor = parseInt(times[1].slice(1));
        if(times[2].toString().length == 2) sec_stor = parseInt(times[2].slice(1));
    }

    var this_date = new Date();
    start_time_interval = setInterval(function(){
        var new_date = new Date() - this_date;
        var sec   = Math.abs(Math.floor(new_date/1000)%60) ; //sek
        var min   = Math.abs(Math.floor(new_date/1000/60)%60) ; //min
        var hours = Math.abs(Math.floor(new_date/1000/60/60)%24) ; //hours
        if(boolean_first_start) {
            hours += hour_stor;
            min += minutes_stor;
            sec += sec_stor;
        }

        if (sec.toString().length   == 1) sec   = '0' + sec;
        if (min.toString().length   == 1) min   = '0' + min;
        if (hours.toString().length == 1) hours = '0' + hours;
        $('.timer-'+key).text(hours + ':' + min + ':' + sec);
        time = hours + ":" + min + ":" + sec;
        if(localStorage.getItem('time-'+key) == null)
        {
            localStorage.setItem('time-'+key, JSON.stringify({"time": time}));
        }
        else {
            localStorage.removeItem('time-'+key);
            localStorage.setItem('time-'+key, JSON.stringify({"time": time}));
        }
    },100);

};

function createCardFromStorage() {
    for(let i = 0; i <= localStorage.length; i++)
    {
        var key = localStorage.key(i)
        if(key != null && key.length == 36)
        {
            var linked_lead_storage = "/";
            card_obj = JSON.parse(localStorage.getItem(key));
            if($('div[id="+key+"]').length == 0) {

                var html_linked_lead = '<div id="call_lead_info"><a id="linked_lead" href="/index.php?action=ajaxui#ajaxUILoc=index.php%3Fmodule%3DLeads%26action%3DEditView%26return_module%3DLeads%26return_action%3DDetailView">Создать лида</a></div>';
                if(card_obj.linked_id != null)
                {
                    html_linked_lead = '';
                    linked_leads_arr = card_obj.linked_id.split('^|^');
                    linked_name_leads_arr = card_obj.linked_name.split('^|^');
                    linked_leads_arr.forEach(function(item, l, arr){
                        linked_lead = window.location.protocol + "//" + window.location.hostname + "/index.php?action=DetailView&module=Leads&record="+item;
                        html_linked_lead += '<div id="call_lead_info"><a id="linked_lead" href="'+linked_lead+'">'+linked_name_leads_arr[l]+'</a></div>';
                    });
                }
                text_on_top = card_obj.phone + ' - Звонок';
                redirect_button = "<button channel-id='"+card_obj.channel+"' class='redirect_call'>Перенаправить</button>";
                if(card_obj.ended == "yes")
                {
                    text_on_top = "ЗВОНОК ЗАВЕРШЕН";
                    redirect_button = "";
                }
                var bottom_pos_for_new = 0;
                var card = '<div class="call_popup" id="'+key+'"><div class="div_call_top"><div class="hover_call" id="'+card_obj.uniq_id+'" stage="1">'+text_on_top+'</div><div class="hide_card" id='+key+'>_</div><div class="delete_card" id="'+key+'">&times</div></div><hr class="call_hr"><div class="call_container"><h2 id="call_type-' +card_obj.call_id+ '" class="type_call">'+card_obj.call+'</h2>';
                card += '<span id="timer_call" class="timer-'+key+'">'+JSON.parse(localStorage.getItem("time-"+key)).time+'</span><p id="call_number">' +card_obj.phone+ '</p>'+html_linked_lead+'<textarea style="margin-left:5px;" placeholder="Создать заметку"></textarea><div class="buttons_call">'+ redirect_button +'<button class="create_memo">Создать</button></div></div></div>';
                if($(".call_popup").length == 0){
                    $('body').append(card);
                }
                else {
                    var bottom_pos = 220;
                    var z = 0;
                    $(".call_popup").each(function(){
                        if($(this).children().eq(2).css('display') != "none")
                            $(this).children().eq(2).hide();
                        $(this).css({'z-index': 1000 - z});
                        $(this).css({'bottom' : bottom_pos + "px" });
                        bottom_pos += 30;
                        z++;
                    });
                    bottom_pos_for_new += bottom_pos;
                    $(card).insertAfter($('.call_popup').eq(0));

                }
                if(card_obj.ended == null)
                    start_time(key);

            }
        }
    }
}

function cardListener(msg){
    var message_arr = JSON.parse(msg.data);
    console.log(message_arr);
    if(message_arr['event'] == "Hangup")
    {
        $('.call_popup').each(function(){
            if($(this).children().eq(0).children().eq(0).attr('id').includes(message_arr['uniq_id'].split('.')[0])) {
                $(this).children().eq(0).children().eq(0).text("ЗВОНОК ЗАВЕРШЕН");
                $(this).find(".redirect_call").remove();
                clearInterval(start_time_interval);
                localStorage.setItem($(this).attr('id'), localStorage.getItem($(this).attr('id')).slice(0, -1) + ',"ended": "yes"}');
                $.ajax({
                    type: "POST",
                    url: "/index.php?entryPoint=add_new_call",
                    data: {"call_id": $(this).attr('id'), "time": JSON.parse(localStorage.getItem('time-'+$(this).attr('id'))).time},
                    success: function(data){
                        console.log("Time:  "+data);
                    }
                });
            }
        });
    }
    else {
        if(("$current_user->sip_c" == message_arr['sip'] || message_arr['channel'].includes("{$current_user->sip_c}")) && message_arr['call_id'].length == 36){
            var locStorageObj = {
                phone: message_arr['phone'],
                call: message_arr['call'],
                linked_id: message_arr['linked_id'],
                uniq_id: message_arr['uniq_id'],
                channel: message_arr['channel'],
                linked_name: message_arr['linked_name'],
                linked_type: message_arr['linked_type']
            };
            localStorage.setItem(message_arr['call_id'], JSON.stringify(locStorageObj));

            var html_linked_lead = '<div id="call_lead_info"><a id="linked_lead" href="/index.php?action=ajaxui#ajaxUILoc=index.php%3Fmodule%3DLeads%26action%3DEditView%26return_module%3DLeads%26return_action%3DDetailView">Создать лида</a></div>';
            if(message_arr['linked_id'] != null)
            {
                html_linked_lead = '';
                linked_leads_arr = message_arr['linked_id'].split('^|^');
                linked_name_leads_arr = message_arr['linked_name'].split('^|^');
                linked_leads_arr.forEach(function(item, l, arr){
                    linked_lead = window.location.protocol + "//" + window.location.hostname + "/index.php?action=DetailView&module=Leads&record="+item;
                    html_linked_lead += '<div id="call_lead_info"><a id="linked_lead" href="'+linked_lead+'">'+linked_name_leads_arr[l].replace('null', '')+'</a></div>';
                });
            }
            var bottom_pos_for_new = 0;
            redirect_button = "<button channel-id='"+message_arr['channel']+"' class='redirect_call'>Перенаправить</button>";
            var card = '<div class="call_popup" style="bottom: '+bottom_pos+'px" id="'+message_arr['call_id']+'"><div class="div_call_top"><div class="hover_call" id="'+message_arr['uniq_id']+'" stage="1">'+ message_arr['phone']+ ' - Звонок</div><div class="hide_card" id='+message_arr['call_id']+'>_</div><div class="delete_card" id="'+message_arr['call_id']+'">&times</div></div><hr class="call_hr"><div class="call_container"><h2 class="type_call" id="call_type-' +message_arr['call_id']+ '">'+message_arr['call']+'</h2>';
            card += '<span id="timer_call" class="timer-'+message_arr['call_id']+'"></span><p id="call_number">' +message_arr['phone']+ '</p>'+html_linked_lead+'<textarea style="margin-left:5px;" placeholder="Создать заметку"></textarea><div class="buttons_call">'+ redirect_button +'<button class="create_memo">Создать</button></div></div></div>';
            if($(".call_popup").length == 0){
                $('body').append(card);
            }
            else {
                var bottom_pos = 220;
                var z = 0;
                $(".call_popup").each(function(){
                    if($(this).children().eq(2).css('display') != "none")
                        $(this).children().eq(2).hide();
                    $(this).css({'z-index': 1000 - z});
                    $(this).css({'bottom' : bottom_pos + "px" });
                    bottom_pos += 30;
                    z++;
                });
                bottom_pos_for_new += bottom_pos;
                $(card).insertAfter($('.call_popup').eq(0));
            }
            start_time(message_arr['call_id']);
        }
    }
}