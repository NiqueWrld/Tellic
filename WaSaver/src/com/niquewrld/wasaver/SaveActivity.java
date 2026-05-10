package com.niquewrld.wasaver;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class SaveActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Intent intent = getIntent();
            if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
                Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (fileUri == null) {
                    // Fallback: text was sent directly
                    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (text != null) {
                        saveText(text);
                    }
                } else {
                    saveUri(fileUri);
                }
            }
        } catch (Exception e) {
            // Swallow — we must always finish
        }

        finish();
    }

    private void saveUri(Uri uri) throws Exception {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dest = new File("/sdcard/Download/wa_export_" + ts + ".txt");

        try (InputStream in = getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        }
    }

    private void saveText(String text) throws Exception {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dest = new File("/sdcard/Download/wa_export_" + ts + ".txt");
        try (FileOutputStream out = new FileOutputStream(dest)) {
            out.write(text.getBytes("UTF-8"));
        }
    }
}
