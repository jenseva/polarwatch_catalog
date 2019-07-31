<?php
 
//echo $_POST['time'];
putenv("LD_LIBRARY_PATH=/usr/local/miniconda3/lib");

$command = '/usr/local/miniconda3/bin/python /var/www/html/polarwatch/'.$_POST['catalog_v'].'/preview.py' 
	. ' ' . $_POST['catalog_v']
    . ' ' . $_POST['projection'] 
    . ' ' . $_POST['ds_id']  
    . ' ' . $_POST['entryId']  
    . ' ' . $_POST['parameter']
    . ' ' . $_POST['time'] 
    . ' ' . $_POST['tab'] 
    . ' ' . $_POST['colorBar'] 
    . ' ' . $_POST['cache_date'] 
    . ' ' . $_POST['mask_vals'] 
    .'  2>&1; echo $?';
    
echo $command;

$output = shell_exec($command);

echo $output;

?>