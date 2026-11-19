import { useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, Rect, Circle, Textbox, FabricObject } from 'fabric';
import {
  ImagePlus, Type, Square, Circle as CircleIcon, Download, Save, Undo2, Redo2,
  Trash2, Layers3, Sparkles, LayoutTemplate, Plus, MousePointer2, Upload,
  WandSparkles, FileImage, Monitor, Smartphone, RectangleHorizontal, Copy,
  BringToFront, SendToBack, RotateCw, Lock, Unlock, Eye, EyeOff, Replace,
  Bold, AlignLeft, AlignCenter, AlignRight, X
} from 'lucide-react';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
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
  const replaceRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const restoringRef = useRef(false);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
  const [zoom, setZoom] = useState(55);
  const [projectName, setProjectName] = useState('Meu projeto');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'layers'>('design');
  const [background, setBackground] = useState('#ffffff');
  const [, setHistoryVersion] = useState(0);

  const canvas = () => canvasRef.current;
  const snapshot = () => {
    const c = canvas();
    if (!c || restoringRef.current) return;
    const json = JSON.stringify(c.toJSON());
    if (historyRef.current[historyRef.current.length - 1] !== json) {
      historyRef.current.push(json);
      if (historyRef.current.length > 60) historyRef.current.shift();
      redoRef.current = [];
      setHistoryVersion(v => v + 1);
    }
  };
  const refresh = () => {
    const c = canvas();
    if (!c) return;
    setLayers(c.getObjects().map((object, index) => ({
      id: String(index) + '-' + String(object.name || object.type),
      label: object.name || (object.type === 'textbox' ? 'Texto' : object.type === 'image' ? 'Imagem' : 'Forma'),
      object,
    })).reverse());
    setSelected(c.getActiveObject() || null);
    setSaved(false);
  };

  useEffect(() => {
    if (!canvasEl.current || canvasRef.current) return;
    const c = new Canvas(canvasEl.current, {
      width: canvasSize.width, height: canvasSize.height,
      backgroundColor: background, preserveObjectStacking: true, selection: true,
    });
    canvasRef.current = c;
    const sync = () => { refresh(); snapshot(); };
    c.on('selection:created', refresh);
    c.on('selection:updated', refresh);
    c.on('selection:cleared', refresh);
    c.on('object:added', sync);
    c.on('object:removed', sync);
    c.on('object:modified', sync);
    historyRef.current = [JSON.stringify(c.toJSON())];
    return () => { c.dispose(); canvasRef.current = null; };
  }, []);

  const addText = () => {
    const c = canvas(); if (!c) return;
    const text = new Textbox('Clique duas vezes para editar', {
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
  const addImage = async (file?: File, replace = false) => {
    const c = canvas(); if (!c || !file) return;
    if (!file.type.startsWith('image/')) { window.alert('Selecione uma imagem JPG, PNG ou WEBP.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { window.alert('A imagem ultrapassa o limite de 20 MB.'); return; }
    const old = replace ? c.getActiveObject() : null;
    const url = URL.createObjectURL(file);
    try {
      const image = await FabricImage.fromURL(url);
      if (replace && old) {
        const scaleX = old.scaleX || 1, scaleY = old.scaleY || 1;
        image.set({
          left: old.left ?? 120, top: old.top ?? 120,
          angle: old.angle ?? 0, opacity: old.opacity ?? 1,
          scaleX: scaleX * Math.min((old.width || image.width || 1) / (image.width || 1), 1),
          scaleY: scaleY * Math.min((old.height || image.height || 1) / (image.height || 1), 1),
          name: file.name,
        });
        c.remove(old);
      } else {
        const max = Math.min(760 / image.width!, 760 / image.height!, 1);
        image.scale(max);
        image.set({ left: 120, top: 120, name: file.name, cornerStyle: 'circle' });
      }
      c.add(image); c.setActiveObject(image); c.requestRenderAll(); refresh();
    } finally { URL.revokeObjectURL(url); }
  };
  const removeSelected = () => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    c.remove(obj); c.discardActiveObject(); c.requestRenderAll(); refresh();
  };
  const updateSelected = (props: Record<string, unknown>) => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.set(props as any); obj.setCoords(); c.requestRenderAll(); refresh(); snapshot();
  };
  const duplicateSelected = () => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.clone().then((copy: FabricObject) => {
      copy.set({ left: (obj.left || 0) + 28, top: (obj.top || 0) + 28, name: (obj.name || 'Elemento') + ' cópia' });
      c.add(copy); c.setActiveObject(copy); c.requestRenderAll(); refresh();
    });
  };
  const moveLayer = (front: boolean) => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    if (front) c.bringObjectToFront(obj); else c.sendObjectToBack(obj);
    c.requestRenderAll(); refresh(); snapshot();
  };
  const toggleLock = () => {
    const c = canvas(); const obj = c?.getActiveObject();
    if (!c || !obj) return;
    const locked = !obj.lockMovementX;
    obj.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, hasControls: !locked, selectable: true });
    c.requestRenderAll(); refresh();
  };
  const toggleVisibility = (obj: FabricObject) => {
    obj.set('visible', obj.visible === false);
    canvas()?.requestRenderAll(); refresh(); snapshot();
  };
  const changeBackgroundImage = async (file?: File) => {
    const c = canvas(); if (!c || !file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE) { window.alert('Escolha uma imagem válida de até 20 MB.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = await FabricImage.fromURL(url);
      img.set({ left: 0, top: 0, name: 'Imagem de fundo', selectable: true, evented: true });
      img.scaleX = c.getWidth() / (img.width || 1);
      img.scaleY = c.getHeight() / (img.height || 1);
      c.add(img); c.sendObjectToBack(img); c.setActiveObject(img); c.requestRenderAll(); refresh();
    } finally { URL.revokeObjectURL(url); }
  };
  const exportImage = () => {
    const c = canvas(); if (!c) return;
    c.discardActiveObject(); c.requestRenderAll();
    const url = c.toDataURL({ format: 'png', multiplier: 1 });
    const link = document.createElement('a');
    link.href = url; link.download = projectName.trim().replace(/[^a-z0-9-_]+/gi, '-') + '.png'; link.click();
  };
  const saveProject = () => {
    const c = canvas(); if (!c) return;
    try {
      localStorage.setItem('studio-criativo-project', JSON.stringify({
        name: projectName, width: canvasSize.width, height: canvasSize.height, json: c.toJSON(),
      }));
      setSaved(true);
    } catch { window.alert('Não foi possível salvar no navegador. Exporte a arte para não perder seu trabalho.'); }
  };
  const changeSize = (width: number, height: number) => {
    const c = canvas(); if (!c) return;
    c.setDimensions({ width, height }); setCanvasSize({ width, height }); c.requestRenderAll(); refresh();
  };
  const undo = async () => {
    const c = canvas(); if (!c || historyRef.current.length < 2) return;
    const current = historyRef.current.pop();
    if (current) redoRef.current.push(current);
    restoringRef.current = true;
    await c.loadFromJSON(JSON.parse(historyRef.current[historyRef.current.length - 1]));
    c.requestRenderAll(); restoringRef.current = false; refresh(); setHistoryVersion(v => v + 1);
  };
  const redo = async () => {
    const c = canvas(); if (!c || !redoRef.current.length) return;
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(next); restoringRef.current = true;
    await c.loadFromJSON(JSON.parse(next));
    c.requestRenderAll(); restoringRef.current = false; refresh(); setHistoryVersion(v => v + 1);
  };
  const selectedText = selected?.type === 'textbox' || selected?.type === 'i-text' ? selected as Textbox : null;
  const colorValue = typeof selected?.fill === 'string' && selected.fill.startsWith('#') ? selected.fill : '#7c3aed';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><div><strong>Studio Criativo <span>AI</span></strong><small>Seu espaço de criação</small></div></div>
        <div className="project-title"><input value={projectName} onChange={e => setProjectName(e.target.value)} aria-label="Nome do projeto"/><span className="status">{saved ? '✓ Salvo' : 'Alterações não salvas'}</span></div>
        <div className="top-actions"><button className="btn subtle" onClick={saveProject}><Save size={16}/> <span>Salvar</span></button><button className="btn primary" onClick={exportImage}><Download size={16}/> Exportar PNG</button></div>
      </header>
      <main className="workspace">
        <aside className="leftbar">
          <div className="side-tabs"><button className={activeTab === 'design' ? 'active' : ''} onClick={() => setActiveTab('design')}><LayoutTemplate size={18}/> Design</button><button className={activeTab === 'layers' ? 'active' : ''} onClick={() => setActiveTab('layers')}><Layers3 size={18}/> Camadas</button></div>
          {activeTab === 'design' ? <div className="tool-panel">
            <div className="panel-heading">Adicionar elementos</div>
            <button className="tool-card" onClick={() => fileRef.current?.click()}><span className="tool-icon violet"><ImagePlus/></span><span><b>Enviar imagem</b><small>JPG, PNG ou WEBP · até 20 MB</small></span><Plus size={16}/></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { addImage(e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            <button className="tool-card" onClick={addText}><span className="tool-icon blue"><Type/></span><span><b>Adicionar texto</b><small>Títulos e legendas editáveis</small></span><Plus size={16}/></button>
            <div className="tool-grid"><button onClick={() => addShape('rect')}><Square/><span>Retângulo</span></button><button onClick={() => addShape('circle')}><CircleIcon/><span>Círculo</span></button></div>
            <div className="panel-heading space-top">Tamanho da arte</div>
            <div className="preset-list">{PRESETS.map(p => <button key={p.name} className={canvasSize.width === p.width && canvasSize.height === p.height ? 'preset active' : 'preset'} onClick={() => changeSize(p.width,p.height)}><p.icon size={17}/><span>{p.name}</span><small>{p.width} × {p.height}</small></button>)}</div>
            <div className="panel-heading space-top">Fundo da página</div>
            <div className="color-row"><input type="color" value={background} onChange={e => {setBackground(e.target.value); canvas()?.set('backgroundColor',e.target.value); canvas()?.requestRenderAll(); setSaved(false);}}/><span>{background.toUpperCase()}</span></div>
            <button className="tool-card" onClick={() => document.getElementById('background-image-input')?.click()}><span className="tool-icon violet"><ImagePlus/></span><span><b>Adicionar imagem de fundo</b><small>Coloca uma foto atrás dos elementos</small></span></button>
            <input id="background-image-input" type="file" accept="image/*" hidden onChange={e => { changeBackgroundImage(e.target.files?.[0]); e.currentTarget.value=''; }}/>
          </div> : <div className="tool-panel"><div className="panel-heading">Camadas do projeto</div>{layers.length === 0 ? <div className="empty-layers">Adicione textos, formas ou imagens para começar.</div> : layers.map((layer,i) => <div className={selected === layer.object ? 'layer active' : 'layer'} key={layer.id}><button onClick={() => {canvas()?.setActiveObject(layer.object);canvas()?.requestRenderAll();setSelected(layer.object);}}><span>{layer.object.type === 'image' ? <FileImage size={16}/> : layer.object.type === 'textbox' ? <Type size={16}/> : <Square size={16}/>}</span>{layer.label}<small>{layers.length-i}</small></button><button title={layer.object.visible === false ? 'Mostrar' : 'Ocultar'} onClick={() => toggleVisibility(layer.object)}>{layer.object.visible === false ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>)}</div>}
          <div className="sidebar-bottom"><div className="ai-card"><div className="ai-icon"><WandSparkles size={18}/></div><b>Ferramentas de IA</b><p>Remover fundo, criar imagens e editar com inteligência artificial.</p><span>Em preparação</span></div></div>
        </aside>
        <section className="editor-area">
          <div className="editor-toolbar"><div className="crumb"><span>Meus projetos</span><b>/</b><strong>{projectName || 'Sem título'}</strong></div><div className="canvas-actions"><button title="Desfazer" onClick={undo} disabled={historyRef.current.length < 2}><Undo2 size={17}/></button><button title="Refazer" onClick={redo} disabled={!redoRef.current.length}><Redo2 size={17}/></button><i></i><button title="Duplicar selecionado" onClick={duplicateSelected}><Copy size={16}/></button><button title="Excluir selecionado" onClick={removeSelected}><Trash2 size={17}/></button></div></div>
          <div className="canvas-stage"><div className="canvas-wrap" style={{width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100, ['--canvas-scale' as any]: zoom / 100}}><canvas ref={canvasEl}/></div>{layers.length === 0 && <div className="canvas-hint"><div className="hint-icon"><Upload size={22}/></div><b>Comece sua criação</b><p>Envie uma foto ou adicione um texto para montar sua arte.</p><button className="btn primary" onClick={() => fileRef.current?.click()}><ImagePlus size={16}/> Enviar primeira imagem</button></div>}</div>
          <div className="bottom-toolbar"><div><Monitor size={15}/><span>{canvasSize.width} × {canvasSize.height} px</span></div><div className="zoom-control"><button onClick={() => setZoom(z => Math.max(20,z-5))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(z => Math.min(100,z+5))}>+</button></div></div>
        </section>
        <aside className="rightbar"><div className="right-heading"><b>Propriedades</b><span>{selected ? 'Elemento selecionado' : 'Selecione um elemento'}</span></div>{selected ? <div className="properties">
          <p className="property-label">Nome do elemento</p><input className="property-input" value={String(selected.name || '')} onChange={e => updateSelected({name:e.target.value})} placeholder="Nome da camada"/>
          {selectedText && <><div className="property-label">Texto (clique duas vezes na arte ou edite aqui)</div><textarea className="property-textarea" value={selectedText.text || ''} onChange={e => updateSelected({text:e.target.value})}/><div className="property-label">Fonte e estilo</div><input className="property-input" value={String(selectedText.fontFamily || 'Arial')} onChange={e => updateSelected({fontFamily:e.target.value})} placeholder="Fonte"/><div className="property-grid"><label>Tamanho<input type="number" min="1" value={Math.round(Number(selectedText.fontSize)||24)} onChange={e => updateSelected({fontSize:Number(e.target.value)})}/></label><label>Peso<select value={String(selectedText.fontWeight || 'normal')} onChange={e => updateSelected({fontWeight:e.target.value})}><option value="normal">Normal</option><option value="bold">Negrito</option></select></label></div><div className="inline-tools"><button title="Negrito" onClick={() => updateSelected({fontWeight:selectedText.fontWeight === 'bold' ? 'normal' : 'bold'})}><Bold size={16}/></button><button title="Alinhar à esquerda" onClick={() => updateSelected({textAlign:'left'})}><AlignLeft size={16}/></button><button title="Centralizar" onClick={() => updateSelected({textAlign:'center'})}><AlignCenter size={16}/></button><button title="Alinhar à direita" onClick={() => updateSelected({textAlign:'right'})}><AlignRight size={16}/></button></div></>}
          <div className="property-label">Cor do elemento</div><div className="color-row"><input type="color" value={colorValue} onChange={e => updateSelected({fill:e.target.value})}/><span>{colorValue.toUpperCase()}</span></div>
          <div className="property-label">Posição e tamanho</div><div className="property-grid"><label>X<input type="number" value={Math.round(selected.left || 0)} onChange={e => updateSelected({left:Number(e.target.value)})}/></label><label>Y<input type="number" value={Math.round(selected.top || 0)} onChange={e => updateSelected({top:Number(e.target.value)})}/></label><label>Largura<input type="number" value={Math.round((selected.width || 0)*(selected.scaleX || 1))} onChange={e => updateSelected({scaleX:Number(e.target.value)/(selected.width || 1)})}/></label><label>Altura<input type="number" value={Math.round((selected.height || 0)*(selected.scaleY || 1))} onChange={e => updateSelected({scaleY:Number(e.target.value)/(selected.height || 1)})}/></label></div>
          <div className="property-grid"><label>Rotação °<input type="number" value={Math.round(selected.angle || 0)} onChange={e => updateSelected({angle:Number(e.target.value)})}/></label><label>Opacidade %<input type="number" min="0" max="100" value={Math.round((selected.opacity ?? 1)*100)} onChange={e => updateSelected({opacity:Math.max(0,Math.min(100,Number(e.target.value)))/100})}/></label></div>
          <div className="property-label">Organizar camadas</div><div className="inline-tools"><button title="Trazer para frente" onClick={() => moveLayer(true)}><BringToFront size={16}/></button><button title="Enviar para trás" onClick={() => moveLayer(false)}><SendToBack size={16}/></button><button title="Duplicar" onClick={duplicateSelected}><Copy size={16}/></button><button title="Bloquear/desbloquear" onClick={toggleLock}>{selected.lockMovementX ? <Unlock size={16}/> : <Lock size={16}/>}</button></div>
          {selected.type === 'image' && <><button className="tool-card replace-image" onClick={() => replaceRef.current?.click()}><Replace size={16}/><b>Substituir imagem</b></button><input ref={replaceRef} type="file" accept="image/*" hidden onChange={e => {addImage(e.target.files?.[0],true);e.currentTarget.value='';}}/></>}
          <button className="delete-button" onClick={removeSelected}><Trash2 size={15}/> Excluir elemento</button>
        </div> : <div className="no-selection"><MousePointer2 size={24}/><b>Nenhum elemento selecionado</b><p>Selecione uma foto, texto ou forma na arte para editar suas propriedades.</p></div>}<div className="right-footer"><Sparkles size={15}/> Mais recursos criativos chegando</div></aside>
      </main>
    </div>
  );
}
