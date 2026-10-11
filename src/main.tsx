import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/inter';
import 'katex/dist/katex.min.css';
import '@xyflow/react/dist/style.css';
import './style.css';
import {App} from './App';
class Boundary extends React.Component<{children:React.ReactNode},{error:string}> {
  state={error:''};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<main className="crash"><h1>Unable to open the workspace</h1><p>{this.state.error}</p><button onClick={()=>window.location.reload()}>Reload</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
