# Portfolio

Samridha Shrestha's portfolio: samridhashrestha.com.np

Planet, Milky Way and nebula textures are pre-baked. After editing the painters in `tools/bake-textures.mjs`, regenerate them with:

```
node tools/bake-textures.mjs            # all (~2.5 min, needs ImageMagick with WebP)
ONLY=sky,gas node tools/bake-textures.mjs
```

## Deploying

GitHub Pages lets browsers cache CSS and JS for 10 minutes, so pages reference them with a `?v=` tag. Bump it in every page when those files change:

```
V=$(date +%Y%m%d%H%M); sed -i -E "s#\?v=[0-9a-z]+\"#?v=$V\"#g" *.html
```
