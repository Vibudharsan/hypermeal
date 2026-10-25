package app.hipermeal;
import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/** Allowlisted offline assets. Provider requests use a scoped native bridge. */
public final class MainActivity extends Activity {
 private static final String HOST="appassets.androidplatform.net";
 private static final int PICK_FILE=41;
 private static final int CAMERA_PERMISSION=42;
 private PermissionRequest cameraRequest;
 private WebView web;
 private MobileServices services;
 private ValueCallback<Uri[]> fileResult;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  web=new WebView(this);
  web.setBackgroundColor(0xff242424);
  web.setOnApplyWindowInsetsListener((view,insets)->{
   view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets;
  });
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(true);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setSupportMultipleWindows(false);
  settings.setJavaScriptCanOpenWindowsAutomatically(false);
  settings.setMediaPlaybackRequiresUserGesture(false);
  WebView.setWebContentsDebuggingEnabled(false);
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
    Uri uri=request.getUrl();
    if(!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost()))return blocked();
    String path=uri.getPath();
    String file="/".equals(path)?"index.html":path==null?"":path.substring(1);
    String mime;
    switch(file){
     case "index.html":mime="text/html";break;
     case "app.js":case "theme.js":case "offline.js":case "online.js":mime="application/javascript";break;
     case "style.css":case "theme.css":mime="text/css";break;
     default:return blocked();
    }
    try{
     Map<String,String> headers=new HashMap<>();
     headers.put("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'");
     headers.put("Cache-Control","no-store");
     headers.put("X-Content-Type-Options","nosniff");
     return new WebResourceResponse(mime,"utf-8",200,"OK",headers,getAssets().open(file));
    }catch(IOException e){return blocked();}
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();
    if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost()))return false;
    if(request.isForMainFrame()&&("https".equals(uri.getScheme())||"http".equals(uri.getScheme()))){
     try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}
     catch(ActivityNotFoundException e){Toast.makeText(MainActivity.this,"No browser available",Toast.LENGTH_SHORT).show();}
    }
    return true;
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   /** Only the bundled page may use the camera, and only after Android grants the permission. */
   @Override public void onPermissionRequest(PermissionRequest request){
    Uri origin=request.getOrigin();
    boolean video=false;
    for(String resource:request.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))video=true;
    if(!video||origin==null||!HOST.equals(origin.getHost())){request.deny();return;}
    if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});return;}
    if(cameraRequest!=null)cameraRequest.deny();
    cameraRequest=request;
    requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_PERMISSION);
   }
   @Override public void onPermissionRequestCanceled(PermissionRequest request){if(request==cameraRequest)cameraRequest=null;}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> result,FileChooserParams params){
    if(fileResult!=null)fileResult.onReceiveValue(null);
    fileResult=result;
    Intent intent=new Intent(Intent.ACTION_GET_CONTENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    String[] accept=params.getAcceptTypes();
    boolean images=accept!=null&&accept.length>0&&accept[0].startsWith("image/");
    intent.setType(images?"image/*":"*/*");
    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,false);
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    try{startActivityForResult(Intent.createChooser(intent,images?"Choose meal photo":"Choose activity CSV"),PICK_FILE);}
    catch(ActivityNotFoundException e){fileResult.onReceiveValue(null);fileResult=null;return false;}
    return true;
   }
  });
  services=new MobileServices(this,web);
  web.addJavascriptInterface(services,"HyperMealNative");
  setContentView(web);
  web.loadUrl("https://"+HOST+"/");
 }
 private WebResourceResponse blocked(){
  return new WebResourceResponse("text/plain","utf-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream("Not available".getBytes()));
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==PICK_FILE&&fileResult!=null){
   Uri selected=result==RESULT_OK&&data!=null?data.getData():null;
   fileResult.onReceiveValue(selected==null?null:new Uri[]{selected});fileResult=null;
  }
 }
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){
  super.onRequestPermissionsResult(request,permissions,results);
  if(request!=CAMERA_PERMISSION||cameraRequest==null)return;
  if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)cameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
  else cameraRequest.deny();
  cameraRequest=null;
 }
 @Override public void onBackPressed(){
  web.evaluateJavascript("(function(){var open=document.querySelector('dialog[open]');if(open){open.close();return true}if(typeof state!=='undefined'&&state.page!=='today'){navigate('today');return true}return false})()",value->{if(!"true".equals(value))finish();});
 }
 @Override protected void onDestroy(){
  if(fileResult!=null)fileResult.onReceiveValue(null);
  if(cameraRequest!=null)cameraRequest.deny();
  if(services!=null)services.close();
  if(web!=null)web.destroy();
  super.onDestroy();
 }
}
