$ErrorActionPreference='Stop'
$adb='D:\SIH\tools\android-sdk\platform-tools\adb.exe'
$emulator='D:\SIH\tools\android-sdk\emulator\emulator.exe'
$serial='emulator-5580'
$devices=& $adb devices
if(-not ($devices -match $serial)){
    Start-Process -FilePath $emulator -ArgumentList '-avd','Smriti_API_36','-read-only','-no-snapshot','-no-audio','-no-boot-anim','-port','5580' -WindowStyle Normal
}
Write-Host 'Opening Android preview...'
for($attempt=0;$attempt -lt 60;$attempt++){
    $boot=& $adb -s $serial shell getprop sys.boot_completed 2>$null
    if($boot -match '1'){
        & $adb -s $serial install -r "$PSScriptRoot\releases\HyperMeal.apk"
        if($LASTEXITCODE -ne 0){throw 'APK installation failed.'}
        & $adb -s $serial shell am start -W -n app.hipermeal/.MainActivity
        Write-Host 'HyperMeal is open in the Android Emulator window.'
        exit
    }
    Start-Sleep -Seconds 2
}
throw 'Android did not finish starting. Close the emulator and try again.'
