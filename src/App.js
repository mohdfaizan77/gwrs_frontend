import logo from './logo.svg';
import './App.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import  ConnectWallet from './components/ConnectWallet';
import  IDOAllocationForm from './components/IdoAllocations';
import Login from './pages/Login'
// import TokenTransfer from './components/TokenTransfer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/contract" element={<ConnectWallet />} />
        <Route path="/ido" element={<IDOAllocationForm />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
