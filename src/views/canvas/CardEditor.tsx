import {X} from 'lucide-react';
import {canvasColors as colors} from '../../canvas-color';

/** Modal editor for one Canvas card. */
export function CardEditor({value,color,onValue,onColor,onCancel,onSave}:{value:string;color:string;onValue:(value:string)=>void;onColor:(color:string)=>void;onCancel:()=>void;onSave:()=>void}){
  return <div className="modal-backdrop"><section className="modal card-modal" role="dialog" aria-label="Edit canvas card"><header><h2>Edit card</h2><button onClick={onCancel} aria-label="Close"><X size={16}/></button></header>
    <textarea aria-label="Card content" autoFocus value={value} onChange={event=>onValue(event.target.value)} data-testid="canvas-card-content"/>
    <label>Color<select value={color} onChange={event=>onColor(event.target.value)}><option value="">Default</option>{Object.keys(colors).map(key=><option key={key} value={key}>{['Red','Orange','Yellow','Green','Blue','Purple'][Number(key)-1]}</option>)}</select></label>
    <footer><button onClick={onCancel}>Cancel</button><button className="primary" data-testid="canvas-save-card" onClick={onSave}>Save card</button></footer>
  </section></div>;
}
