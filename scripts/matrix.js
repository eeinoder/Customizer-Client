// matrix.js
// Matrix multiplication approximations

function adj(m) { // Compute the adjugate of m
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]
  ];
}

function multmm(a, b) { // multiply two matrices
  var c = Array(9);
  for (var i = 0; i != 3; ++i) {
    for (var j = 0; j != 3; ++j) {
      var cij = 0;
      for (var k = 0; k != 3; ++k) {
        cij += a[3*i + k]*b[3*k + j];
      }
      c[3*i + j] = cij;
    }
  }
  return c;
}

function multmv(m, v) { // multiply matrix and vector
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2]
  ];
}

/*function pdbg(m, v) {
  var r = multmv(m, v);
  return r + " (" + r[0]/r[2] + ", " + r[1]/r[2] + ")";
}*/

function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
  var m = [
    x1, x2, x3,
    y1, y2, y3,
     1,  1,  1
  ];
  var v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2]
  ]);
}

function general2DProjection(
  x1s, y1s, x1d, y1d,
  x2s, y2s, x2d, y2d,
  x3s, y3s, x3d, y3d,
  x4s, y4s, x4d, y4d
) {
  var s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  var d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}

function project(m, x, y) {
  var v = multmv(m, [x, y, 1]);
  return [v[0]/v[2], v[1]/v[2]];
}

function getHomography(s1, d1, s2, d2, s3, d3, s4, d4) {
  var t = general2DProjection
    (s1[0], s1[1], d1[0], d1[1], s2[0], s2[1], d2[0], d2[1],
     s3[0], s3[1], d3[0], d3[1], s4[0], s4[1], d4[0], d4[1]);
  for(i = 0; i != 9; ++i) t[i] = t[i]/t[8];
  return t;
}

function applyHomography(t, s) {
  // Ignore z component, make z=1
  let d = multmv(t, [s[0], s[1], 1]);
  // Dehomogenize coordinate vector
  d = [d[0]/d[2], d[1]/d[2]];
  return d;
}

function transform2d(elt, s1, d1, s2, d2, s3, d3, s4, d4) {
  var t = general2DProjection
    (s1[0], s1[1], d1[0], d1[1], s2[0], s2[1], d2[0], d2[1],
     s3[0], s3[1], d3[0], d3[1], s4[0], s4[1], d4[0], d4[1]);
  for(i = 0; i != 9; ++i) t[i] = t[i]/t[8];
  t3d = [t[0], t[3], 0, t[6],
       t[1], t[4], 0, t[7],
       0   , 0   , 1, 0   ,
       t[2], t[5], 0, t[8]];
  t3d = "matrix3d(" + t3d.join(", ") + ")";
  elt.style["-webkit-transform"] = t3d;
  elt.style["-moz-transform"] = t3d;
  elt.style["-o-transform"] = t3d;
  elt.style.transform = t3d;
}

function update() {
  var box = document.getElementById("box");
  transform2d(box, corners[0], corners[1], corners[2], corners[3],
                   corners[4], corners[5], corners[6], corners[7]);
  for (var i = 0; i != 8; i += 2) {
    var elt = document.getElementById("marker" + i);
    elt.style.left = corners[i] + "px";
    elt.style.top = corners[i + 1] + "px";
  }
}



// Source:
// https://math.stackexchange.com/questions/296794/finding-the-transform-matrix-from-4-projected-points-with-javascript

//
