// /targeting.js
// Range overlay with cancel support (right-click or programmatic).
import { state } from "./state.js";

let overlayRoot = null;
let cancelHandlers = [];
let active = false;

export function beginTargeting({ range=1, origin, canTarget = () => true, onSelect, onCancel }){
  ensureRoot();
  clearOverlay();
  active = true;

  const cells = computeRange(origin, range);
  for (const cell of cells){
    const div = document.createElement("div");
    div.className = "range-cell";
    positionCell(div, cell.col, cell.row);
    const ok = !!canTarget(cell.col, cell.row);
    if (!ok) div.classList.add("invalid");
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!ok) return;
      clearOverlay();
      active = false;
      removeCancels();
      onSelect?.({ col: cell.col, row: cell.row });
    });
    overlayRoot.appendChild(div);
  }

  // Click outside cells cancels
  const cancelClick = (e) => {
    if (e.target === overlayRoot){
      e.stopPropagation();
      clearOverlay(); active = false; removeCancels(); onCancel?.();
    }
  };
  overlayRoot.addEventListener("click", cancelClick);
  cancelHandlers.push(() => overlayRoot.removeEventListener("click", cancelClick));

  // Right-click anywhere on overlay cancels
  const cancelCtx = (e) => {
    e.preventDefault();
    clearOverlay(); active = false; removeCancels(); onCancel?.();
  };
  overlayRoot.addEventListener("contextmenu", cancelCtx);
  cancelHandlers.push(() => overlayRoot.removeEventListener("contextmenu", cancelCtx));
}

export function cancelTargeting(){
  if (!active) return;
  clearOverlay();
  active = false;
  removeCancels();
}

export function isTargeting(){ return active; }

export function clearOverlay(){
  if (!overlayRoot) return;
  overlayRoot.replaceChildren();
}

function removeCancels(){
  for (const off of cancelHandlers){ try{ off(); }catch{} }
  cancelHandlers = [];
}

function ensureRoot(){
  if (overlayRoot) return;
  const board = document.getElementById("board");
  overlayRoot = document.createElement("div");
  overlayRoot.id = "range-overlay";
  board.appendChild(overlayRoot);
}

function computeRange(origin, r){
  const out = [];
  const max = state.grid?.cells ?? 15;
  for (let dc = -r; dc <= r; dc++){
    for (let dr = -r; dr <= r; dr++){
      const dist = Math.abs(dc) + Math.abs(dr);
      if (dist > r) continue;
      const c = origin.col + dc;
      const rw = origin.row + dr;
      if (c < 1 || rw < 1 || c > max || rw > max) continue;
      out.push({ col:c, row:rw });
    }
  }
  return out;
}

function positionCell(el, col, row){
  el.style.left = `calc(((${col} - 1) * 100%) / var(--grid-cells))`;
  el.style.top  = `calc(((${row} - 1) * 100%) / var(--grid-cells))`;
}
