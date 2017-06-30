<?php
if(!defined('sugarEntry') || !sugarEntry) die('Not A Valid Entry Point');
global $db;
global $current_user;

if(isset($_POST['memo']) && !is_null($_POST['memo']))
   {
       $note_bean = BeanFactory::newBean("Notes");
       $note_bean->assigned_user_id = $_POST['user_id'];
       $note_bean->created_by = $_POST['user_id'];
       $note_bean->parent_type = "Calls";
       $note_bean->parent_id = $_POST['call_id'];
       $note_bean->name = "Заметка к звонку";
       $note_bean->description = $_POST['memo'];
       $note_bean->save();
       $note_id = $note_bean->id;
       $created_by = $_POST['user_id'];
       $db->query("UPDATE notes SET created_by = '$created_by' WHERE id = '$note_id'");
       exit;
   }
if(isset($_POST['time']))
 {
     $call_bean = BeanFactory::getBean('Calls', $_POST['call_id']);
     $call_bean->time_c = $_POST['time'];
     $call_bean->save();
     exit;
 }
 if($_POST['type'] == "Outbound")
     $name = "Исходящий";
 else
     $name = "Входящий";
$sip = $_POST['sip'];
$user_id = $db->getOne("SELECT id_c FROM users_cstm WHERE sip_c = '{$sip}'", true);
$releted_to =  $_POST['releted_to'];

if($db->getOne("SELECT * FROM accounts WHERE id = '{$releted_to}' AND deleted = 0"))
    $parent_type = "Accounts";
else if($db->getOne("SELECT * FROM leads WHERE id = '{$releted_to}' AND deleted = 0"))
    $parent_type = "Leads";
else
    $parent_type = "Contacts";


$call_bean = BeanFactory::newBean("Calls");
$call_bean->name = $name;
$call_bean->phone_c = $_POST['phone'];
$call_bean->parent_type = $parent_type;
$call_bean->created_by = $user_id;
$call_bean->parent_id = $releted_to;
$call_bean->assigned_user_id = $user_id;
$call_bean->direction = $_POST['type'];
$call_bean->status = "Held";
$call_bean->date_start = date('Y-m-d h:i:s', time());
$call_bean->uniq_id_c = $_POST['uniq_id'];
$call_bean->save();

echo $call_bean->id."^|^".$parent_type;

