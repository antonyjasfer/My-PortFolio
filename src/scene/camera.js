import * as THREE from "three";

const clampX = (v) => Math.max(-1.4, Math.min(1.4, v));

/**
 * Orbit rig ported from v1: the world group rotates so that an aimed point
 * faces the camera. Drag sets the velocity, and idle rotation drifts back.
 */
export function createRig(camera, world, { reduced }) {
  const IDLE = reduced ? 0 : 0.0018;
  const s = {
    rotY: 0.4, rotX: 0.12, vY: IDLE, dragging: false,
    shiftX: 0, shiftY: 0, shiftXT: 0, shiftYT: 0,
    baseZ: 24, zoom: 1, zoomT: 1,
  };
  const aim = new THREE.Vector3();
  let aiming = false, k = 0.06;

  /** Aim at a point in world-local space (null to release). Optional rate. */
  function aimAt(p, rate = 0.06) {
    if (!p) { aiming = false; return; }
    aim.copy(p); aiming = true; k = rate;
  }

  function update(dt, snap = false) {
    // per-frame rates from v1, normalised to 60fps so 120Hz screens match
    const fr = Math.min(dt * 60, 6), ease = (k) => (snap ? 1 : 1 - Math.pow(1 - k, fr));
    if (aiming && !s.dragging) {
      const ty = -Math.atan2(aim.x, aim.z), tx = clampX(Math.atan2(aim.y, Math.hypot(aim.x, aim.z)));
      let d = ty - s.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
      const r = ease(k);
      s.rotY += d * r; s.rotX += (tx - s.rotX) * r; s.vY = IDLE;
    } else if (!s.dragging) {
      s.rotY += s.vY * fr;
      if (IDLE) s.vY += (Math.sign(s.vY || 1) * IDLE - s.vY) * ease(0.02); else s.vY *= 1 - ease(0.1);
    }
    const r = ease(0.05);
    s.shiftX += (s.shiftXT - s.shiftX) * r;
    s.shiftY += (s.shiftYT - s.shiftY) * r;
    s.zoom += (s.zoomT - s.zoom) * r;
    camera.position.z = s.baseZ * s.zoom;
    world.rotation.set(s.rotX, s.rotY, 0);
    // shift is applied after rotation, so the composition offset is in screen space
    world.position.set(s.shiftX, s.shiftY, 0);
  }

  function drag(dx, dy) {
    s.vY = dx * 0.0045; s.rotY += s.vY; s.rotX = clampX(s.rotX + dy * 0.003);
  }
  function release() { if (IDLE && Math.abs(s.vY) < IDLE) s.vY = IDLE; }

  /** true when shift, zoom or an aim is still converging (idle drift does not count) */
  function busy() {
    if (Math.abs(s.shiftXT - s.shiftX) > 1e-3 || Math.abs(s.shiftYT - s.shiftY) > 1e-3 || Math.abs(s.zoomT - s.zoom) > 1e-3) return true;
    if (!aiming) return false;
    const ty = -Math.atan2(aim.x, aim.z), tx = clampX(Math.atan2(aim.y, Math.hypot(aim.x, aim.z)));
    let d = ty - s.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.abs(d) > 2e-3 || Math.abs(tx - s.rotX) > 2e-3;
  }

  /** true when the rig is still moving towards its targets */
  function settling() {
    return Math.abs(s.shiftXT - s.shiftX) > 1e-3 || Math.abs(s.shiftYT - s.shiftY) > 1e-3 ||
      Math.abs(s.zoomT - s.zoom) > 1e-3 || aiming || Math.abs(s.vY) > 1e-5;
  }

  return { state: s, aimAt, update, drag, release, settling, busy };
}
