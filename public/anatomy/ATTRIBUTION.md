# UPRIGHT anatomy assets

Models derived from Z-Anatomy, by Gauthier Kervyn, Lluís Vinent and contributors, based on BodyParts3D, © The Database Center for Life Science (DBCLS).
https://github.com/LluisV/Z-Anatomy
https://lifesciencedb.jp/bp3d/

Source GLB adaptations by pernelluvsya / atlas-proto, commit 236f3a183108bcccc1f95fda1558be19d7486d00.
https://github.com/pernelluvsya/atlas-proto
https://github.com/pernelluvsya/atlas-proto/blob/236f3a183108bcccc1f95fda1558be19d7486d00/ATTRIBUTION.md

These two derived GLB assets are licensed under Creative Commons Attribution-ShareAlike 4.0 International.
https://creativecommons.org/licenses/by-sa/4.0/
The original BodyParts3D attribution also identifies CC BY-SA 2.1 Japan.
https://creativecommons.org/licenses/by-sa/2.1/jp/

UPRIGHT modifications: selected muscle meshes and selected heart, lung, digestive, brain and eye structures; reduced polygon counts; merged systems into two models; added names and UPRIGHT body-zone metadata; applied runtime colors. No kidney or reproductive assets were included. Mesh metadata retains the source English terminology. The viewer shows localized anatomical regions. The models are illustrative references; health assessments are calculated at the existing UPRIGHT zone level.

The CC BY-SA license applies to the anatomy model assets and their derivatives. The application's existing code license continues to apply to application code.

## Translucent body surface

The male skin mesh (`skin.glb`) comes from [Anatomy Explorer by ArianArsenal](https://github.com/ArianArsenal/anatomy-explorer/blob/8375d6ce7fec36e677c0eda66cae829ba55a4717/public/models/skin.glb), also derived from Z-Anatomy and BodyParts3D. The source and this derivative are distributed under CC BY-SA 4.0. UPRIGHT reduced the polygon count, recompressed the mesh, and applies translucent shading in the viewer.

## Female 3D anatomy (`skin-female.glb`, `muscles-female.glb`, `organs-female.glb`)

The female translucent body surface (`skin-female.glb`) is derived from the **HuBMAP Human Reference Atlas 3D Reference Object Library** (Visible Human Female dataset, U.S. National Library of Medicine, CC BY 4.0, https://humanatlas.io/3d-reference-library) and Z-Anatomy hand surfaces via [Human Anatomy Explorer by waldekmastykarz](https://github.com/waldekmastykarz/anatomy). The female muscle (`muscles-female.glb`) and organ (`organs-female.glb`) layers are derived from Z-Anatomy / BodyParts3D structures non-rigidly fitted (thin-plate spline) to the Visible Human Female body frame and distributed under CC BY-SA 4.0. UPRIGHT welded and simplified the female skin surface, mapped the 340 female muscle meshes and 97 female organ meshes (`eyes`, `brain`, `heart`, `lungs`, `gut`) to UPRIGHT body-zone metadata, excluded intimate/reproductive structures to match the male zone contract, and compressed the assets with Meshopt (`EXT_meshopt_compression` and `KHR_mesh_quantization`).
