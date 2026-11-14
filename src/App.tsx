import { useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, Rect, Circle, Textbox, FabricObject } from 'fabric';
import {
  ImagePlus, Type, Square, Circle as CircleIcon, Download, Save, Undo2, Redo2,
  Trash2, Layers3, Sparkles, LayoutTemplate, ChevronDown, Plus, MousePointer2,
  PanelLeftClose, PanelRightClose, Upload, WandSparkles, FileImage, Monitor,
  Smartphone, RectangleHorizontal, X, Check
} from 'lucide-react';

type LayerItem = { id: string; label: string; object: FabricObject };

const PRESETS = [
  { name: 'Post quadrado', width: 1080, height: 1080, icon: Square },
  { name: 'Story', width: 1080, height: 1920, icon: Smartphone },
  { name: 'Banner', width: 1600, height: 900, icon: RectangleHorizontal },
];

export default function App() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
  const [zoom, setZoom] = useState(55);
  const [projectName, setProjectName] = useState('Meu projeto');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'layers'>('design');
  const [background, setBackground] = useState('#ffffff');

  useEffect(() => {
    if (!canvasEl.current || canvasRef.current) return;
    const canvas = new Canvas(canvasEl.current, {
      width: canvasSize.width, height: canvasSize.height,
      backgroundColor: background, preserveObjectStacking: true,
      selection: true,
    });
    canvasRef.current = canvas;
    const sync = () => {
      setSelected(canvas.getActiveObject() || null);
      setLayers(canvas.getObjects().map((object, index) => ({
        id: String(index), label: object.name || (object.type === 'textbox' ? 'Texto' : object.type === 'image' ? 'Imagem' : 'Forma'),
        object,
      })).reverse());
    };
    canvas.on('selection:created', sync);
    canvas.on('selection:updated', sync);
    canvas.on('selection:cleared', sync);
    canvas.on('object:added', sync);
    canvas.on('object:removed', sync);
    canvas.on('object:modified', sync);
    return () => { canvas.dispose(); canvasRef.current = null; };
  }, []);

  const canvas = () => canvasRef.current;
  const refresh = () => {
    const c = canvas();
    if (!c) return;
    setLayers(c.getObjects().map((object, index) => ({
      id: String(index), label: object.name || (object.type === 'textbox' ? 'Texto' : object.type === 'image' ? 'Imagem' : 'Forma'),
      object,
    })).reverse());
    setSelected(c.getActiveObject() || null);
    setSaved(false);
  };

  const addText = () => {
    const c = canvas(); if (!c) return;
    const text = new Textbox('Seu texto aqui', {
      left: 120, top: 150, width: 650, fontSize: 76, fontFamily: 'Arial',
      fontWeight: 'bold', fill: '#172033', editable: true, name: 'Texto',
    });
    c.add(text); c.setActiveObject(text); c.requestRenderAll(); refresh();
  };

  const addShape = (kind: 'rect' | 'circle') => {
    const c = canvas(); if (!c) return;
    const shape = kind === 'rect'
      ? new Rect({ left: 180, top: 180, width: 360, height: 240, rx: 28, ry: 28, fill: '#7c3aed', name: 'Retângulo' })
      : new Circle({ left: 220, top: 220, radius: 120, fill: '#f59e0b', name: 'Círculo' });
    c.add(shape); c.setActiveObject(shape); c.requestRenderAll(); refresh();
  };

  const uploadImage = async (file?: File) => {
    const c = canvas(); if (!c || !file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    try {
      const image = await FabricImage.fromURL(url);
      const max = Math.min(760 / image.width!, 760 / image.height!, 1);
      image.scale(max);
      image.set({ left: 120, top: 120, name: file.name, cornerStyle: 'circle' });
      c.add(image); c.setActiveObject(image); c.requestRenderAll(); refresh();
    } finally { URL.revokeObjectURL(url); }
  };

  const removeSelected = () => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    c.remove(obj); c.discardActiveObject(); c.requestRenderAll(); refresh();
  };

  const exportImage = () => {
    const c = canvas(); if (!c) return;
    c.discardActiveObject(); c.requestRenderAll();
    const url = c.toDataURL({ format: 'png', multiplier: 1 });
    const link = document.createElement('a');
    link.href = url; link.download = projectName.trim().replace(/[^a-z0-9-_]+/gi, '-') + '.png';
    link.click();
  };

  const saveProject = () => {
    const c = canvas(); if (!c) return;
    const data = { name: projectName, width: canvasSize.width, height: canvasSize.height, json: c.toJSON() };
    localStorage.setItem('studio-criativo-project', JSON.stringify(data));
    setSaved(true);
  };

  const changeSize = (width: number, height: number) => {
    const c = canvas(); if (!c) return;
    c.setDimensions({ width, height });
    setCanvasSize({ width, height }); c.requestRenderAll(); refresh();
  };

  const setObjectColor = (color: string) => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    if (obj.type === 'image') return;
    obj.set('fill', color); c.requestRenderAll(); refresh();
  };

  const selectLayer = (object: FabricObject) => {
    const c = canvas(); if (!c) return;
    c.setActiveObject(object); c.requestRenderAll(); setSelected(object);
  };

  const undo = async () => {
    const c = canvas(); if (!c) return;
    const history = (window as any).__studioHistory as string[] | undefined;
    if (history?.length) { await c.loadFromJSON(JSON.parse(history.pop()!)); c.requestRenderAll(); refresh(); }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><div><strong>Studio Criativo <span>AI</span></strong><small>Seu espaço de criação</small></div></div>
        <div className="project-title"><input value={projectName} onChange={e => setProjectName(e.target.value)} aria-label="Nome do projeto"/><span className="status">{saved ? <><Check size={13}/> Salvo</> : 'Alterações não salvas'}</span></div>
        <div className="top-actions">
          <button className="btn subtle" onClick={saveProject}><Save size={16}/> <span>Salvar</span></button>
          <button className="btn primary" onClick={exportImage}><Download size={16}/> Exportar PNG</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="leftbar">
          <div className="side-tabs"><button className={activeTab === 'design' ? 'active' : ''} onClick={() => setActiveTab('design')}><LayoutTemplate size={18}/> Design</button><button className={activeTab === 'layers' ? 'active' : ''} onClick={() => setActiveTab('layers')}><Layers3 size={18}/> Camadas</button></div>
          {activeTab === 'design' ? <div className="tool-panel">
            <div className="panel-heading">Adicionar elementos</div>
            <button className="tool-card" onClick={() => fileRef.current?.click()}><span className="tool-icon violet"><ImagePlus/></span><span><b>Enviar imagem</b><small>Do celular ou computador</small></span><Plus size={16}/></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => uploadImage(e.target.files?.[0])}/>
            <button className="tool-card" onClick={addText}><span className="tool-icon blue"><Type/></span><span><b>Adicionar texto</b><small>Títulos e legendas</small></span><Plus size={16}/></button>
            <div className="tool-grid"><button onClick={() => addShape('rect')}><Square/><span>Retângulo</span></button><button onClick={() => addShape('circle')}><CircleIcon/><span>Círculo</span></button></div>
            <div className="panel-heading space-top">Tamanho da arte</div>
            <div className="preset-list">{PRESETS.map(p => <button key={p.name} className={canvasSize.width === p.width && canvasSize.height === p.height ? 'preset active' : 'preset'} onClick={() => changeSize(p.width,p.height)}><p.icon size={17}/><span>{p.name}</span><small>{p.width} × {p.height}</small></button>)}</div>
            <div className="panel-heading space-top">Fundo da página</div>
            <div className="color-row"><input type="color" value={background} onChange={e => {setBackground(e.target.value); canvas()?.set('backgroundColor',e.target.value); canvas()?.requestRenderAll(); setSaved(false);}}/><span>{background.toUpperCase()}</span></div>
          </div> : <div className="tool-panel"><div className="panel-heading">Camadas do projeto</div>{layers.length === 0 ? <div className="empty-layers">Seus elementos aparecerão aqui quando você adicionar textos, formas ou imagens.</div> : layers.map((layer,i) => <button key={layer.id} className={selected === layer.object ? 'layer active' : 'layer'} onClick={() => selectLayer(layer.object)}><span>{layer.object.type === 'image' ? <FileImage size={16}/> : layer.object.type === 'textbox' ? <Type size={16}/> : <Square size={16}/>}</span>{layer.label || 'Elemento'}<small>{layers.length-i}</small></button>)}</div>}
          <div className="sidebar-bottom"><div className="ai-card"><div className="ai-icon"><WandSparkles size={18}/></div><b>Ferramentas de IA</b><p>Remover fundo, criar imagens e editar com inteligência artificial.</p><span>Em preparação</span></div></div>
        </aside>

        <section className="editor-area">
          <div className="editor-toolbar"><div className="crumb"><span>Meus projetos</span><b>/</b><strong>{projectName || 'Sem título'}</strong></div><div className="canvas-actions"><button title="Desfazer — em preparação" disabled><Undo2 size={17}/></button><button title="Refazer — em preparação" disabled><Redo2 size={17}/></button><i></i><button title="Excluir selecionado" onClick={removeSelected}><Trash2 size={17}/></button></div></div>
          <div className="canvas-stage">
            <div className="canvas-wrap" style={{width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100, ['--canvas-scale' as any]: zoom / 100}}>
              <canvas ref={canvasEl}/>
            </div>
            {layers.length === 0 && <div className="canvas-hint"><div className="hint-icon"><Upload size={22}/></div><b>Comece sua criação</b><p>Envie uma foto ou adicione um texto para montar sua arte.</p><button className="btn primary" onClick={() => fileRef.current?.click()}><ImagePlus size={16}/> Enviar primeira imagem</button></div>}
          </div>
          <div className="bottom-toolbar"><div><Monitor size={15}/><span>{canvasSize.width} × {canvasSize.height} px</span></div><div className="zoom-control"><button onClick={() => setZoom(z => Math.max(20,z-5))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(z => Math.min(100,z+5))}>+</button></div></div>
        </section>

        <aside className="rightbar"><div className="right-heading"><b>Propriedades</b><PanelRightClose size={17}/></div>{selected ? <div className="properties"><p className="property-label">Elemento selecionado</p><div className="selected-name">{selected.name || (selected.type === 'textbox' ? 'Texto' : selected.type === 'image' ? 'Imagem' : 'Forma')}</div>{selected.type !== 'image' && <><div className="property-label">Cor do elemento</div><div className="color-row"><input type="color" value={typeof selected.fill === 'string' && selected.fill.startsWith('#') ? selected.fill : '#7c3aed'} onChange={e => setObjectColor(e.target.value)}/><span>{String(selected.fill || '').toUpperCase()}</span></div></>}<div className="property-label">Posição e tamanho</div><div className="property-grid"><label>X<input type="number" value={Math.round(selected.left || 0)} onChange={e => {selected.set('left',Number(e.target.value));canvas()?.requestRenderAll();refresh();}}/></label><label>Y<input type="number" value={Math.round(selected.top || 0)} onChange={e => {selected.set('top',Number(e.target.value));canvas()?.requestRenderAll();refresh();}}/></label></div><button className="delete-button" onClick={removeSelected}><Trash2 size={15}/> Excluir elemento</button></div> : <div className="no-selection"><MousePointer2 size={24}/><b>Nenhum elemento selecionado</b><p>Selecione um item na arte para editar suas propriedades.</p></div>}
          <div className="right-footer"><Sparkles size={15}/> Mais recursos criativos chegando</div></aside>
      </main>
    </div>
  );
}