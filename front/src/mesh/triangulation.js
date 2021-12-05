import faceTriang from './triangulation_data_new.js'
import uv_coords from './uv_coords.js'

/* Update mesh */
function intersect(a,b,c,d,p,q,r,s) {
    var det, gamma, lambda 
    det = (c - a) * (s - q) - (r - p) * (d - b) 
    if (det === 0) {
      return false 
    } else {
      lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det 
      gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det 
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1) 
    }
  } 
  
  const crs = [
    [33, 133],
    [362, 263],
    [78, 308],
    [95, 191],
    [324, 415]
  ]
  
  const faceTriangulation = faceTriang.filter((tri) => {
    const [ax, ay] = uv_coords[tri[0]]
    const [bx, by] = uv_coords[tri[1]]
    const [cx, cy] = uv_coords[tri[2]]
  
    var intersects = false
  
    crs.forEach(c => {
     const [c1x, c1y] = uv_coords[c[0]]
     const [c2x, c2y] = uv_coords[c[1]]
     const isInters = intersect(ax, ay, bx, by, c1x, c1y, c2x, c2y) ||
        intersect(ax, ay, cx, cy, c1x, c1y, c2x, c2y) ||
        intersect(bx, by, cx, cy, c1x, c1y, c2x, c2y)
        if(isInters) intersects = true
    })
  
    return !intersects
  })
  