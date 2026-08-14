import React from 'react';
import Home from './pages/Home';
import RunMixer from './pages/RunMixer';
import Teams from './pages/Teams';
import SubmitProof from './pages/SubmitProof';

export default function App(){
  const [route, setRoute] = React.useState('home');
  return (
    <div className="app">
      <header>
        <h1>AASTU Quest</h1>
        <nav>
          <button onClick={()=>setRoute('home')}>Home</button>
          <button onClick={()=>setRoute('run')}>Run Mixer</button>
          <button onClick={()=>setRoute('teams')}>Teams</button>
          <button onClick={()=>setRoute('submit')}>Submit Proof</button>
        </nav>
      </header>
      <main>
        {route === 'home' && <Home />}
        {route === 'run' && <RunMixer />}
        {route === 'teams' && <Teams />}
        {route === 'submit' && <SubmitProof />}
      </main>
    </div>
  );
}