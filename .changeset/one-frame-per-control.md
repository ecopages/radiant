---
'@ecopages/radiant-ui': patch
'@ecopages/radiant-themes': patch
---

Make composite fields draw one frame in every theme. Date segments, the combobox and number inputs, and the input inside an input group no longer get their own border or fill in Vercel, macOS, Material, and High Contrast, and the composite wrappers use the same control border as plain inputs. The standalone date input surface now lives in the components layer, so themes and utilities can restyle it; Windows 95 and Mac OS Classic style it like their other fields.
