package com.rizhnus.subtitle;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Message;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/** Popup is isolated from the Capacitor bridge; WebViewTransport preserves window.opener. */
public final class AuthChromeClient extends BridgeWebChromeClient {
    private final MainActivity activity;
    private Dialog dialog;
    AuthChromeClient(Bridge bridge, MainActivity activity) { super(bridge); this.activity = activity; }

    @SuppressLint("SetJavaScriptEnabled")
    @Override public boolean onCreateWindow(WebView source, boolean isDialog, boolean userGesture, Message message) {
        if (source != activity.getBridge().getWebView() || !userGesture || dialog != null || !(message.obj instanceof WebView.WebViewTransport)) return false;
        WebView popup = new WebView(activity);
        popup.getSettings().setJavaScriptEnabled(true);
        popup.getSettings().setDomStorageEnabled(true);
        popup.getSettings().setAllowFileAccess(false);
        popup.getSettings().setAllowContentAccess(false);
        popup.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        Dialog window = new Dialog(activity, android.R.style.Theme_Material_Light_NoActionBar_Fullscreen);
        dialog = window;
        LinearLayout layout = new LinearLayout(activity); layout.setOrientation(LinearLayout.VERTICAL);
        TextView address = new TextView(activity); address.setTextSize(14); address.setPadding(16,12,16,12);
        layout.addView(address); layout.addView(popup, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        TextView close = new TextView(activity); close.setText("داخستن ✕"); close.setPadding(20,16,20,16); close.setOnClickListener(v -> window.dismiss()); layout.addView(close);
        window.setContentView(layout);
        window.setOnDismissListener(d -> {dialog = null; popup.stopLoading(); popup.destroy();});
        popup.setWebViewClient(new WebViewClient() {
            private boolean firstNavigation = true;
            private boolean allowed(Uri u) {
                String h=u.getHost();
                return "https".equalsIgnoreCase(u.getScheme()) && h != null && !h.equalsIgnoreCase("localhost") && !h.endsWith(".localhost") && !h.matches("[0-9.]+") && !h.contains(":");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !allowed(request.getUrl()); }
            @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                Uri uri=Uri.parse(url);
                if (!"about:blank".equals(url)) {
                    if (!allowed(uri) || (firstNavigation && !"puter.com".equalsIgnoreCase(uri.getHost()))) {view.stopLoading(); window.dismiss();return;}
                    firstNavigation = false;
                }
                address.setText(uri.getHost()==null?"Puter":uri.getHost());
            }
        });
        popup.setWebChromeClient(new WebChromeClient() { @Override public void onCloseWindow(WebView view) { window.dismiss(); } });
        window.show();
        ((WebView.WebViewTransport) message.obj).setWebView(popup); message.sendToTarget();
        return true;
    }
}
