package com.niquewrld.wasaver;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.content.res.AssetFileDescriptor;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class SaveActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Intent intent = getIntent();
            if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
                Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (fileUri != null && saveUri(fileUri)) {
                    finish();
                    return;
                }

                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (text != null && !text.trim().isEmpty()) {
                    saveText(text);
                }
            }
        } catch (Exception e) {
            // Swallow — we must always finish
        }

        finish();
    }

    private boolean saveUri(Uri uri) throws Exception {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dest = new File("/sdcard/Download/wa_export_" + ts + ".txt");

        // Prefer provider-converted text/plain stream when available.
        try (AssetFileDescriptor afd = getContentResolver().openTypedAssetFileDescriptor(uri, "text/plain", null)) {
            if (afd != null) {
                try (InputStream in = afd.createInputStream();
                     OutputStream out = new FileOutputStream(dest)) {
                    copy(in, out);
                    return true;
                }
            }
        } catch (Exception ignored) {
            // Fall through to raw stream
        }

        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return false;
            byte[] data = readAll(in);
            byte[] normalized = normalizePayload(data);
            try (FileOutputStream out = new FileOutputStream(dest)) {
                out.write(normalized);
            }
            return true;
        }
    }

    private void saveText(String text) throws Exception {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dest = new File("/sdcard/Download/wa_export_" + ts + ".txt");
        try (FileOutputStream out = new FileOutputStream(dest)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        copy(in, bos);
        return bos.toByteArray();
    }

    private static byte[] normalizePayload(byte[] data) {
        byte[] fromZip = tryExtractFirstTxtFromZip(data);
        if (fromZip != null && fromZip.length > 0) {
            return fromZip;
        }
        return data;
    }

    private static byte[] tryExtractFirstTxtFromZip(byte[] data) {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().toLowerCase(Locale.US).endsWith(".txt")) {
                    return readAll(zis);
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
