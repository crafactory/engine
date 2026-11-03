import {createElement,icons} from 'lucide';
import DOMPurify from 'dompurify';
const custom=new Map<string,SVGSVGElement>();
const canonical=(id:string)=>id.replace(/^lucide-/,'').replace(/(^|-)([a-z])/g,(_match,_separator,letter:string)=>letter.toUpperCase());
/** Icon nodes come from the open-source Lucide package, never the reference app. */
export function getIcon(id:string):SVGSVGElement|null{
  const registered=custom.get(id);if(registered)return registered.cloneNode(true) as SVGSVGElement;
  const name=canonical(id);if(!Object.hasOwn(icons,name))return null;
  const node=icons[name as keyof typeof icons];
  const svg=createElement(node) as unknown as SVGSVGElement;svg.setAttribute('width','24');svg.setAttribute('height','24');svg.classList.add('svg-icon');return svg;
}
export function addIcon(id:string,svg:string){
  const markup=DOMPurify.sanitize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+svg+'</svg>',{USE_PROFILES:{svg:true,svgFilters:true}});
  const root=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
  if(root.localName!=='svg')throw new Error('Invalid custom icon');
  root.classList.add('svg-icon');custom.set(id,document.importNode(root,true) as unknown as SVGSVGElement);
}
export function getIconIds(){return [...new Set([...Object.keys(icons).map(name=>name.replace(/([A-Z]+)([A-Z][a-z])/g,'$1-$2').replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase()),...custom.keys()])];}
export function setIcon(parent:HTMLElement,id:string){const icon=getIcon(id);parent.replaceChildren(...(icon?[icon]:[]));}
