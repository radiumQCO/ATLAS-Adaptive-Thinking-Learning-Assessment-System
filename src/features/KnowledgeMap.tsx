import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Expand,
  Map as MapIcon,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { mutate, playFeedback, selectTopic, toast, useAtlas } from '../app/store';
import { CELL, placement } from '../lib/map';
import { uid, type Country, type MapNode, type Snapshot } from '../lib/model';
import {
  Button,
  Empty,
  IconButton,
  MasterySquare,
  Modal,
  PageHeader,
  Select,
} from '../components/ui';
type View = { x: number; y: number; scale: number };
type Pending = { topicId: string; x: number; y: number; countries: string[] };
type Drag = {
  type: 'pan' | 'node';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  vx: number;
  vy: number;
  offsetX: number;
  offsetY: number;
  node?: MapNode;
  moved: boolean;
};
let savedView: View | null = null;
export function KnowledgeMap() {
  const { data } = useAtlas(),
    d = data!;
  const canvas = useRef<HTMLCanvasElement>(null),
    wrap = useRef<HTMLDivElement>(null),
    dataRef = useRef(d),
    view = useRef<View>(savedView ?? { x: 110, y: 175, scale: 1 }),
    drag = useRef<Drag | null>(null),
    frame = useRef(0),
    size = useRef({ w: 0, h: 0 }),
    selectedRef = useRef<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef<{ distance: number; midX: number; midY: number; view: View } | null>(null);
  const [selected, setSelected] = useState<string | null>(null),
    [adding, setAdding] = useState(false),
    [pending, setPending] = useState<Pending | null>(null),
    [editCountry, setEditCountry] = useState<Country | null>(null),
    [zoom, setZoom] = useState(view.current.scale),
    [search, setSearch] = useState(''),
    [territories, setTerritories] = useState(false);
  dataRef.current = d;
  selectedRef.current = selected;
  const selectedNode = d.nodes.find((n) => n.topicId === selected),
    topic = d.topics.find((t) => t.id === selected);
  function redraw() {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const { w, h } = size.current,
      v = view.current,
      doc = dataRef.current,
      dark = document.documentElement.dataset.theme === 'dark',
      ink = dark ? '#e4ded1' : '#383a33',
      paper = dark ? '#20221e' : '#f7f5ee';
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    if (doc.settings.grid) {
      const step = (CELL / 4) * v.scale;
      ctx.strokeStyle = dark
        ? `rgba(215,214,194,${0.025 + doc.settings.gridIntensity * 0.07})`
        : `rgba(92,96,73,${0.03 + doc.settings.gridIntensity * 0.09})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = ((v.x % step) + step) % step; x < w; x += step) {
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, h);
      }
      for (let y = ((v.y % step) + step) % step; y < h; y += step) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(w, Math.floor(y) + 0.5);
      }
      ctx.stroke();
    }
    ctx.translate(v.x, v.y);
    ctx.scale(v.scale, v.scale);
    const countries = new Map(doc.countries.map((c) => [c.id, c])),
      topics = new Map(doc.topics.map((t) => [t.id, t])),
      occupancy = new Map(doc.nodes.map((n) => [`${n.x},${n.y}`, n.countryId]));
    const visible = doc.nodes.filter(
      (n) =>
        (n.x + 1) * CELL * v.scale + v.x > -100 &&
        n.x * CELL * v.scale + v.x < w + 100 &&
        (n.y + 1) * CELL * v.scale + v.y > -100 &&
        n.y * CELL * v.scale + v.y < h + 100,
    );
    for (const n of visible) {
      const country = countries.get(n.countryId ?? ''),
        x = n.x * CELL,
        y = n.y * CELL;
      if (country) {
        ctx.fillStyle = country.color + (dark ? '25' : '17');
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = country.color + '99';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        if (occupancy.get(`${n.x},${n.y - 1}`) !== n.countryId) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + CELL, y);
        }
        if (occupancy.get(`${n.x},${n.y + 1}`) !== n.countryId) {
          ctx.moveTo(x, y + CELL);
          ctx.lineTo(x + CELL, y + CELL);
        }
        if (occupancy.get(`${n.x - 1},${n.y}`) !== n.countryId) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + CELL);
        }
        if (occupancy.get(`${n.x + 1},${n.y}`) !== n.countryId) {
          ctx.moveTo(x + CELL, y);
          ctx.lineTo(x + CELL, y + CELL);
        }
        ctx.stroke();
      }
    }
    const firstByCountry = new Map<string, MapNode>();
    for (const node of doc.nodes) {
      if (!node.countryId) continue;
      const first = firstByCountry.get(node.countryId);
      if (!first || node.y < first.y || (node.y === first.y && node.x < first.x))
        firstByCountry.set(node.countryId, node);
    }
    for (const country of doc.countries) {
      const first = firstByCountry.get(country.id);
      if (!first) continue;
      const labelX = first.x * CELL,
        labelY = first.y * CELL - 16;
      if (
        labelX * v.scale + v.x < -250 ||
        labelX * v.scale + v.x > w + 50 ||
        labelY * v.scale + v.y < -50 ||
        labelY * v.scale + v.y > h + 50
      )
        continue;
      ctx.fillStyle = country.color;
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillText(country.name.toUpperCase(), labelX, labelY);
    }
    function drawNode(n: MapNode, x: number, y: number, floating = false) {
      const t = topics.get(n.topicId);
      if (!t) return;
      if (floating) {
        ctx.fillStyle = dark ? '#30322aee' : '#fffdf5ee';
        ctx.shadowColor = '#00000020';
        ctx.shadowBlur = 20;
        ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        ctx.shadowBlur = 0;
      }
      if (selectedRef.current === n.topicId) {
        ctx.strokeStyle = '#c55327';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, CELL - 8, CELL - 8);
      }
      const bx = x + 35,
        by = y + 19,
        sz = 26;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(bx, by, sz, sz);
      ctx.fillStyle = ink;
      if (t.mastery === 1) ctx.fillRect(bx, by + sz / 2, sz, sz / 2);
      if (t.mastery === 2) {
        ctx.beginPath();
        ctx.moveTo(bx, by + sz);
        ctx.lineTo(bx + sz, by);
        ctx.lineTo(bx + sz, by + sz);
        ctx.closePath();
        ctx.fill();
      }
      if (t.mastery === 3) ctx.fillRect(bx, by, sz, sz);
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      const words = t.name.split(' ');
      let lines: string[] = [''];
      for (const word of words) {
        const last = lines.length - 1;
        const tryText = lines[last] ? lines[last] + ' ' + word : word;
        if (ctx.measureText(tryText).width > CELL - 10 && lines[last]) lines.push(word);
        else lines[last] = tryText;
      }
      lines = lines.slice(0, 2);
      for (let i = 0; i < lines.length; i++) {
        let text = lines[i];
        while (ctx.measureText(text).width > CELL - 9 && text.length > 1)
          text = text.slice(0, -2) + '…';
        ctx.fillText(text, x + CELL / 2, y + 65 + i * 14);
      }
      ctx.textAlign = 'left';
    }
    for (const n of visible) {
      if (drag.current?.type === 'node' && drag.current.node?.id === n.id && drag.current.moved)
        continue;
      drawNode(n, n.x * CELL, n.y * CELL);
    }
    if (drag.current?.type === 'node' && drag.current.node && drag.current.moved) {
      const g = drag.current,
        x = (g.lastX - v.x) / v.scale - g.offsetX,
        y = (g.lastY - v.y) / v.scale - g.offsetY;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#c5532780';
      ctx.strokeRect(Math.round(x / CELL) * CELL, Math.round(y / CELL) * CELL, CELL, CELL);
      ctx.setLineDash([]);
      drawNode(g.node!, x, y, true);
    }
  }
  const requestDraw = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(redraw);
  };
  useEffect(() => {
    const c = canvas.current!,
      host = wrap.current!;
    const resize = new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
      c.width = Math.round(r.width * devicePixelRatio);
      c.height = Math.round(r.height * devicePixelRatio);
      redraw();
    });
    resize.observe(host);
    function wheel(e: WheelEvent) {
      e.preventDefault();
      const rect = c.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top,
        v = view.current,
        newScale = Math.max(0.25, Math.min(2.5, v.scale * Math.exp(-e.deltaY * 0.0015)));
      view.current = {
        scale: newScale,
        x: x - ((x - v.x) * newScale) / v.scale,
        y: y - ((y - v.y) * newScale) / v.scale,
      };
      savedView = view.current;
      setZoom(newScale);
      requestDraw();
    }
    c.addEventListener('wheel', wheel, { passive: false });
    return () => {
      resize.disconnect();
      c.removeEventListener('wheel', wheel);
      cancelAnimationFrame(frame.current);
      savedView = view.current;
    };
  }, []);
  useEffect(() => {
    requestDraw();
  }, [d, selected]);
  function place(topicId: string, x: number, y: number, override?: string | null) {
    x = Math.max(-100000, Math.min(100000, x));
    y = Math.max(-100000, Math.min(100000, y));
    const result = placement(dataRef.current.nodes, topicId, x, y);
    if (result.occupied) {
      toast('That cell is already occupied. Try the next square.');
      requestDraw();
      return;
    }
    if (override === undefined && result.countries.length !== 1) {
      setPending({ topicId, x, y, countries: result.countries });
      requestDraw();
      return;
    }
    const countryId = override !== undefined ? override : result.countries[0];
    mutate((s) => {
      let n = s.nodes.find((n) => n.topicId === topicId);
      if (n) Object.assign(n, { x, y, countryId, demo: false });
      else s.nodes.push({ id: uid(), topicId, x, y, countryId, demo: false });
    });
    setSelected(topicId);
    playFeedback('place');
    if (result.countries.length === 1 && override === undefined)
      toast(`Joined ${dataRef.current.countries.find((c) => c.id === countryId)?.name}`);
  }
  function panInertia(vx: number, vy: number) {
    if (dataRef.current.settings.motion === 'reduced') return;
    let speedX = vx,
      speedY = vy;
    const tick = () => {
      speedX *= 0.91;
      speedY *= 0.91;
      if (Math.abs(speedX) + Math.abs(speedY) < 0.35) return;
      view.current.x += speedX;
      view.current.y += speedY;
      redraw();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }
  function local(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hit(x: number, y: number) {
    const v = view.current;
    return dataRef.current.nodes.find(
      (n) =>
        n.x === Math.floor((x - v.x) / v.scale / CELL) &&
        n.y === Math.floor((y - v.y) / v.scale / CELL),
    );
  }
  function zoomBy(mult: number) {
    const { w, h } = size.current,
      v = view.current,
      s = Math.max(0.25, Math.min(2.5, v.scale * mult));
    view.current = {
      x: w / 2 - ((w / 2 - v.x) * s) / v.scale,
      y: h / 2 - ((h / 2 - v.y) * s) / v.scale,
      scale: s,
    };
    setZoom(s);
    requestDraw();
  }
  function fit() {
    const ns = d.nodes;
    if (!ns.length) {
      view.current = { x: 110, y: 175, scale: 1 };
    } else {
      const bounds = ns.reduce(
        (acc, n) => ({
          minX: Math.min(acc.minX, n.x),
          minY: Math.min(acc.minY, n.y),
          maxX: Math.max(acc.maxX, n.x),
          maxY: Math.max(acc.maxY, n.y),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );
      const minX = bounds.minX * CELL,
        minY = bounds.minY * CELL,
        maxX = (bounds.maxX + 1) * CELL,
        maxY = (bounds.maxY + 1) * CELL,
        { w, h } = size.current;
      const s = Math.min(
        1.3,
        Math.max(0.25, Math.min((w - 160) / (maxX - minX), (h - 160) / (maxY - minY))),
      );
      view.current = {
        x: (w - (maxX - minX) * s) / 2 - minX * s,
        y: (h - (maxY - minY) * s) / 2 - minY * s,
        scale: s,
      };
    }
    setZoom(view.current.scale);
    requestDraw();
  }
  function addToMap(id: string) {
    const v = view.current,
      { w, h } = size.current;
    let x = Math.floor((w / 2 - v.x) / v.scale / CELL),
      y = Math.floor((h / 2 - v.y) / v.scale / CELL);
    while (d.nodes.some((n) => n.x === x && n.y === y)) x++;
    setAdding(false);
    place(id, x, y);
  }
  return (
    <div className="page map-page">
      <PageHeader
        eyebrow="THE BIGGER PICTURE"
        title="Your world of understanding."
        description="Give your ideas a place. Let the connections grow."
        action={
          <Button
            onClick={() => {
              setSearch('');
              setAdding(true);
            }}
          >
            <Plus size={17} />
            Place a topic
          </Button>
        }
      />
      <div className="map-frame" ref={wrap}>
        <canvas
          ref={canvas}
          data-testid="knowledge-canvas"
          tabIndex={0}
          aria-label="Knowledge map. Drag an empty area to pan. Scroll to zoom. Select a topic and use arrow keys to move it, Enter to open it."
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            cancelAnimationFrame(frame.current);
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            const point = local(e);
            pointers.current.set(e.pointerId, point);
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              pinch.current = {
                distance: Math.hypot(a.x - b.x, a.y - b.y),
                midX: (a.x + b.x) / 2,
                midY: (a.y + b.y) / 2,
                view: { ...view.current },
              };
              drag.current = null;
              return;
            }
            if (pointers.current.size > 2) return;
            const { x, y } = point,
              n = hit(x, y),
              v = view.current;
            setSelected(n?.topicId ?? null);
            drag.current = {
              type: n ? 'node' : 'pan',
              node: n,
              startX: x,
              startY: y,
              lastX: x,
              lastY: y,
              lastTime: performance.now(),
              vx: 0,
              vy: 0,
              offsetX: n ? (x - v.x) / v.scale - n.x * CELL : v.x,
              offsetY: n ? (y - v.y) / v.scale - n.y * CELL : v.y,
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, local(e));
            if (pinch.current && pointers.current.size >= 2) {
              const [a, b] = [...pointers.current.values()];
              const midX = (a.x + b.x) / 2,
                midY = (a.y + b.y) / 2,
                start = pinch.current,
                scale = Math.max(
                  0.25,
                  Math.min(
                    2.5,
                    (start.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
                      Math.max(1, start.distance),
                  ),
                ),
                worldX = (start.midX - start.view.x) / start.view.scale,
                worldY = (start.midY - start.view.y) / start.view.scale;
              view.current = { x: midX - worldX * scale, y: midY - worldY * scale, scale };
              savedView = view.current;
              setZoom(scale);
              requestDraw();
              return;
            }
            const g = drag.current;
            if (!g) return;
            const { x, y } = local(e);
            g.moved = g.moved || Math.hypot(x - g.startX, y - g.startY) > 4;
            const dt = Math.max(1, performance.now() - g.lastTime);
            g.vx = ((x - g.lastX) / dt) * 16;
            g.vy = ((y - g.lastY) / dt) * 16;
            g.lastTime = performance.now();
            g.lastX = x;
            g.lastY = y;
            if (g.type === 'pan') {
              view.current.x = g.offsetX + x - g.startX;
              view.current.y = g.offsetY + y - g.startY;
            }
            requestDraw();
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pinch.current) {
              if (pointers.current.size < 2) pinch.current = null;
              drag.current = null;
              return;
            }
            const g = drag.current;
            if (!g) return;
            drag.current = null;
            if (g.type === 'node' && g.node && g.moved) {
              const v = view.current;
              place(
                g.node.topicId,
                Math.round(((g.lastX - v.x) / v.scale - g.offsetX) / CELL),
                Math.round(((g.lastY - v.y) / v.scale - g.offsetY) / CELL),
              );
            }
            requestDraw();
            if (g.type === 'pan' && g.moved && performance.now() - g.lastTime < 100)
              panInertia(g.vx, g.vy);
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            pinch.current = null;
            drag.current = null;
            requestDraw();
          }}
          onDoubleClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect(),
              n = hit(e.clientX - r.left, e.clientY - r.top);
            if (n) selectTopic(n.topicId);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect(),
              n = hit(e.clientX - r.left, e.clientY - r.top);
            if (n) setSelected(n.topicId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && selected) {
              selectTopic(selected);
              return;
            }
            const delta = (
              {
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
              } as Record<string, number[]>
            )[e.key];
            if (delta) {
              e.preventDefault();
              if (selectedNode)
                place(selectedNode.topicId, selectedNode.x + delta[0], selectedNode.y + delta[1]);
              else {
                view.current.x -= delta[0] * 48;
                view.current.y -= delta[1] * 48;
                requestDraw();
              }
            }
            if (e.key === 'Escape') setSelected(null);
          }}
        />
        <div className="map-floating-heading">
          <MapIcon size={16} />
          <span>THE KNOWLEDGE ATLAS</span>
          <span className="map-count">{d.nodes.length} ideas placed</span>
        </div>
        <div className="map-tools">
          <IconButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus size={17} />
          </IconButton>
          <span>{Math.round(zoom * 100)}%</span>
          <IconButton label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus size={17} />
          </IconButton>
          <i />
          <IconButton label="Fit map to view" onClick={fit}>
            <Expand size={17} />
          </IconButton>
          <IconButton label="Edit territories" onClick={() => setTerritories(true)}>
            <SlidersHorizontal size={17} />
          </IconButton>
        </div>
        <div className="map-legend">
          {d.countries.map((c) => (
            <button key={c.id} onClick={() => setEditCountry(c)}>
              <i style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
        {selectedNode && topic && (
          <div className="map-selection">
            <div className="section-heading">
              <strong>{topic.name}</strong>
              <IconButton label="Deselect map topic" onClick={() => setSelected(null)}>
                <X size={15} />
              </IconButton>
            </div>
            <label className="field">
              Move to country
              <Select
                aria-label="Move to country"
                value={selectedNode.countryId ?? ''}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setPending({
                      topicId: topic.id,
                      x: selectedNode.x,
                      y: selectedNode.y,
                      countries: [],
                    });
                  } else place(topic.id, selectedNode.x, selectedNode.y, e.target.value || null);
                }}
              >
                <option value="">Unassigned</option>
                {d.countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="new">+ New country</option>
              </Select>
            </label>
            <div className="map-nudge">
              {[
                [ArrowLeft, -1, 0, 'left'],
                [ArrowUp, 0, -1, 'up'],
                [ArrowDown, 0, 1, 'down'],
                [ArrowRight, 1, 0, 'right'],
              ].map(([Icon, x, y, label]) => {
                const I = Icon as typeof ArrowLeft;
                return (
                  <IconButton
                    key={String(label)}
                    label={`Move cell ${label}`}
                    onClick={() =>
                      place(topic.id, selectedNode.x + Number(x), selectedNode.y + Number(y))
                    }
                  >
                    <I size={15} />
                  </IconButton>
                );
              })}
              <span>
                {selectedNode.x}, {selectedNode.y}
              </span>
            </div>
            <div className="inline">
              <Button onClick={() => selectTopic(topic.id)}>Open topic</Button>
              <IconButton
                label="Remove topic from map"
                onClick={() => {
                  mutate((s) => {
                    s.nodes = s.nodes.filter((n) => n.topicId !== topic.id);
                  });
                  setSelected(null);
                  toast('Removed from the map. Your topic is still in the Checklist.');
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        )}
        {!d.nodes.length && (
          <div className="map-empty">
            <h2>A world waiting to take shape.</h2>
            <p>Place your first idea on the page.</p>
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              Place a topic
            </Button>
          </div>
        )}
      </div>
      <div className="map-bottom-note">
        <span>Drag to explore · scroll to zoom · double-click to open</span>
        <span>Touching cells share a territory. Questions connect everything.</span>
      </div>
      <details className="map-accessible-list">
        <summary>Map index · keyboard navigation</summary>
        <div>
          {d.nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setSelected(n.topicId);
                view.current.x = size.current.w / 2 - (n.x + 0.5) * CELL * view.current.scale;
                view.current.y = size.current.h / 2 - (n.y + 0.5) * CELL * view.current.scale;
                requestDraw();
                canvas.current?.focus();
              }}
            >
              {d.topics.find((t) => t.id === n.topicId)?.name} · {n.x}, {n.y}
            </button>
          ))}
        </div>
      </details>
      {adding && (
        <Modal title="Give an idea a place" onClose={() => setAdding(false)}>
          <div className="search-field">
            <Search size={17} />
            <input
              autoFocus
              aria-label="Find an unplaced topic"
              placeholder="Find an idea from your Checklist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="topic-picker">
            {d.topics
              .filter(
                (t) =>
                  !d.nodes.some((n) => n.topicId === t.id) &&
                  t.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((t) => (
                <button key={t.id} onClick={() => addToMap(t.id)}>
                  <MasterySquare value={t.mastery} size={20} />
                  <span>{t.name}</span>
                  <small>{d.subjects.find((s) => s.id === t.subjectId)?.name}</small>
                  <Plus size={16} />
                </button>
              ))}
            {d.topics.every((t) => d.nodes.some((n) => n.topicId === t.id)) && (
              <Empty title="Every idea has a place">
                Add more topics to your Checklist, then bring them into this world.
              </Empty>
            )}
          </div>
        </Modal>
      )}
      {pending && (
        <CountryChoice
          pending={pending}
          countries={d.countries}
          onClose={() => setPending(null)}
          onChoose={(id) => {
            place(pending.topicId, pending.x, pending.y, id);
            setPending(null);
          }}
        />
      )}
      {editCountry && <CountryEditor country={editCountry} onClose={() => setEditCountry(null)} />}{' '}
      {territories && (
        <Modal title="Your territories" onClose={() => setTerritories(false)}>
          <p className="hint">Choose a territory to change its name or any RGB color.</p>
          {d.countries.map((c) => (
            <button
              className="country-option"
              key={c.id}
              onClick={() => {
                setTerritories(false);
                setEditCountry(c);
              }}
            >
              <i style={{ background: c.color }} />
              <span>{c.name}</span>
              <ArrowRight size={16} />
            </button>
          ))}
          {!d.countries.length && <p>Place an isolated topic to create your first territory.</p>}
        </Modal>
      )}
    </div>
  );
}
function CountryChoice({
  pending,
  countries,
  onClose,
  onChoose,
}: {
  pending: Pending;
  countries: Country[];
  onClose: () => void;
  onChoose: (id: string | null) => void;
}) {
  const [name, setName] = useState(''),
    [color, setColor] = useState('#cf824c');
  const options =
    pending.countries.length > 1
      ? countries.filter((c) => pending.countries.includes(c.id))
      : countries;
  return (
    <Modal
      title={
        pending.countries.length > 1
          ? 'Which territory should this topic join?'
          : 'A new corner of your world'
      }
      onClose={onClose}
    >
      <p className="hint">
        {pending.countries.length > 1
          ? 'This cell touches more than one country. The choice is yours.'
          : 'This cell stands on its own. Choose a country, or give it a new one.'}
      </p>
      {options.map((c) => (
        <button className="country-option" key={c.id} onClick={() => onChoose(c.id)}>
          <i style={{ background: c.color }} />
          <span>{c.name}</span>
          <ArrowRight size={16} />
        </button>
      ))}
      <form
        className="country-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = uid();
          mutate((d) => {
            d.countries.push({ id, name: name.trim(), color, demo: false });
          });
          onChoose(id);
        }}
      >
        <label className="field">
          New country name
          <input
            maxLength={120}
            placeholder="e.g. Mathematics"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <ColorField color={color} onChange={setColor} />
        <div className="dialog-actions">
          <Button variant="ghost" type="button" onClick={() => onChoose(null)}>
            Leave unassigned
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Create territory
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ColorField({ color, onChange }: { color: string; onChange: (s: string) => void }) {
  const [draft, setDraft] = useState(color);
  return (
    <label className="field">
      Territory color · any RGB
      <div className="color-field">
        <input
          aria-label="Pick RGB color"
          type="color"
          value={color}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          aria-label="Hex color"
          maxLength={7}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setDraft(color)}
          placeholder="#CF824C"
        />
        <span className="hint">
          {[1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(' / ')}
        </span>
      </div>
    </label>
  );
}
function CountryEditor({ country, onClose }: { country: Country; onClose: () => void }) {
  const [name, setName] = useState(country.name),
    [color, setColor] = useState(country.color);
  return (
    <Modal title="Make this territory yours" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          mutate((d) => {
            const c = d.countries.find((c) => c.id === country.id)!;
            Object.assign(c, { name: name.trim(), color, demo: false });
          });
          onClose();
          toast('Territory updated');
        }}
      >
        <label className="field">
          Country name
          <input
            autoFocus
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <ColorField color={color} onChange={setColor} />
        <div className="dialog-actions">
          <Button type="submit">Save territory</Button>
        </div>
      </form>
    </Modal>
  );
}
