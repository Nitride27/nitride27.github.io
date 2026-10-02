# Portfolio

Samridha Shrestha's portfolio: samridhashrestha.com.np

Planet, Milky Way and nebula textures are pre-baked. After editing the painters in `tools/bake-textures.mjs`, regenerate them with:

```
node tools/bake-textures.mjs            # all (~2.5 min, needs ImageMagick with WebP)
ONLY=sky,gas node tools/bake-textures.mjs
```
