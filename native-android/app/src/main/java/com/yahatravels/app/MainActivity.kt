package com.yahatravels.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.view.View
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private val appUrl = "https://ayazjnp8874-maker.github.io/yaha-tour-and-travels-v8/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = FrameLayout(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal)
        webView = WebView(this)
        layout.addView(webView, FrameLayout.LayoutParams(-1, -1))
        layout.addView(progress, FrameLayout.LayoutParams(-1, 8))
        setContentView(layout)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.javaScriptCanOpenWindowsAutomatically = true
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                val scheme = url.scheme ?: ""
                val host = url.host ?: ""
                if (scheme == "http" || scheme == "https") {
                    if (host == "wa.me" || host == "api.whatsapp.com" ||
                        host == "www.whatsapp.com") {
                        val intent = Intent(Intent.ACTION_VIEW, url)
                        try {
                            startActivity(intent)
                        } catch (_: Exception) {
                            Toast.makeText(this@MainActivity, "WhatsApp install ya update karein.", Toast.LENGTH_LONG).show()
                        }
                        true
                    } else {
                        false
                    }
                } else if (scheme == "tel" || scheme == "mailto") {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: Exception) {
                        Toast.makeText(this@MainActivity, "Is action ke liye app available nahi hai.", Toast.LENGTH_LONG).show()
                    }
                    true
                } else {
                    false
                }
            }
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: android.webkit.WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@MainActivity, "Internet check karke dobara kholen.", Toast.LENGTH_LONG).show()
                }
            }
        }
        if (savedInstanceState == null) webView.loadUrl(appUrl)
        else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
