import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerAppX } from '@electron-forge/maker-appx';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/icon', // Forge picks .ico / .icns / .png per platform.
    extraResource: ['.env', './resources/adb'],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: 'assets/icon.ico',
      // Sign the Setup.exe so Windows shows "NiqueWrld" as the publisher
      // instead of "Unknown Publisher" in the UAC / SmartScreen dialog.
      certificateFile: 'signing/dev-cert.pfx',
      certificatePassword: 'tellic-dev',
    }),
    new MakerAppX({
      // Sideload identity. NOTE: Microsoft Store submission requires the
      // Publisher CN to match the GUID assigned in Partner Center
      // (e.g. 'CN=3C3B9E40-19CE-4CF9-8559-FDED2BE523C2'); swap it back
      // before publishing to the Store.
      publisher: 'CN=NiqueWrld',
      identityName: 'NiqueWrld.Tellic',
      publisherDisplayName: 'NiqueWrld',
      packageDisplayName: 'Tellic',
      packageName: 'NiqueWrld.Tellic',
      packageVersion: '1.0.0.0',
      assets: 'assets/appx',
      manifest: 'assets/appx/AppXManifest.xml',
      // Pre-generated self-signed cert (Subject matches `publisher` above).
      // Kept outside `assets/appx` so the private key is NOT packed into
      // the .appx. Skips the interactive makecert.exe password dialog.
      devCert: 'signing/dev-cert.pfx',
      certPass: 'tellic-dev',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: { icon: 'assets/icon.png' },
    }),
    new MakerDeb({
      options: { icon: 'assets/icon.png' },
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
