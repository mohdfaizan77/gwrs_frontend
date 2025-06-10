import logo from './logo.svg';
import './App.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import  ConnectWallet from './components/ConnectWallet';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConnectWallet />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
