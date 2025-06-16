import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/ConnectWallet.css'; // Import the CSS file

export default function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('faizan@gmail.com');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        const staticUsername = "faizan@gmail.com";
        const staticPassword = "Demo@1234";

        if (username === staticUsername && password === staticPassword) {
            navigate('/contract');
        } else {
            alert("Invalid credentials");
        }
    };

    return (
        <div className="login-container">
            <h1 className="login-title">Login Page</h1>
            <form className="login-form">
                <div className="input-group">
                    <label className="input-label">Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-field"
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                    />
                </div>
                <button type="submit" onClick={handleLogin} className="login-button">Login</button>
            </form>
        </div>
    );
}