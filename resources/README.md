# App icon slot

`icon.png` is Spectre’s store icon (same bytes as `store/icon-1024.png`, ~1.2MB). Do not replace it with the old 7KB placeholder script.

To restamp Android mipmaps and the iOS App Icon:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#090b0e' --iconBackgroundColorDark '#090b0e' --assetPath resources
```

See [WRAP.md](../WRAP.md).
