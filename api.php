<?php
header("Content-Type: text/plain");

header("Cache-Control: no-cache, must-revalidate");

$current_time = date("h:i:s A");
$secret_message = "Success! Connected to Strato PHP backend.";

echo $secret_message . " The server time is " . $current_time;
?>