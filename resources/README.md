# App icon slot

**Spectre:** replace `icon.png` with the real square icon (PNG, 1024×1024, no rounded-corner mask — stores apply that).

`icon.png` in this folder is a placeholder only.

Then generate native icons (Android mipmaps + iOS AppIcon):

```bash
npx @capacitor/assets generate --iconBackgroundColor '#090b0e' --iconBackgroundColorDark '#090b0e' --assetPath resources
```

See [WRAP.md](../WRAP.md).
