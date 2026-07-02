/* ============================================================================
 * Big Dipper in Three Dimensions  --  HTML5 port of the Flash (AS1) simulator.
 *
 * Behaviour is a faithful port of the decompiled ActionScript "CelestialSphere"
 * library and the frame scripts.  Only the code paths this simulator actually
 * exercises are ported (celestial-coordinate objects, sight-lines, grid circles
 * and the shaded sky patch); the horizon-plane, shading disk and screen<->sky
 * hit-testing of the general library are removed exactly as the original frame
 * script removes/disables them.
 *
 * Ground truth for geometry: scripts/3 CS Geometry.as, 7 CS Objects.as,
 * 8 CS Circles.as, 9 CS Lines.as, and the two frame_1/DoAction scripts.
 * Constants and star data are copied verbatim from the source.
 * ==========================================================================*/

'use strict';

/* --- angle helpers (values copied verbatim from the AS source) ----------- */
const DEG2RAD = 0.017453292519943295;   // pi/180
const RAD2DEG = 57.29577951308232;       // 180/pi
const HR2RAD  = 0.2617993877991494;      // pi/12  (15 deg per hour)
const TWO_PI  = 6.283185307179586;

/* --- fixed sim configuration (from frame_1/DoAction_2.as) ---------------- */
const STAGE_W = 650;
const STAGE_H = 480;
const SIZE          = 1000;   // sphere.size   -> _c.r = 500
const LATITUDE      = 35;     // sphere.latitude
const SIDEREAL_TIME = 0;      // default
const SPHERE_UNIT_RADIUS = 250;

const INIT_THETA = 221.2;     // setSphereOrientation(221.2, -8.6)
const INIT_PHI   = -8.6;

/* drag clamps (from the dragArea handler) */
const THETA_MIN = 122, THETA_MAX = 247;
const PHI_MIN   = -36,  PHI_MAX   = 36;

/* centre point that is pinned to screen (325,240) each frame */
const CENTER_POINT = { ra: 12.5, dec: 55, r: 0.5 };
const PIN_X = 325, PIN_Y = 240;

/* the seven stars, verbatim from bigDipperStars[] (distances in light years) */
const BIG_DIPPER_STARS = [
  { name: 'Dubhe',  dec: 61.75092, ra: 11.06215, dist: 123.6, err: 2.5 },
  { name: 'Merak',  dec: 56.38236, ra: 11.03068, dist:  79.4, err: 1.2 },
  { name: 'Phecda', dec: 53.69475, ra: 11.89717, dist:  83.7, err: 1.5 },
  { name: 'Megrez', dec: 57.03258, ra: 12.25709, dist:  81.4, err: 1.2 },
  { name: 'Alioth', dec: 55.95989, ra: 12.90048, dist:  80.9, err: 1.2 },
  { name: 'Mizar',  dec: 54.92539, ra: 13.39875, dist:  78.2, err: 1.1 },
  { name: 'Alkaid', dec: 49.31336, ra: 13.79235, dist: 100.7, err: 2.3 }
];

/* colours (AS decimal RGB) mapped to CSS */
const PATCH_FILL = 'rgba(109,137,188,0.60)'; // beginFill(7179196, 60) -> #6D89BC @60%
const GRID_COLOR = '#e0e0e0';                // 14737632 -> #E0E0E0, alpha 100
const LINE_COLOR = 'rgba(0,0,0,0.15)';       // color 0, alpha 15
const GRID_ALPHA = 1.0;

/* ==========================================================================
 * Sphere: coordinate transforms (ported verbatim from CS Geometry.as / doA /
 * doM / doB).  Everything is expressed in the original Flash stage-pixel scale
 * (radius _c.r = 500), so ported math is bit-for-bit comparable to the source.
 * ========================================================================*/
class Sphere {
  constructor() {
    this._c = {};
    this._c.r = SIZE / 2;                 // 500
    this._c.r2 = this._c.r * this._c.r;
    this._theta = 0; this._phi = 0;
    this._lat = LATITUDE * DEG2RAD;
    this._sTime = ((SIDEREAL_TIME % 24) + 24) % 24 * HR2RAD;
    this._showUnder = true;
    this._aVer = 0; this._bVer = 0;
    this.doM();
    this.setThetaAndPhi(INIT_THETA, INIT_PHI);
  }

  mod(n, m) { return ((n % m) + m) % m; }

  setThetaAndPhi(newTheta, newPhi) {
    this._theta = DEG2RAD * (((newTheta % 360) + 360) % 360);
    if (newPhi > 90) newPhi = 90; else if (newPhi < -90) newPhi = -90;
    this._phi = newPhi * DEG2RAD;
    this.doA();
    this.doB();
  }

  doA() {
    const c = this._c, r = c.r;
    const ct = Math.cos(this._theta), st = Math.sin(this._theta);
    const cp = Math.cos(this._phi),   sp = Math.sin(this._phi);
    c.a0 = -r * st;      c.a1 = r * ct;
    c.a3 = r * ct * sp;  c.a4 = r * st * sp;  c.a5 = -r * cp;
    c.a6 = r * ct * cp;  c.a7 = r * st * cp;  c.a8 = r * sp;
    this._aVer++;
  }

  doM() {
    const c = this._c;
    c.m2 = Math.cos(this._lat);
    c.m3 = Math.sin(this._sTime);
    c.m4 = -Math.cos(this._sTime);
    c.m8 = Math.sin(this._lat);
    c.m0 = c.m4 * c.m8;
    c.m1 = -c.m3 * c.m8;
    c.m6 = -c.m2 * c.m4;
    c.m7 = c.m2 * c.m3;
  }

  doB() {
    const c = this._c;
    c.b0 = c.a0 * c.m0 + c.a1 * c.m3;
    c.b1 = c.a0 * c.m1 + c.a1 * c.m4;
    c.b2 = c.a0 * c.m2;
    c.b3 = c.a3 * c.m0 + c.a4 * c.m3 + c.a5 * c.m6;
    c.b4 = c.a3 * c.m1 + c.a4 * c.m4 + c.a5 * c.m7;
    c.b5 = c.a3 * c.m2 + c.a5 * c.m8;
    c.b6 = c.a6 * c.m0 + c.a7 * c.m3 + c.a8 * c.m6;
    c.b7 = c.a6 * c.m1 + c.a7 * c.m4 + c.a8 * c.m7;
    c.b8 = c.a6 * c.m2 + c.a8 * c.m8;
    this._bVer++;
  }

  parsePointInput(p1) {
    const p2 = {};
    if (p1.ra !== undefined && p1.dec !== undefined) {
      p2.sys = 1;
      const r = (p1.r !== undefined) ? p1.r : 1;
      const d = r * Math.cos(p1.dec * DEG2RAD);
      p2.x = d * Math.cos(p1.ra * HR2RAD);
      p2.y = d * Math.sin(p1.ra * HR2RAD);
      p2.z = r * Math.sin(p1.dec * DEG2RAD);
      p2.r = Math.abs(r);
    } else if (p1.x !== undefined && p1.y !== undefined && p1.z !== undefined) {
      p2.sys = (p1.system === 'celestial') ? 1 : (p1.system === 'horizon' ? 0 : -1);
      p2.x = p1.x; p2.y = p1.y; p2.z = p1.z;
      p2.r = Math.sqrt(p2.x * p2.x + p2.y * p2.y + p2.z * p2.z);
      if (p2.r < 1.000001 && p2.r > 0.999999) p2.r = 1;
    } else {
      p2.sys = null;
    }
    return p2;
  }

  /* screen projections (offsets from the sphere origin) */
  CtoS(p)  { const c = this._c; return { x: p.x*c.b0 + p.y*c.b1 + p.z*c.b2,
                                         y: p.x*c.b3 + p.y*c.b4 + p.z*c.b5 }; }
  CtoSz(p) { const c = this._c; return { x: p.x*c.b0 + p.y*c.b1 + p.z*c.b2,
                                         y: p.x*c.b3 + p.y*c.b4 + p.z*c.b5,
                                         z: p.x*c.b6 + p.y*c.b7 + p.z*c.b8 }; }
  WtoSz(p) { const c = this._c; return { x: p.x*c.a0 + p.y*c.a1,
                                         y: p.x*c.a3 + p.y*c.a4 + p.z*c.a5,
                                         z: p.x*c.a6 + p.y*c.a7 + p.z*c.a8 }; }
  CtoW(p)  { const c = this._c; return { x: p.x*c.m0 + p.y*c.m1 + p.z*c.m2,
                                         y: p.x*c.m3 + p.y*c.m4,
                                         z: p.x*c.m6 + p.y*c.m7 + p.z*c.m8 }; }
}

/* ==========================================================================
 * Circle: a small circle / arc on the sphere.  Port of CSCirclesClass:
 * setParameters -> doW (w-matrix), and update() -> front/back arc split.
 * update() returns { front:[arcs], back:[arcs] } where each arc is an array of
 * screen points ready for a moveTo + quadraticCurveTo tessellation identical to
 * the AS drawArc (minStep = pi/4).
 * ========================================================================*/
const CIRCLE_MIN_STEP = 0.7853981633974483; // pi/4

class Circle {
  constructor(sphere, style, def) {
    this.s = sphere;
    this._c = {};
    this._gS = 0; this._gE = 0; this._beta = 0; this._tilt = 0; this._lambda = 0;
    this._sys = 1;
    this._color = GRID_COLOR; this._thick = 1; this._alpha = 1;
    if (style) { this._thick = style.thickness; this._alpha = style.alpha / 100; this._colorRaw = style.color; }
    if (def) this.setParameters(def);
  }

  mod(n, m) { return ((n % m) + m) % m; }

  setParameters(arg) {
    // celestial branch only (all circles in this sim are ra/dec/tilt)
    this._sys = 1;
    if (isFinite(arg.tilt)) {
      if (arg.tilt < 0) this._tilt = 0;
      else if (arg.tilt > 180) this._tilt = Math.PI;
      else this._tilt = arg.tilt * DEG2RAD;
    }
    if (isFinite(arg.dec)) {
      if (arg.dec < -90) this._lambda = -Math.PI;
      else if (arg.dec > 90) this._lambda = Math.PI;
      else this._lambda = arg.dec * DEG2RAD;
    }
    if (isFinite(arg.ra))         this._beta = HR2RAD * this.mod(arg.ra, 24);
    if (isFinite(arg.gammaStart)) this._gS   = DEG2RAD * this.mod(arg.gammaStart, 360);
    if (isFinite(arg.gammaEnd))   this._gE   = DEG2RAD * this.mod(arg.gammaEnd, 360);
    this.doW();
  }

  doW() {
    const st = Math.sin(this._tilt), ct = Math.cos(this._tilt);
    const sb = Math.sin(this._beta), cb = Math.cos(this._beta);
    const cl = Math.cos(this._lambda), sl = Math.sin(this._lambda);
    const c = this._c;
    c.w0 = cl * cb;         c.w1 = -cl * sb * ct;   c.w2 = sl * sb * st;
    c.w3 = cl * sb;         c.w4 = cl * cb * ct;    c.w5 = -sl * cb * st;
    c.w7 = cl * st;         c.w8 = sl * ct;
  }

  /* concatenate parent b-matrix with the circle w-matrix -> v0..v8 (sys==1) */
  computeV() {
    const tc = this._c, pc = this.s._c;
    tc.v0 = pc.b0 * tc.w0 + pc.b1 * tc.w3;
    tc.v1 = pc.b0 * tc.w1 + pc.b1 * tc.w4 + pc.b2 * tc.w7;
    tc.v2 = pc.b0 * tc.w2 + pc.b1 * tc.w5 + pc.b2 * tc.w8;
    tc.v3 = pc.b3 * tc.w0 + pc.b4 * tc.w3;
    tc.v4 = pc.b3 * tc.w1 + pc.b4 * tc.w4 + pc.b5 * tc.w7;
    tc.v5 = pc.b3 * tc.w2 + pc.b4 * tc.w5 + pc.b5 * tc.w8;
    tc.v6 = pc.b6 * tc.w0 + pc.b7 * tc.w3;
    tc.v7 = pc.b6 * tc.w1 + pc.b7 * tc.w4 + pc.b8 * tc.w7;
    tc.v8 = pc.b6 * tc.w2 + pc.b7 * tc.w5 + pc.b8 * tc.w8;
  }

  /* tessellate arc [g1,g2] -> {pts:[{x,y}], ctrl:[{x,y}]} matching AS drawArc */
  _arc(g1, g2) {
    const c = this._c;
    if (g2 < g1) g2 += TWO_PI;
    let arc = g2 - g1;
    if (arc === 0) arc = TWO_PI;
    const n = Math.ceil(arc / CIRCLE_MIN_STEP);
    const step = arc / n, halfStep = step / 2;
    const cRad = 1 / Math.cos(halfStep);
    const out = { start: null, segs: [] };
    let ax = Math.cos(g1), ay = Math.sin(g1);
    out.start = { x: c.v0*ax + c.v1*ay + c.v2, y: c.v3*ax + c.v4*ay + c.v5 };
    let aAngle = g1 + step, cAngle = aAngle - halfStep;
    for (let i = 0; i < n; i++) {
      ax = Math.cos(aAngle); ay = Math.sin(aAngle);
      const cx = cRad * Math.cos(cAngle), cy = cRad * Math.sin(cAngle);
      out.segs.push({
        cx: c.v0*cx + c.v1*cy + c.v2, cy: c.v3*cx + c.v4*cy + c.v5,
        x:  c.v0*ax + c.v1*ay + c.v2, y:  c.v3*ax + c.v4*ay + c.v5
      });
      aAngle += step; cAngle += step;
    }
    return out;
  }

  gSort(a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); }

  /* returns {front:[arc,...], back:[arc,...]} */
  update() {
    this.computeV();
    const c = this._c;
    const v6 = c.v6, v7 = c.v7, v8 = c.v8;
    const front = [], back = [];
    const push = (g1, g2, arr) => arr.push(this._arc(g1, g2));

    const A = Math.sqrt(v6 * v6 + v7 * v7);
    if (A === 0) {
      if (v8 < 0) push(this._gS, this._gE, back); else push(this._gS, this._gE, front);
    } else {
      const sj = -v8 / A;
      if (sj <= -1) {
        push(this._gS, this._gE, front);
      } else if (sj >= 1) {
        push(this._gS, this._gE, back);
      } else {
        const j = Math.asin(sj);
        const t = Math.atan2(v6, v7);
        let gDesc, gAsc;
        if (Math.cos(j) < 0) {
          gDesc = this.mod(j - t, TWO_PI);
          gAsc  = this.mod(Math.PI - j - t, TWO_PI);
        } else {
          gDesc = this.mod(Math.PI - j - t, TWO_PI);
          gAsc  = this.mod(j - t, TWO_PI);
        }
        if (this._gS === this._gE) {
          push(gAsc, gDesc, front);
          push(gDesc, gAsc, back);
        } else {
          const gArray = [[gAsc, 0], [gDesc, 1], [this._gS, 2], [this._gE, 3]];
          gArray.sort(this.gSort);
          // establish initial draw/front state by scanning once (as AS does)
          let draw = false, frontFlag = true;
          for (let s = 0; s < 4; s++) {
            const tag = gArray[s][1];
            if (tag === 0) frontFlag = true;
            else if (tag === 1) frontFlag = false;
            else if (tag === 2) draw = true;
            else draw = false;
          }
          let g2 = gArray[3];
          for (let i = 0; i < 4; i++) {
            const g1 = g2;
            g2 = gArray[i];
            if (draw && g1[0] !== g2[0]) push(g1[0], g2[0], frontFlag ? front : back);
            const tag = g2[1];
            if (tag === 0) frontFlag = true;
            else if (tag === 1) frontFlag = false;
            else if (tag === 2) draw = true;
            else draw = false;
          }
        }
      }
    }
    return { front, back };
  }
}

/* ==========================================================================
 * Line: a straight sight-line in space, clipped against the sphere and split
 * into back-exterior / front-exterior / inner-above / inner-below segments.
 * Port of CSLinesClass.update() (showUnder == true branch).
 * ========================================================================*/
class Line {
  constructor(sphere, head, tail) {
    this.s = sphere;
    this._head = sphere.parsePointInput(head);
    this._tail = sphere.parsePointInput(tail);
    if (this._head.sys === -1) this._head.sys = 0;
    if (this._tail.sys === -1) this._tail.sys = 0;
  }

  /* returns { bE:[], fE:[], aI:[], bI:[] } arrays of {x1,y1,x2,y2} */
  update() {
    const s = this.s;
    const buckets = { bE: [], fE: [], aI: [], bI: [] };
    const head = (this._head.sys === 0) ? s.WtoSz(this._head) : s.CtoSz(this._head);
    const tail = (this._tail.sys === 0) ? s.WtoSz(this._tail) : s.CtoSz(this._tail);

    const mx = head.x - tail.x, my = head.y - tail.y, mz = head.z - tail.z;
    const A = mx*mx + my*my + mz*mz;
    const B = 2 * (mx*tail.x + my*tail.y + mz*tail.z);
    const C = tail.x*tail.x + tail.y*tail.y + tail.z*tail.z;
    const rad = s._c.r, rad2 = rad * rad, phi = s._phi;

    const stmp = [];
    const D = B*B - 4*A*(C - rad2);
    if (D > 0) {
      const sD = Math.sqrt(D);
      stmp.push((-B + sD) / (2*A));
      stmp.push((-B - sD) / (2*A));
    }
    let tp;
    if (phi > -Math.PI/2 && phi < Math.PI/2) {
      tp = Math.tan(phi);
      if (my !== tp*mz) stmp.push((tp*tail.z - tail.y) / (my - tp*mz));
      if (mz !== 0) {
        const tmp = -tail.z / mz;
        if (tmp*(tmp*A + B) + C >= rad2) stmp.push(tmp);
      }
    } else if (mz !== 0) {
      stmp.push(-tail.z / mz);
    }

    const seg = [0, 1];
    for (let i = 0; i < stmp.length; i++) {
      if (stmp[i] > 0 && stmp[i] < 1) {
        let k = 1;
        while (stmp[i] > seg[k]) k++;
        if (stmp[i] !== seg[k]) seg.splice(k, 0, stmp[i]);
      }
    }

    // showUnder == true branch
    for (let i = 0; i < seg.length - 1; i++) {
      const s1 = seg[i], s2 = seg[i + 1];
      const u = s1 + (s2 - s1) / 2;
      const r2 = u * (u*A + B) + C;
      let bucket;
      if (r2 < rad2) {
        if (phi === -Math.PI/2)      bucket = (u*mz + tail.z > 0) ? 'bI' : 'aI';
        else if (phi === Math.PI/2)  bucket = (u*mz + tail.z > 0) ? 'aI' : 'bI';
        else bucket = (u*my + tail.y - (u*mz + tail.z)*tp > 1e-9) ? 'bI' : 'aI';
      } else {
        bucket = (u*mz + tail.z < 0) ? 'bE' : 'fE';
      }
      buckets[bucket].push({
        x1: s1*mx + tail.x, y1: s1*my + tail.y,
        x2: s2*mx + tail.x, y2: s2*my + tail.y
      });
    }
    return buckets;
  }
}

/* ==========================================================================
 * SphereObject: a symbol placed on / inside the sphere (a star dot, a yellow
 * star, a coordinate label, the Earth marker).  Port of CSObjectsClass:
 * setPosition, setOrientationType, and update() (flat / absolute cases).
 * ========================================================================*/
class SphereObject {
  constructor(sphere, kind, position, initObject) {
    this.s = sphere;
    this.kind = kind;              // 'dot' | 'star' | 'label' | 'earth'
    this.init = initObject || {};
    this._o = { x: 0, y: 0, z: 0 };
    this._n = { x: 0, y: 0, z: 0 };
    this._u = { x: 0, y: 0, z: 0 };
    this._oType = 0;
    this.setPosition(position);
  }

  setPosition(arg) {
    const pt = this.s.parsePointInput(arg);
    this._sys = pt.sys;
    this._p = pt;
    this._r = pt.r;
    this._recompOffsets();
  }

  _recompOffsets() {
    const p = this._p;
    this._p_o = { x: p.x + this._o.x, y: p.y + this._o.y, z: p.z + this._o.z };
    this._p_n = { x: p.x + this._n.x, y: p.y + this._n.y, z: p.z + this._n.z };
    this._p_u = { x: p.x + this._u.x, y: p.y + this._u.y, z: p.z + this._u.z };
  }

  /* absolute orientation (the only non-flat type used here) */
  setOrientationAbsolute(normalArg, upArg) {
    this._oType = 2;
    if (typeof normalArg !== 'object' || typeof upArg !== 'object') {
      // auto: normal = radial unit vector, up derived
      const p = this._p;
      const nm = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
      this._n = { x: p.x/nm, y: p.y/nm, z: p.z/nm };
      if (!(this._n.x === 0 && this._n.y === 0)) {
        let u = { x: -this._n.x*this._n.z, y: -this._n.z*this._n.y, z: this._n.x*this._n.x + this._n.y*this._n.y };
        const nu = Math.sqrt(u.x*u.x + u.y*u.y + u.z*u.z);
        this._u = { x: u.x/nu, y: u.y/nu, z: u.z/nu };
      } else {
        this._u = { x: 0, y: 1, z: 0 };
      }
    } else {
      let v1 = this.s.parsePointInput(normalArg);
      let v2 = this.s.parsePointInput(upArg);
      // both are celestial here (sys==1), matching this._sys==1 -> no conversion
      const nm = Math.sqrt(v1.x*v1.x + v1.y*v1.y + v1.z*v1.z);
      this._n = { x: v1.x/nm, y: v1.y/nm, z: v1.z/nm };
      const nx = this._n.x, ny = this._n.y, nz = this._n.z;
      const ax = v2.x, ay = v2.y, az = v2.z;
      const ux = ny*ny*ax - nx*ny*ay - nx*nz*az + nz*nz*ax;
      const uy = nz*nz*ay - ny*nz*az - nx*ny*ax + nx*nx*ay;
      const uz = nx*nx*az - nx*nz*ax - ny*nz*ay + ny*ny*az;
      const un = Math.sqrt(ux*ux + uy*uy + uz*uz);
      this._u = { x: ux/un, y: uy/un, z: uz/un };
    }
    this._recompOffsets();
  }

  /* compute screen placement + (for absolute) rotation/scale used to draw the
     symbol.  Returns { x, y, z, wpz, oType, shellRot, yscale, instRot } */
  compute() {
    const s = this.s, c = s._c;
    const sp = (this._sys === 0) ? s.WtoSz(this._p) : s.CtoSz(this._p);
    // world-z (used for depth banding of inner objects)
    let wpz;
    if (this._sys === 1) wpz = s.CtoW(this._p).z; else wpz = this._p.z;
    const res = { x: sp.x, y: sp.y, z: sp.z, wpz: wpz, oType: this._oType,
                  shellRot: 0, yscale: 1, instRot: 0 };
    if (this._oType === 2) {
      const sp_u = (this._sys === 1) ? s.CtoSz(this._p_u) : s.WtoSz(this._p_u);
      const sp_n = (this._sys === 1) ? s.CtoSz(this._p_n) : s.WtoSz(this._p_n);
      const npz = (this._sys === 1)
        ? (this._n.x*c.b6 + this._n.y*c.b7 + this._n.z*c.b8) / c.r
        : (this._n.x*c.a6 + this._n.y*c.a7 + this._n.z*c.a8) / c.r;
      res.yscale = npz;
      const Ang = Math.atan2(sp_n.y - sp.y, sp_n.x - sp.x) + Math.PI/2;
      res.shellRot = Ang;
      const cA = Math.cos(Ang), sA = Math.sin(Ang);
      const x0 = sp_u.x - sp.x, y0 = sp_u.y - sp.y;
      const x1 = cA*x0 + sA*y0, y1 = -sA*x0 + cA*y0;
      const x2 = x1, y2 = y1 / npz;
      res.instRot = Math.atan2(y2, x2) + Math.PI/2;
    }
    return res;
  }
}

/* ==========================================================================
 * The simulator
 * ========================================================================*/
const Sim = (() => {
  let sphere, canvas, ctx, dpr = 1, renderScale = 1;
  let offX = 0, offY = 0;             // sphere placement (sphere._x/_y)
  let starImg = null, arrowImg = null, imagesReady = false;

  const stars = [];     // { csStar, point } per Big Dipper star
  const labels = [];    // coordinate labels
  const gridCircles = []; // dec/ra grid (visible)
  const patchArcs = [];   // arc1..4 (invisible, used for the sky-patch fill)
  const sightLines = [];
  let earthObj = null;

  let theta = INIT_THETA, phi = INIT_PHI;

  /* ---- build the scene exactly as frame_1/DoAction_2.as does ---- */
  function build() {
    sphere = new Sphere();

    // stars: a black "star point" at the true distance, a yellow "CS Star" on
    // the sphere, and a faint sight-line from Earth (origin) to the sphere.
    for (let i = 0; i < BIG_DIPPER_STARS.length; i++) {
      const d = BIG_DIPPER_STARS[i];
      const r = d.dist / SPHERE_UNIT_RADIUS;
      const point  = new SphereObject(sphere, 'dot',  { ra: d.ra, dec: d.dec, r: r });
      const csStar = new SphereObject(sphere, 'star', { ra: d.ra, dec: d.dec });
      csStar.setOrientationAbsolute();  // "absolute", auto normal/up
      const line = new Line(sphere,
        { x: 0, y: 0, z: 0, system: 'celestial' },
        { ra: d.ra, dec: d.dec, r: 1 });
      stars.push({ data: d, point, csStar, line });
      sightLines.push(line);
    }

    // invisible boundary arcs used only to draw the shaded sky patch
    patchArcs.push(new Circle(sphere, { thickness: 1, color: 0, alpha: 0 },
      { ra: 0,    dec: -64, tilt: 180, gammaStart: 147, gammaEnd: 198 }));
    patchArcs.push(new Circle(sphere, { thickness: 1, color: 0, alpha: 0 },
      { ra: 22.8, dec: 0,   tilt: 90,  gammaStart: 116, gammaEnd: 133 }));
    patchArcs.push(new Circle(sphere, { thickness: 1, color: 0, alpha: 0 },
      { ra: 0,    dec: 47,  tilt: 0,   gammaStart: 162, gammaEnd: 213 }));
    patchArcs.push(new Circle(sphere, { thickness: 1, color: 0, alpha: 0 },
      { ra: 14.2, dec: 0,   tilt: 90,  gammaStart: 47,  gammaEnd: 64 }));

    // visible grid: declination and right-ascension lines
    const gstyle = { thickness: 1, color: 14737632, alpha: 100 };
    gridCircles.push(new Circle(sphere, gstyle, { ra: 0, dec: 50, tilt: 0, gammaStart: 162, gammaEnd: 213 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 0, dec: 55, tilt: 0, gammaStart: 162, gammaEnd: 213 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 0, dec: 60, tilt: 0, gammaStart: 162, gammaEnd: 213 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 14, dec: 0, tilt: 90, gammaStart: 47, gammaEnd: 64 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 13, dec: 0, tilt: 90, gammaStart: 47, gammaEnd: 64 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 12, dec: 0, tilt: 90, gammaStart: 47, gammaEnd: 64 }));
    gridCircles.push(new Circle(sphere, gstyle, { ra: 11, dec: 0, tilt: 90, gammaStart: 47, gammaEnd: 64 }));

    // coordinate labels (absolute orientation, lie flat on the sphere)
    const mkLabel = (text, pos, n, u) => {
      const o = new SphereObject(sphere, 'label', pos, { labelText: text });
      o.setOrientationAbsolute(n, u);
      o.text = text;
      labels.push(o);
    };
    mkLabel('50°', { ra: 10.55, dec: 50 }, { ra: 22.55, dec: -50 }, { ra: 0, dec: 90 });
    mkLabel('55°', { ra: 10.55, dec: 55 }, { ra: 22.55, dec: -55 }, { ra: 0, dec: 90 });
    mkLabel('60°', { ra: 10.55, dec: 60 }, { ra: 22.55, dec: -60 }, { ra: 0, dec: 90 });
    mkLabel('11h', { ra: 11, dec: 65.3 }, { ra: 23, dec: -65.3 }, { ra: 0, dec: 90 });
    mkLabel('12h', { ra: 12, dec: 65.3 }, { ra: 0,  dec: -65.3 }, { ra: 0, dec: 90 });
    mkLabel('13h', { ra: 13, dec: 65.3 }, { ra: 1,  dec: -65.3 }, { ra: 0, dec: 90 });
    mkLabel('14h', { ra: 14, dec: 65.3 }, { ra: 2,  dec: -65.3 }, { ra: 0, dec: 90 });

    // Earth marker at the origin (r = 0)
    earthObj = new SphereObject(sphere, 'earth', { ra: 12.5, dec: 55, r: 0 });
  }

  /* ---- patch fill: port of drawPatch() in frame_1/DoAction.as ---- */
  function fillPatch() {
    // arc coefficients were refreshed by circle.update() during render()
    const arcs = patchArcs;
    ctx.beginPath();
    const c0 = arcs[0]._c;
    let ax = Math.cos(arcs[0]._gS), ay = Math.sin(arcs[0]._gS);
    ctx.moveTo(offX + c0.v0*ax + c0.v1*ay + c0.v2,
               offY + c0.v3*ax + c0.v4*ay + c0.v5);
    for (let k = 0; k < 4; k++) {
      const arc = arcs[k], c = arc._c;
      let g1 = arc._gS, g2 = arc._gE;
      if (g2 < g1) g2 += TWO_PI;
      let a = g2 - g1; if (a === 0) a = TWO_PI;
      const n = Math.ceil(a / CIRCLE_MIN_STEP);
      const step = a / n, halfStep = step / 2, cRad = 1 / Math.cos(halfStep);
      let aAngle = g1 + step, cAngle = aAngle - halfStep;
      for (let i = 0; i < n; i++) {
        const cax = Math.cos(aAngle), cay = Math.sin(aAngle);
        const cx = cRad * Math.cos(cAngle), cy = cRad * Math.sin(cAngle);
        ctx.quadraticCurveTo(
          offX + c.v0*cx + c.v1*cy + c.v2, offY + c.v3*cx + c.v4*cy + c.v5,
          offX + c.v0*cax + c.v1*cay + c.v2, offY + c.v3*cax + c.v4*cay + c.v5);
        aAngle += step; cAngle += step;
      }
    }
    ctx.closePath();
    ctx.fillStyle = PATCH_FILL;
    ctx.fill();
  }

  function strokeArcList(list) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.globalAlpha = GRID_ALPHA;
    ctx.lineWidth = 1;
    for (const arc of list) {
      ctx.beginPath();
      ctx.moveTo(offX + arc.start.x, offY + arc.start.y);
      for (const sgm of arc.segs) {
        ctx.quadraticCurveTo(offX + sgm.cx, offY + sgm.cy, offX + sgm.x, offY + sgm.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function strokeSegs(segs) {
    if (!segs.length) return;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const g of segs) {
      ctx.moveTo(offX + g.x1, offY + g.y1);
      ctx.lineTo(offX + g.x2, offY + g.y2);
    }
    ctx.stroke();
  }

  function drawDot(cx, cy) {
    // star point: 4px black disc (shape 25) reproduced as an identical circle
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(offX + cx, offY + cy, 2, 0, TWO_PI);
    ctx.fill();
  }

  function drawStar(info) {
    // yellow gradient star (assets/star.svg, 20.9 x 20.15, centred on origin)
    if (!starImg) return;
    ctx.save();
    ctx.translate(offX + info.x, offY + info.y);
    ctx.rotate(info.shellRot);
    ctx.scale(1, info.yscale);
    ctx.rotate(info.instRot);
    ctx.drawImage(starImg, -starImg.width / 2, -starImg.height / 2);
    ctx.restore();
  }

  function drawLabel(o, info) {
    ctx.save();
    ctx.translate(offX + info.x, offY + info.y);
    ctx.rotate(info.shellRot);
    ctx.scale(1, info.yscale);
    ctx.rotate(info.instRot);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '13px Verdana, Geneva, "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.text, 0, 0);
    ctx.restore();
  }

  function drawEarth(info) {
    // arrow (assets/earth-arrow.svg) with "Earth's Position" caption below it
    const x = offX + info.x, y = offY + info.y;
    if (arrowImg) ctx.drawImage(arrowImg, x - arrowImg.width / 2, y - arrowImg.height);
    else {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 22);
      ctx.moveTo(x, y - 22); ctx.lineTo(x - 4, y - 14);
      ctx.moveTo(x, y - 22); ctx.lineTo(x + 4, y - 14); ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '12px Verdana, Geneva, "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText("Earth's Position", x, y + 3);
  }

  /* ---- the single render() that redraws everything from state ---- */
  function render() {
    sphere.setThetaAndPhi(theta, phi);

    // pin the centre point to (325,240): sphere._x/_y = 325 - CtoS(center)
    const sp = sphere.CtoS(sphere.parsePointInput(CENTER_POINT));
    offX = PIN_X - sp.x;
    offY = PIN_Y - sp.y;

    // refresh all circle geometry (also fills in v-coeffs used by the patch)
    for (const c of patchArcs) c.update();
    const gridFront = [], gridBack = [];
    for (const c of gridCircles) {
      const r = c.update();
      for (const a of r.front) gridFront.push(a);
      for (const a of r.back)  gridBack.push(a);
    }

    // sight-line segments, bucketed
    const L = { bE: [], fE: [], aI: [], bI: [] };
    for (const ln of sightLines) {
      const b = ln.update();
      L.bE.push(...b.bE); L.fE.push(...b.fE); L.aI.push(...b.aI); L.bI.push(...b.bI);
    }

    // object placement + banding
    const bS = [], fS = [], objAI = [], objBI = [];
    const push = (arr, o, info) => arr.push({ o, info, z: info.z });
    for (const st of stars) {
      const pi = st.point.compute();   // dot, _r < 1 -> inner band by wpz
      (pi.wpz < 0 ? objBI : objAI).push({ o: st.point, info: pi, z: pi.z });
      const si = st.csStar.compute();  // yellow star, _r == 1 -> on-sphere band by z
      (si.z < 0 ? bS : fS).push({ o: st.csStar, info: si, z: si.z });
    }
    for (const lb of labels) {
      const li = lb.compute();
      (li.z < 0 ? bS : fS).push({ o: lb, info: li, z: li.z });
    }
    const ei = earthObj.compute();     // r == 0 -> inner band by wpz
    (ei.wpz < 0 ? objBI : objAI).push({ o: earthObj, info: ei, z: ei.z });

    const byZ = (a, b) => a.z - b.z;
    bS.sort(byZ); fS.sort(byZ); objAI.sort(byZ); objBI.sort(byZ);

    // ---- clear ---- (drawing is in original 650x480 stage coords; the
    //  transform scales those up to the canvas backing resolution)
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // ---- draw back-to-front, matching the AS depth banding ----
    fillPatch();                       // spherePatch, depth -10
    strokeSegs(L.bE);                  // _bEL, 1994
    strokeArcList(gridBack);           // _bC, 1999
    drawObjects(bS);                   // on-sphere back, 2000+

    if (phi < 0) {
      drawObjects(objAI);              // aI objects, 4000+
      strokeSegs(L.aI);                // _iLA, 5998
      drawObjects(objBI);              // bI objects, 6000+
      strokeSegs(L.bI);                // _iLB, 7994
    } else {
      drawObjects(objBI);              // bI objects, 4000+
      strokeSegs(L.bI);                // _iLB, 5998
      drawObjects(objAI);              // aI objects, 6000+
      strokeSegs(L.aI);                // _iLA, 7994
    }

    strokeArcList(gridFront);          // _fC, 7999
    drawObjects(fS);                   // on-sphere front, 8000+
    strokeSegs(L.fE);                  // _fEL, 11999
  }

  function drawObjects(list) {
    for (const item of list) {
      const o = item.o, info = item.info;
      if (o.kind === 'dot')        drawDot(info.x, info.y);
      else if (o.kind === 'star')  drawStar(info);
      else if (o.kind === 'label') drawLabel(o, info);
      else if (o.kind === 'earth') drawEarth(info);
    }
  }

  /* ---- canvas sizing (scale, keep original internal coordinates) ----
     The drawing math always runs in the original 650x480 stage coordinates.
     We set the backing resolution from the DISPLAYED width so the diagram
     stays crisp even when CSS scales it larger than 650px, then draw through
     a matching transform (renderScale). */
  function resizeCanvas() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = Math.round(canvas.getBoundingClientRect().width) || STAGE_W;
    const backingW = Math.max(STAGE_W, Math.round(cssW * dpr));
    renderScale = backingW / STAGE_W;
    canvas.width  = backingW;
    canvas.height = Math.round(STAGE_H * renderScale);
    render();
  }

  /* ---- pointer drag (maps display px back to stage px) ---- */
  let drag = null;
  function stageScale() { return canvas.getBoundingClientRect().width / STAGE_W; }

  function onPointerDown(e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    canvas.focus();                       // clicking the diagram focuses it for keys
    drag = { x: e.clientX, y: e.clientY, theta: theta, phi: phi };
    e.preventDefault();
  }

  /* ---- keyboard control directly on the focused canvas ---- */
  const KEY_STEP = 2;      // degrees per arrow press
  const KEY_BIG  = 10;     // degrees per Page press
  function clampTheta(v) { return v < THETA_MIN ? THETA_MIN : (v > THETA_MAX ? THETA_MAX : v); }
  function clampPhi(v)   { return v < PHI_MIN   ? PHI_MIN   : (v > PHI_MAX   ? PHI_MAX   : v); }

  function onCanvasKey(e) {
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':  theta = clampTheta(theta - KEY_STEP); break;
      case 'ArrowRight': theta = clampTheta(theta + KEY_STEP); break;
      case 'ArrowUp':    phi   = clampPhi(phi + KEY_STEP);     break;
      case 'ArrowDown':  phi   = clampPhi(phi - KEY_STEP);     break;
      case 'PageUp':     phi   = clampPhi(phi + KEY_BIG);      break;
      case 'PageDown':   phi   = clampPhi(phi - KEY_BIG);      break;
      case 'Home':       theta = THETA_MIN;                    break;
      case 'End':        theta = THETA_MAX;                    break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();               // stop the page from scrolling
      syncControls();
      render();
    }
  }
  function onPointerMove(e) {
    if (!drag) return;
    const sc = stageScale() || 1;
    const dX = (e.clientX - drag.x) / sc;     // back to stage pixels
    const dY = (e.clientY - drag.y) / sc;
    const r = SIZE / 2;                        // 500
    let nT = drag.theta + RAD2DEG * (1 / r) * dX;
    nT = ((nT % 360) + 360) % 360;
    if (nT < THETA_MIN) nT = THETA_MIN; else if (nT > THETA_MAX) nT = THETA_MAX;
    let nP = drag.phi - RAD2DEG * (1 / r) * dY;
    if (nP > PHI_MAX) nP = PHI_MAX; else if (nP < PHI_MIN) nP = PHI_MIN;
    theta = nT; phi = nP;
    syncControls();
    render();
  }
  function onPointerUp(e) {
    if (!drag) return;
    drag = null;
    announce();
  }

  /* ---- keyboard sliders ---- */
  let thetaSlider, phiSlider, live, thetaReadout, phiReadout;
  function syncControls() {
    const t = Math.round(theta), p = Math.round(phi);
    thetaSlider.value = t;
    thetaSlider.setAttribute('aria-valuetext', thetaValueText());
    phiSlider.value = p;
    phiSlider.setAttribute('aria-valuetext', phiValueText());
    if (thetaReadout) thetaReadout.textContent = t + '°';
    if (phiReadout) phiReadout.textContent = (p < 0 ? '−' + Math.abs(p) : '' + p) + '°';
  }

  function populateTable() {
    const body = document.getElementById('star-table-body');
    if (!body) return;
    let html = '';
    for (const d of BIG_DIPPER_STARS) {
      html += '<tr><th scope="row">' + d.name + '</th>' +
        '<td>' + d.ra.toFixed(2) + ' h</td>' +
        '<td>' + d.dec.toFixed(2) + '°</td>' +
        '<td>' + d.dist.toFixed(1) + ' ly</td></tr>';
    }
    body.innerHTML = html;
  }
  function thetaValueText() {
    return 'Horizontal viewing angle ' + Math.round(theta) + ' degrees';
  }
  function phiValueText() {
    const v = Math.round(phi);
    const dir = v < 0 ? 'minus ' + Math.abs(v) : v + '';
    return 'Vertical tilt ' + dir + ' degrees' +
      (v > 0 ? ', looking down from above' : v < 0 ? ', looking up from below' : ', edge on');
  }
  function announce() {
    if (!live) return;
    live.textContent =
      'View orientation: horizontal angle ' + Math.round(theta) +
      ' degrees, vertical tilt ' + Math.round(phi) + ' degrees. ' +
      'The seven Big Dipper stars are shown at their true distances from Earth; ' +
      'the yellow stars mark where each projects onto the celestial sphere to form the asterism.';
  }

  function onSlider() {
    theta = parseFloat(thetaSlider.value);
    phi = parseFloat(phiSlider.value);
    // enforce the same clamps as the drag path
    if (theta < THETA_MIN) theta = THETA_MIN; else if (theta > THETA_MAX) theta = THETA_MAX;
    if (phi < PHI_MIN) phi = PHI_MIN; else if (phi > PHI_MAX) phi = PHI_MAX;
    syncControls();
    render();
  }

  function reset() {
    theta = INIT_THETA; phi = INIT_PHI;
    syncControls();
    render();
    announce();
  }

  /* ---- boot ---- */
  function loadImages(done) {
    let n = 2;
    const one = () => { if (--n === 0) { imagesReady = true; done(); } };
    starImg = new Image();  starImg.onload = one;  starImg.onerror = one;
    starImg.src = 'assets/star.svg';
    arrowImg = new Image(); arrowImg.onload = one; arrowImg.onerror = one;
    arrowImg.src = 'assets/earth-arrow.svg';
  }

  let started = false;
  function init() {
    if (started) return;
    started = true;
    canvas = document.getElementById('sky');
    ctx = canvas.getContext('2d');
    thetaSlider = document.getElementById('theta-slider');
    phiSlider   = document.getElementById('phi-slider');
    thetaReadout = document.getElementById('theta-readout');
    phiReadout   = document.getElementById('phi-readout');
    live        = document.getElementById('sr-live');

    build();
    populateTable();
    syncControls();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('keydown', onCanvasKey);
    canvas.addEventListener('keyup', announce);   // announce once, on release
    thetaSlider.addEventListener('input', onSlider);
    phiSlider.addEventListener('input', onSlider);
    thetaSlider.addEventListener('change', announce);
    phiSlider.addEventListener('change', announce);

    document.addEventListener('sim-reset', reset);
    window.addEventListener('resize', resizeCanvas);

    loadImages(() => resizeCanvas());
    resizeCanvas();       // draw immediately (before images finish, code art shows)
    announce();
  }

  return { init };
})();

/* kl-unl.js exposes klunlInitEqn() as a redefinable hook; this sim shows no
   equations, so we redefine it to boot the simulator, and also boot on
   DOMContentLoaded so we are not dependent on a MathJax load (which the
   foundation does not include here).  Sim.init() is guarded against re-entry. */
function klunlInitEqn() { Sim.init(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Sim.init);
} else {
  Sim.init();
}
