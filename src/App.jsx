import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Home, BookOpen, PenTool, LayoutDashboard, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './firebase/config';
import { signOut } from 'firebase/auth';

import Explore from './pages/Explore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import StoryDetail from './pages/StoryDetail';
import Read from './pages/Read';

function Navigation() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-primary font-bold text-xl">
              <BookOpen className="w-6 h-6" />
              <span>BangunStory</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-text-light hover:text-primary transition-colors flex items-center space-x-1">
              <Home className="w-4 h-4" />
              <span>Explore</span>
            </Link>

            {currentUser ? (
              <>
                <Link to="/dashboard" className="text-text-light hover:text-primary transition-colors flex items-center space-x-1">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-3 ml-4 border-l border-gray-200 pl-4">
                  <span className="text-sm font-semibold text-text">{currentUser.displayName || currentUser.email}</span>
                  <button onClick={handleLogout} className="text-text-light hover:text-red-500 transition-colors flex items-center">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="bg-primary text-white px-4 py-2 rounded-full font-medium hover:bg-primary-hover transition-colors flex items-center space-x-1 shadow-md shadow-primary/20">
                <UserCircle className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-text hover:text-primary transition-colors p-2">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg animate-in slide-in-from-top-2 duration-200 z-50">
          <div className="px-4 py-6 flex flex-col space-y-4">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-text hover:text-primary font-semibold flex items-center space-x-2 p-2 rounded-xl hover:bg-primary/5">
              <Home className="w-5 h-5" />
              <span>Explore</span>
            </Link>

            {currentUser ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-text hover:text-primary font-semibold flex items-center space-x-2 p-2 rounded-xl hover:bg-primary/5">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2 text-text-light">
                    <UserCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">{currentUser.displayName || currentUser.email}</span>
                  </div>
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-red-500 hover:text-red-600 font-semibold text-sm flex items-center bg-red-50 px-3 py-1.5 rounded-full">
                    <LogOut className="w-4 h-4 mr-1" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary-hover transition-colors flex items-center justify-center space-x-2 shadow-md shadow-primary/20">
                  <UserCircle className="w-5 h-5" />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-background">
          <Navigation />
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Explore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workspace/:storyId" element={<Workspace />} />
              <Route path="/story/:storyId" element={<StoryDetail />} />
              <Route path="/read/:storyId/:sceneId" element={<Read />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
