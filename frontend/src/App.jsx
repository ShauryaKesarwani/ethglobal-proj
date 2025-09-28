import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';
import Admin from './Admin';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Check for existing user session on component mount
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        const threeeHoursInMs = 3 * 60 * 60 * 1000;
        
        // Check if session has expired
        if (Date.now() - parsedData.timestamp > threeeHoursInMs) {
          localStorage.removeItem('currentUser');
          console.log("🕐 User session expired");
        } else {
          setCurrentUser(parsedData);
          
          // Set timeout for remaining time
          const remainingTime = threeeHoursInMs - (Date.now() - parsedData.timestamp);
          setTimeout(() => {
            localStorage.removeItem('currentUser');
            setCurrentUser(null);
            console.log("🕐 User session expired");
          }, remainingTime);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Function to get user initials
  const getUserInitials = (name) => {
    if (!name) return "L";
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };
  return (
    <Router>
      <nav className="flex gap-4 p-4 border-b items-center">
        <Link to="/">Dashboard</Link>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {getUserInitials(currentUser.name)}
            </div>
            <span className="text-sm">{currentUser.name}</span>
          </div>
        ) : (
          <Link to="/login">Login</Link>
        )}
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
